/* Pip & Bo - World 32 Superhero City: shared helpers for the four superhero levels (loads before them). */
'use strict';

/* The only global here is HEROCITY. Pip and Bo are superheroes for a day in a big city: in every level each of them has
   a different power, and the two powers only work together (a speedster pulls the brakes while a strong hero holds up
   the falling beams, a stretchy hero becomes a bridge while a strong hero carries a bus over it...). Powers swap between
   stretches, so both players try both.
   THE LOOK (Nov 2026, Gavyn: "straight out of a comic book"): everything in World 32 is drawn like a printed comic: black
   ink outlines, flat saturated colours (no greys, no soft gradients or glows), colour fades printed as dots, yellow
   caption boxes, white speech balloons, hand-lettered sound words, a white paper gutter and a printed finish. The ink,
   dot and lettering helpers are COMIC's (js/levels/world32/comic-kit.js, loads first; copied in here as K.ink, K.box...).
   The players-and-keys and effects helpers are World 31's SHRUNK kit (same names, same arguments: its header is the
   manual for those), so this file loads after js/levels/world31/shrunk-kit.js. World 32 has its own versions of the HUD
   ones (chip, panel, meter, prompter, drawMsg, pop, drawPops): same arguments, comic look. SHRUNK itself and the engine's
   pill / text / bigText / drawPlayer are never changed.
   Nothing here touches the rules of a level and nothing keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = HEROCITY; ... HEROCITY.defs.<mode> = {...}; })();
   and its MODES entry adds   printPage() { K.page(); }   (the printed finish, run by the engine between the scene and the HUD).

   From SHRUNK (see js/levels/world31/shrunk-kit.js): K.FONT, K.lerp, K.smooth, K.hash, K.mmss, K.stubMap, K.BREAK,
     K.quiet, K.key, K.track, K.both, K.idle, K.actLabels, K.hide, K.unhide, K.place, K.part, K.spark, K.confetti, K.dust,
     K.poof, K.hint, K.hintOnce, K.msg, K.star, K.drawParts, K.helpLine, K.hero.
   From COMIC: K.INK, K.PAPER, K.P, K.disp, K.body, K.ink, K.inkRect, K.edge, K.hard, K.dotFade, K.dotFadeX, K.dotScreen,
     K.box, K.word, K.balloon, K.burst, K.sfx, K.focus, K.spikes.
   K.goldHelp(st, text, life)       the gold-help banner (plays cityHelp, counts st.stats.helps).
   Effects (comic versions)
     K.fx(st), K.tickFx(st, dt)      as SHRUNK's, plus the sound words and focus lines below
     K.pop(st, x, y, s, col, size, o) a comic pop word (Bangers capitals, thick ink, hard shadow, tilted). o.from: an object
                                     with x, y (the thief): the words are its speech balloon and follow it.
     K.drawPops(st, cx, cy)          the pops, in screen px
     K.sound(st, x, y, word, o)      a big hand-lettered sound word at world x, y for about 0.8 s (o: c1, c2 colours, size,
                                     rot, life). Placed beside the event, clamped to the screen, kept off the heroes; at
                                     most two on screen; the same word again within 0.4 s is skipped, and so is one for
                                     something off screen (st.cam.x).
     K.focusAt(st, x, y)             focus lines pointing at world x, y for 0.25 s
     K.drawWords(st, cx, cy, heroes) draws the focus lines and the sound words (screen px; heroes: [{x, y}] world feet)
   Superheroes
     K.suit(id, x, y, o)             Pip or Bo in costume, feet at x, y: cape (behind), body (K.hero, inked), mask, emblem.
                                     o: face, rot, s, sy, sx, vy, stun, alpha (see-through), capeV (how hard the cape
                                     flies: 0 still .. 1 flat out), arms ('up' holding something overhead, 'ready'
                                     braced to catch: elbows out, hands up), hands (gloves on the arm ends), glow (a colour
                                     for a comic power aura), kit (the costume for the power: 'speed' lightning emblem and
                                     goggles, 'strong' gauntlets and a wide belt, 'stretch' a striped rubbery suit, 'web' a
                                     web pattern over the mask and shoulders, 'ghost' a pale hood, 'champ' a champion
                                     belt), vanish (the ghost's vanished look: a dashed ink outline with dots).
     K.JOBKIT[job]                   the kit for a job name ('speedster', 'strong hero', 'stretchy', 'web-slinger', 'ghost')
     K.speedLines(x, y, dir, t, o)   ink streaks (every third one white) behind a fast hero. o: n, len.
     K.comic(x, y, str, s, rot, col) a comic-book burst ("POW!") centred at x, y (COMIC.burst).
   City scenery (call the sky painters with NO transform; props inside your camera transform)
     K.sky(cx, t, o)                 full screen, flat bands joined by dots: o.mode 'night' (navy, blue, hot pink,
                                     orange; an inked moon, sparkle stars, pink-lit clouds and the hero signal) or 'dusk'
                                     (navy, magenta, orange, pale yellow; a huge low sun with rays), o.moonX, o.moonY,
                                     o.storm (inked storm clouds, rain and jagged lightning, 0..1), o.beams (searchlights),
                                     o.dawn (an orange band low down), o.deep (a deeper navy sky), o.life (false: no blimp,
                                     helicopter or birds).
     K.skyLife(cx, t, o), K.beams(cx, t)  the blimp, helicopter, birds and shooting star / the two searchlights on their own
                                     (32-4 draws them over a still copy of its sky)
     K.skyline(cx, t, o)             pale far towers, the landmarks (stepped tower, clock tower, domed hall, ferris wheel,
                                     radio mast, stadium, neon sign on stilts), bright middle towers, the street glow and an
                                     elevated railway with a little train, then rich inked near towers full of detail.
                                     o: base (y of the bottom of the near layer, default 460), n (layers 1..3), mode 'dusk',
                                     neon (0..1 more neon signs), site (cranes and scaffolds), clock (0..1: the big clock
                                     tower closer and closer), clockA (0..1: fade it out).
     K.facade(x, top, w, o)          a near building, roof at `top`, down past the screen bottom: bold brick red-orange or
                                     steel blue, a shadow side breaking into dots, inked bricks, framed windows (curtains, a
                                     cat or a plant), awnings, flower boxes, a drainpipe, posters, a cornice with a hard
                                     shadow. o: col (any value: steel blue), seed, fire (a fire escape), sign (a sign word).
     K.ac(x, y, w, h, t), K.waterTower(x, y, s), K.antenna(x, y, h, t), K.vent(x, y, w, h),
     K.billboard(x, y, w, h, str, t, o)   inked rooftop props (as before: bottom left at x, y; o.col, o.bg)
   HUD (comic: ink on light boxes, no purple)
     K.pills(st)                     the level caption box ("32-3  ROOFTOP CHASE") and the narration caption ("PART 1 OF 4:
                                     AFTER THAT THIEF!", from the stretch's `narr`) top left (the defs set ownPills)
     K.counter(st, tm, n)            the timer / collectable caption box top right; returns its left x
     K.card(x, y, w, h)              a cream paper box with an ink outline and a hard shadow (dials, meters, cards)
     K.chip, K.panel, K.meter, K.drawMsg, K.prompter   as SHRUNK's, comic look: the player card has a header strip in the
                                     player's colour and a tilted portrait panel of the hero; prompts are speech balloons.
     K.portrait(id, x, y, q, kit, tilt)   that portrait panel on its own (a q px yellow box, sunburst, the costumed hero)
     K.page()                        the printed finish and the panel border (from a mode's finish hook)
   Sounds (Sfx.play('cityPop')): cityPop (a collectable), cityHelp, cityCheer, cityWhoosh, cityThud, cityBoing, cityAlarm,
     cityZap, cityPow, cityClang. Levels add their own as Sfx.extra.<mode>Name.
   Colours: K.COL = { night, nightHi, dusk, brick, brickDark, brickHi, concrete, concreteDark, steel, steelDark, steelHi,
     lit, litWarm, dark, tar, tarHi, gold } (flat comic colours; the old greys became blues and teals). */
const HEROCITY = (() => {
  const S = SHRUNK, CK = COMIC, K = { defs: {} };
  for (const k of ['FONT', 'lerp', 'smooth', 'hash', 'mmss', 'stubMap', 'BREAK', 'quiet', 'key', 'track', 'both', 'idle', 'actLabels',
    'hide', 'unhide', 'place', 'part', 'spark', 'confetti', 'dust', 'poof', 'hint', 'hintOnce', 'msg', 'star',
    'drawParts', 'helpLine', 'hero']) K[k] = S[k];
  for (const k of ['INK', 'PAPER', 'P', 'disp', 'body', 'ink', 'inkRect', 'edge', 'hard', 'dotFade', 'dotFadeX', 'dotScreen', 'box', 'word',
    'balloon', 'burst', 'sfx', 'focus', 'spikes']) K[k] = CK[k];
  const TAU = Math.PI * 2, H_ = K.hash, INK = CK.INK, PAPER = CK.PAPER, DISPLAY = CK.DISPLAY;
  const COL = K.COL = {
    night: '#0f1650', nightHi: '#2647b8', dusk: '#ff7a2a', brick: '#d8472c', brickDark: '#8e2218', brickHi: '#ff8a5a',
    concrete: '#4d8bb8', concreteDark: '#27557e', steel: '#19a89a', steelDark: '#0c5c56', steelHi: '#5fe0cc', lit: '#ffe14a',
    litWarm: '#ffb02e', dark: '#16307a', tar: '#2a3a8a', tarHi: '#fff3a8', gold: '#ffe14a',
  };
  // the comic fonts load with the page (index.html); ask for them now so the first World 32 frame has them
  try { document.fonts.load('20px Bangers'); document.fonts.load('700 14px "Comic Neue"'); document.fonts.load('italic 700 14px "Comic Neue"'); } catch (e) { /* the stacks fall back */ }
  // a path already built: ink it (stroke at 2*lw), then fill
  const inkFill = (col, lw = 2.5) => { ctx.strokeStyle = INK; ctx.lineWidth = lw * 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fillStyle = col; ctx.fill(); ctx.lineJoin = 'miter'; };
  const strokeInk = (lw) => { ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke(); };
  K.inkFill = inkFill;
  // catch-up help is gold and announced, never hidden, and counted for the results card
  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('cityHelp');
  };

  /* ---------- effects: pops, sound words, focus lines ---------- */
  K.fx = st => { S.fx(st); st.words = []; st.foc = null; };
  K.tickFx = (st, dt) => {
    S.tickFx(st, dt);
    if (st.words) { for (const w of st.words) w.t += dt; st.words = st.words.filter(w => w.t < w.life); }
    if (st.foc && (st.foc.t += dt) > 0.3) st.foc = null;
  };
  K.pop = (st, x, y, s, col, size, o) => {
    if (o && o.from) st.pops = st.pops.filter(q => q.from !== o.from); // one balloon per speaker
    st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0, from: o && o.from, rot: (H_(st.pops.length + x * 0.01) - 0.5) * 0.14 - 0.03 });
    if (st.pops.length > 10) st.pops.shift();
  };
  K.drawPops = (st, cx = 0, cy = 0) => {
    const big = hudBig();
    for (const q of st.pops) {
      const a = clamp((1.3 - q.t) / 0.3, 0, 1), pop = 1 + 0.25 * Math.max(0, 1 - q.t / 0.15);
      if (q.from) {
        // a speech balloon from someone in the scene (the thief), following them
        const fs = big ? 17 : 13, str = String(q.s).toUpperCase();
        ctx.font = CK.body(fs);
        const w = ctx.measureText(str).width + 22, h = fs + 14, hx = q.from.x - cx, hy = q.from.y - cy - 64;
        const x = clamp(hx - w / 2, 16, W - w - 16), y = clamp(hy - h, 90, H - 120);
        ctx.globalAlpha = a; ctx.save(); ctx.translate(hx, hy); ctx.scale(pop, pop); ctx.translate(-hx, -hy);
        K.balloon(x, y, w, h, hx, { sh: 3 });
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(str, x + w / 2, y + h / 2 + 1);
        ctx.restore(); ctx.globalAlpha = 1;
        continue;
      }
      const x = clamp(q.x - cx, 120, W - 120), y = clamp(q.y - cy - q.t * 30, 96, H - 110);
      ctx.globalAlpha = a;
      const size = q.size * (big ? 1.3 : 1) * 1.35;
      ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
      K.word(q.s, 0, 0, size, q.col, { rot: q.rot, lw: size * 0.22, shadow: Math.max(2, size * 0.09) });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  };
  K.sound = (st, x, y, word, o = {}) => {
    if (!st.words) st.words = [];
    const cx = st.cam ? (st.cam.x !== undefined ? st.cam.x : st.cam) : 0; // skip a word for something off screen
    if (typeof cx === 'number' && (x < cx - 60 || x > cx + W + 60)) return;
    if (st.words.some(w => w.word === word && w.t < 0.4)) return;
    st.words.push({ x, y, word, t: 0, life: o.life || 0.8, size: o.size || 26, rot: o.rot === undefined ? (H_(x * 0.13 + word.length) - 0.5) * 0.3 : o.rot, c1: o.c1 || '#ffe14a', c2: o.c2 || '#ff2e3e' });
    while (st.words.length > 2) st.words.shift();
  };
  K.focusAt = (st, x, y) => { st.foc = { x, y, t: 0, seed: Math.floor(x * 7 + y) % 97 }; };
  K.drawWords = (st, cx = 0, cy = 0, heroes = []) => {
    if (st.foc) {
      const u = st.foc.t / 0.25;
      if (u < 1) K.focus(st.foc.x - cx, st.foc.y - cy, 200 + u * 60, 44, 0.75 * (1 - u * u), st.foc.seed);
    }
    if (!st.words) return;
    const big = hudBig(), placed = [];
    for (const w of st.words) {
      const size = w.size * (big ? 1.2 : 1), wd = size * 0.62 * w.word.length * 1.25 + 20, ht = size * 1.6;
      let x = clamp(w.x - cx, 24 + wd / 2, W - 24 - wd / 2), y = clamp(w.y - cy, 70 + ht / 2, H - 100 - ht / 2);
      const hit = (xx, yy) => heroes.some(h => Math.abs(h.x - cx - xx) < wd / 2 + 16 && h.y - cy - 46 < yy + ht / 2 && h.y - cy + 6 > yy - ht / 2)
        || placed.some(p => Math.abs(p.x - xx) < (p.w + wd) / 2 && Math.abs(p.y - yy) < (p.h + ht) / 2);
      for (let k = 0; k < 8 && hit(x, y); k++) y = clamp(y - ht * 0.6, 70 + ht / 2, H - 100 - ht / 2);
      if (hit(x, y)) x = clamp(x + (x < W / 2 ? 1 : -1) * wd * 0.8, 24 + wd / 2, W - 24 - wd / 2);
      placed.push({ x, y, w: wd, h: ht });
      const pin = Math.min(1, w.t / 0.08), sc = pin < 1 ? 0.4 + 0.75 * pin : 1 + 0.15 * Math.max(0, 1 - (w.t - 0.08) / 0.12);
      ctx.globalAlpha = clamp((w.life - w.t) / 0.18, 0, 1);
      K.sfx(x, y, w.word, size, w.rot, w.c1, w.c2, sc);
      ctx.globalAlpha = 1;
    }
  };

  /* ---------- superheroes ---------- */
  const CAPE = [['#e8222e', '#8e1018'], ['#ffd23a', '#c88a10']]; // Pip's red cape, Bo's gold cape
  // costume colours: Pip wears no blue, Bo no orange or red (the outfit rule); capes stay the family look
  const KITCOL = [{ a: '#ffe14a', b: '#2fc45a', lens: '#7af0e0', glove: '#2fc45a' }, { a: '#ffe14a', b: '#5fe0cc', lens: '#ffe14a', glove: '#ffe14a' }];
  K.JOBKIT = { speedster: 'speed', 'strong hero': 'strong', stretchy: 'stretch', 'web-slinger': 'web', ghost: 'ghost' };
  function cape(id, x, y, face, t, v, s) {
    const [c0, c1] = CAPE[id], sh = y - 22 * s, fl = clamp(v, 0, 1);
    const len = 22 * s, back = -face, wave = Math.sin(t * (8 + fl * 10) + id) * (2 + fl * 3) * s;
    const tipX = x + back * (6 + fl * 24) * s, tipY = sh + len - fl * 14 * s;
    ctx.beginPath(); ctx.moveTo(x - 9 * s, sh); ctx.lineTo(x + 9 * s, sh);
    ctx.quadraticCurveTo(tipX + back * 8 * s, (sh + tipY) / 2 + wave, tipX + back * 10 * s + wave * 0.5, tipY + 4 * s);
    ctx.lineTo(tipX - back * 4 * s, tipY + 6 * s + wave * 0.6);
    ctx.quadraticCurveTo(x - back * 4 * s, sh + len * 0.6, x - 9 * s, sh); ctx.closePath();
    inkFill(c1, 0.9 * s);
    ctx.fillStyle = c0;
    ctx.beginPath(); ctx.moveTo(x - 7 * s, sh + 1); ctx.lineTo(x + 7 * s, sh + 1);
    ctx.quadraticCurveTo(tipX + back * 4 * s, (sh + tipY) / 2 + wave, tipX + back * 6 * s + wave * 0.5, tipY);
    ctx.quadraticCurveTo(x, sh + len * 0.5, x - 7 * s, sh + 1); ctx.closePath(); ctx.fill();
  }
  const solid = c => (typeof c === 'string' && c.startsWith('rgba') ? c.replace(/,\s*[\d.]+\)$/, ',1)').replace('rgba', 'rgba') : c);
  const bolt = (x, y, s) => { ctx.beginPath(); ctx.moveTo(x + 2 * s, y - 7 * s); ctx.lineTo(x - 4 * s, y + 1 * s); ctx.lineTo(x, y + 1 * s); ctx.lineTo(x - 2 * s, y + 7 * s); ctx.lineTo(x + 4 * s, y - 1 * s); ctx.lineTo(x, y - 1 * s); ctx.closePath(); };
  K.suit = (id, x, y, o = {}) => {
    const s = o.s || 1, face = o.face || 1, t = G.clock || 0, kit = o.kit || null, kc = KITCOL[id];
    const a0 = ctx.globalAlpha;
    if (o.glow) K.spikes(x, y - 13 * s, 26 * s, solid(o.glow), t, 12);
    if (o.alpha !== undefined) ctx.globalAlpha = a0 * o.alpha;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.translate(-x, -y);
    cape(id, x, y, face, t, o.capeV || 0, s);
    ctx.restore();
    // the body, outlined in ink instead of the darker body colour (World 32 only: put back straight after)
    const d0 = PDARK[id]; PDARK[id] = INK;
    try { K.hero(id, x, y, { face, rot: o.rot, s: o.s, sy: o.sy, sx: o.sx, vy: o.vy, stun: o.stun }); } finally { PDARK[id] = d0; }
    // costume bits, mask and emblem, drawn in the body's own frame
    const sy = o.sy || 1, h = PH * sy * s, w = PW * (o.sx || (o.sy ? 2 - o.sy : 1)) * s;
    ctx.save(); ctx.translate(x, y - PH * s / 2); ctx.rotate(o.rot || 0); ctx.translate(0, PH * s / 2);
    const body = () => rr(-w / 2, -h, w, h, 8 * s);
    const ey = -h * 0.6, look = face * 2.5 * s;
    if (kit === 'stretch' || kit === 'web' || kit === 'ghost' || kit === 'strong' || kit === 'champ') {
      ctx.save(); body(); ctx.clip();
      if (kit === 'stretch') {
        // a striped rubbery suit: the stripes stretch with the body
        ctx.fillStyle = id === 0 ? kc.a : '#ffffff';
        for (const u of [0.12, 0.3, 0.86]) ctx.fillRect(-w / 2, -h * u - 2.2 * s * sy, w, 4.4 * s * sy);
        ctx.strokeStyle = INK; ctx.lineWidth = 0.8 * s;
        for (const u of [0.12, 0.3, 0.86]) { ctx.strokeRect(-w / 2 - 1, -h * u - 2.2 * s * sy, w + 2, 4.4 * s * sy); }
      } else if (kit === 'web') {
        // a web pattern over the mask and the shoulders
        ctx.strokeStyle = INK; ctx.lineWidth = 0.7 * s; ctx.beginPath();
        const ox = look * 0.6, oy = ey;
        for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * 30 * s, oy + Math.sin(a) * 30 * s); }
        for (const r of [7, 12, 18]) for (let k = 0; k < 10; k++) {
          const a1 = k / 10 * TAU, a2 = (k + 1) / 10 * TAU;
          if (Math.sin((a1 + a2) / 2) > 0.45) continue; // keep the lower face clear
          ctx.moveTo(ox + Math.cos(a1) * r * s, oy + Math.sin(a1) * r * s); ctx.quadraticCurveTo(ox + Math.cos((a1 + a2) / 2) * r * 0.82 * s, oy + Math.sin((a1 + a2) / 2) * r * 0.82 * s, ox + Math.cos(a2) * r * s, oy + Math.sin(a2) * r * s);
        }
        ctx.stroke();
      } else if (kit === 'ghost') {
        // a pale hood with an opening for the face
        ctx.fillStyle = '#e6f4ff'; ctx.beginPath(); ctx.rect(-w / 2 - 2, -h - 2, w + 4, h * 0.62);
        ctx.ellipse(look * 0.6, ey + 1.5 * s, 10.5 * s, 7.5 * s, 0, 0, TAU); ctx.fill('evenodd');
        ctx.strokeStyle = INK; ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.ellipse(look * 0.6, ey + 1.5 * s, 10.5 * s, 7.5 * s, 0, 0, TAU);
        ctx.moveTo(-w / 2, -h * 0.4 + 2); ctx.lineTo(w / 2, -h * 0.4 + 2); ctx.stroke();
      } else if (kit === 'strong' || kit === 'champ') {
        // a wide belt with a buckle (the champion's is a big gold plate)
        const by = -h * 0.24, bh = (kit === 'champ' ? 6 : 5) * s;
        ctx.fillStyle = kit === 'champ' ? kc.glove : INK; ctx.fillRect(-w / 2, by - bh / 2, w, bh);
        ctx.strokeStyle = INK; ctx.lineWidth = 1 * s; ctx.strokeRect(-w / 2 - 1, by - bh / 2, w + 2, bh);
      }
      ctx.restore();
    }
    if (!o.stun) {
      ctx.fillStyle = id === 0 ? '#2a1a3a' : '#1a2a4a';
      ctx.beginPath(); ctx.ellipse(-5 * s + look, ey, 6.2 * s, 5.4 * s, 0, 0, TAU); ctx.ellipse(5 * s + look, ey, 6.2 * s, 5.4 * s, 0, 0, TAU); ctx.fill();
      ctx.fillRect(-w / 2 + 1, ey - 2.5 * s, w - 2, 4 * s);
      // mask tails flutter behind
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(-face * w / 2, ey); ctx.quadraticCurveTo(-face * (w / 2 + 6 * s), ey + Math.sin(t * 9 + id) * 3, -face * (w / 2 + 10 * s), ey + 4 * s); ctx.stroke();
      for (const ex of [-5, 5]) {
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex * s + look, ey, 3.4 * s, 3.8 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = INK; circle(ex * s + look + face * 1.1 * s, ey + 0.6 * s, 1.8 * s); ctx.fill();
      }
      if (kit === 'speed') {
        // goggles pushed up on the forehead, strap swept back
        const gy = -h * 0.9;
        ctx.strokeStyle = INK; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(-face * w / 2, gy + 1 * s); ctx.quadraticCurveTo(-face * (w / 2 + 7 * s), gy + Math.sin(t * 11 + id) * 2 * s, -face * (w / 2 + 13 * s), gy + 3 * s); ctx.stroke();
        for (const ex of [-4.5, 4.5]) { ctx.beginPath(); ctx.ellipse(ex * s + look * 0.7, gy, 3.6 * s, 3 * s, 0, 0, TAU); inkFill(kc.lens, 0.8 * s); ctx.fillStyle = '#ffffff'; circle(ex * s + look * 0.7 - 1.2 * s, gy - 1 * s, 0.9 * s); ctx.fill(); }
      }
    }
    // the chest emblem: a lightning bolt for the speedster, a star otherwise (Pip yellow, Bo white with yellow)
    const exm = face * 2 * s, eym = -h * 0.22;
    if (kit === 'speed') { bolt(exm, eym, 0.95 * s); inkFill(kc.a, 0.7 * s); }
    else if (kit === 'champ') { ctx.beginPath(); ctx.ellipse(exm, -h * 0.24, 5.2 * s, 4.2 * s, 0, 0, TAU); inkFill('#ffe14a', 0.7 * s); ctx.fillStyle = INK; K.star(exm, -h * 0.24, 2.6 * s, 1.1 * s, 0); ctx.fill(); }
    else if (kit !== 'strong' && kit !== 'ghost') {
      K.star(exm, eym, 5.2 * s, 2.3 * s, 0); inkFill('#ffffff', 0.6 * s);
      ctx.fillStyle = '#ffd23a'; K.star(exm, eym, 3.8 * s, 1.6 * s, 0); ctx.fill();
    } else if (kit === 'strong') { ctx.beginPath(); rr(exm - 3.5 * s, -h * 0.24 - 3 * s, 7 * s, 6 * s, 1.5 * s); inkFill('#ffe14a', 0.6 * s); }
    const gauntlet = (hx, hy) => {
      // a big cuffed gauntlet
      ctx.beginPath(); rr(hx - 4.5 * s, hy - 1.5 * s, 9 * s, 6 * s, 1.5 * s); inkFill(kc.b, 0.75 * s);
      circle(hx, hy - 2 * s, 4 * s); inkFill(kc.a, 0.75 * s);
    };
    if (o.arms === 'up' || o.arms === 'ready') {
      // 'up': arms straight overhead (holding something). 'ready': elbows out, forearms up, open hands above the
      // head, bouncing a little: braced to catch something falling. o.hands draws round hands on the ends.
      const sxL = -w / 2 + 2, sxR = w / 2 - 2, sh = -h * 0.55;
      let segs;
      if (o.arms === 'up') segs = [[sxL, sh, -w / 2 - 2 * s, -h - 12 * s], [sxR, sh, w / 2 + 2 * s, -h - 12 * s]];
      else {
        const bob = Math.sin(t * 7 + id) * 1.5 * s, ex = w / 2 + 7 * s, ey2 = -h * 0.72, hy = -h - 7 * s + bob;
        segs = [[sxL, sh, -ex, ey2, -w / 2 - 4 * s, hy], [sxR, sh, ex, ey2, w / 2 + 4 * s, hy]];
      }
      const path = () => { ctx.beginPath(); for (const g of segs) { ctx.moveTo(g[0], g[1]); for (let k = 2; k < g.length; k += 2) ctx.lineTo(g[k], g[k + 1]); } };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = 5.5 * s; path(); ctx.stroke();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 3 * s; path(); ctx.stroke();
      if (o.hands || kit === 'strong') for (const g of segs) {
        const hx = g[g.length - 2], hy = g[g.length - 1];
        if (kit === 'strong') gauntlet(hx, hy);
        else { circle(hx, hy, 3 * s); inkFill('#ffffff', 0.75 * s); }   // white superhero gloves
      }
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    } else if (kit === 'strong') { gauntlet(-w / 2 - 1 * s, -h * 0.38); gauntlet(w / 2 + 1 * s, -h * 0.38); }
    if (o.vanish) {
      // vanished: only a dashed ink outline and a few dots show where the ghost is
      ctx.globalAlpha = a0 * (0.75 + 0.2 * Math.sin(t * 12 + id));
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * s; ctx.setLineDash([3 * s, 3 * s]); body(); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = INK; for (let k = 0; k < 5; k++) { const a = k * 1.3 + t * 3 + id; circle(Math.cos(a) * w * 0.55, -h / 2 + Math.sin(a * 1.7) * h * 0.55, 1.1 * s); ctx.fill(); }
    }
    ctx.restore();
    ctx.globalAlpha = a0;
  };
  K.speedLines = (x, y, dir, t, o = {}) => {
    const n = (o.n || 6) + 2, len = (o.len || 60) * 1.3; ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const u = ((t * 6 + k * 0.37) % 1), yy = y + 2 - k * 4, l = len * (0.5 + 0.5 * H_(k + 3)) * (1 - u * 0.4), x0 = x - dir * (12 + u * 26);
      ctx.strokeStyle = k % 3 === 1 ? '#ffffff' : INK; ctx.lineWidth = k % 3 === 1 ? 3 : 2.2;
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - dir * l, yy); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  };
  K.comic = (x, y, str, s = 1, rot = 0, col = '#ffe14a') => CK.burst(x, y, str, s, rot, col);

  /* ---------- the sky ---------- */
  function cloudBlob(x, y, parts) { ctx.beginPath(); for (const [dx, dy, r] of parts) { ctx.moveTo(x + dx + r, y + dy); ctx.arc(x + dx, y + dy, r, 0, TAU); } }
  function skyLife(cx, t, dusk) {
    // the blimp, drifting slowly, with "PIP & BO!" on its side
    const bx = ((t * 9 - cx * 0.05 + 260) % 1500 + 1500) % 1500 - 200, by = dusk ? 150 : 84 + Math.sin(t * 0.6) * 4;
    ctx.beginPath(); ctx.moveTo(bx - 70, by - 4); ctx.lineTo(bx - 96, by - 24); ctx.lineTo(bx - 84, by); ctx.lineTo(bx - 96, by + 22); ctx.lineTo(bx - 70, by + 6); inkFill('#ffe14a');
    ctx.beginPath(); ctx.ellipse(bx, by, 78, 27, 0, 0, TAU); inkFill('#e8222e', 3);
    ctx.save(); ctx.beginPath(); ctx.ellipse(bx, by, 78, 27, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 80, by - 9, 160, 17); K.dotFade(bx - 80, bx + 80, by + 6, by + 30, '#8e1018', 6, 0.7);
    ctx.font = K.disp(17); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1c3fa8'; ctx.fillText('PIP & BO!', bx, by + 0.5); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx - 77, by - 9); ctx.lineTo(bx + 77, by - 9); ctx.moveTo(bx - 77, by + 8); ctx.lineTo(bx + 77, by + 8); ctx.stroke();
    ctx.beginPath(); ctx.rect(bx - 18, by + 27, 36, 10); inkFill('#ffe14a', 2);
    // a little helicopter with a searchlight
    const hx = ((1300 - t * 22 - cx * 0.08) % 1700 + 1700) % 1700 - 200, hy = (dusk ? 96 : 210) + Math.sin(t * 1.3) * 6;
    ctx.fillStyle = 'rgba(255,244,150,0.3)'; ctx.beginPath(); ctx.moveTo(hx - 4, hy + 10); ctx.lineTo(hx - 120, hy + 330); ctx.lineTo(hx - 30, hy + 330); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx + 12, hy); ctx.lineTo(hx + 46, hy - 4); ctx.moveTo(hx, hy - 10); ctx.lineTo(hx, hy - 16);
    ctx.moveTo(hx - 30 * Math.cos(t * 30), hy - 16); ctx.lineTo(hx + 30 * Math.cos(t * 30), hy - 16); ctx.moveTo(hx + 46, hy - 10); ctx.lineTo(hx + 46, hy + 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx, hy, 17, 11, 0, 0, TAU); inkFill('#19a89a', 2);
    ctx.fillStyle = '#bff6ff'; ctx.beginPath(); ctx.ellipse(hx - 7, hy - 1, 7, 6, 0, 0, TAU); ctx.fill(); strokeInk(1.5);
    // a flock of birds
    ctx.strokeStyle = dusk ? '#ffffff' : INK; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const x = ((t * 26 + k * 34 + (k % 2) * 12 - cx * 0.06 + 500) % 1300 + 1300) % 1300 - 100, y = (dusk ? 210 : 130) + (k % 3) * 16 + Math.sin(t * 2 + k) * 4, f = 4 + Math.sin(t * 9 + k) * 3;
      ctx.moveTo(x - 8, y - f); ctx.quadraticCurveTo(x - 3, y - f - 3, x, y); ctx.quadraticCurveTo(x + 3, y - f - 3, x + 8, y - f);
    }
    ctx.stroke(); ctx.lineCap = 'butt';
    if (!dusk) { // a shooting star now and then
      const u = (t * 0.12) % 1, sx = 520 - u * 900, sy = 30 + u * 260;
      if (u < 0.14) { const v = u / 0.14; ctx.globalAlpha = Math.min(1, (1 - v) * 3); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 70, sy - 21); ctx.stroke(); ctx.lineCap = 'butt'; K.star(sx, sy, 8, 3.5, t); inkFill('#fff36a', 1); ctx.globalAlpha = 1; }
    }
  }
  // (32-4 keeps a still copy of its sky and skyline and draws these moving bits over it)
  K.skyLife = (cx, t, o = {}) => skyLife(cx, t, o.mode === 'dusk');
  K.beams = (cx, t) => {
    for (let k = 0; k < 2; k++) {
      // two sweeping searchlights: flat pale yellow, no gradient
      const bx = 180 + k * 520 - (cx * 0.1) % 900, a = Math.sin(t * 0.5 + k * 2) * 0.5;
      ctx.save(); ctx.translate(bx, H); ctx.rotate(a);
      ctx.fillStyle = 'rgba(255,238,120,0.24)'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-80, -760); ctx.lineTo(80, -760); ctx.lineTo(8, 0); ctx.fill();
      ctx.restore();
    }
  };
  K.sky = (cx, t, o = {}) => {
    const dusk = o.mode === 'dusk', off = cx * 0.02;
    const A = dusk ? '#1d2a7a' : o.deep ? '#080c34' : '#0f1650', B = dusk ? '#e8307a' : o.deep ? '#1c2f8e' : '#2647b8', Cc = dusk ? '#ff7a2a' : '#ff4f9a';
    const D = dusk ? '#fff3a0' : '#ffb03a';
    const b1 = o.deep ? 170 : 120, b2 = o.deep ? 290 : 250, b3 = o.dawn ? 340 : 380;
    ctx.fillStyle = A; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = B; ctx.fillRect(0, b1, W, H); K.dotFade(0, W, b1 - 96, b1, B, 12, 0.74, off);
    ctx.fillStyle = Cc; ctx.fillRect(0, b2, W, H); K.dotFade(0, W, b2 - 120, b2, Cc, 12, 0.74, off);
    ctx.fillStyle = o.dawn ? '#ff8a2a' : D; ctx.fillRect(0, b3, W, H); K.dotFade(0, W, b3 - 100, b3, o.dawn ? '#ff8a2a' : D, 12, 0.74, off);
    if (o.dawn) { ctx.fillStyle = '#ffe14a'; ctx.fillRect(0, b3 + 70, W, H); K.dotFade(0, W, b3 + 10, b3 + 70, '#ffe14a', 10, 0.74, off); }
    // stars: four-point sparkles
    for (let i = 0; i < (dusk ? 10 : 34); i++) {
      const x = ((H_(i) * 1400 - cx * 0.02) % 1000 + 1000) % 1000 - 20, y = 14 + H_(i + 50) * (dusk ? 90 : 190), s = 2.5 + H_(i + 3) * 4 * (0.7 + 0.3 * Math.sin(t * 2 + i));
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
    }
    const mx = o.moonX === undefined ? 760 : o.moonX, my = o.moonY === undefined ? 96 : o.moonY;
    if (dusk) {
      // a huge low sun with comic rays
      const sx = mx, sy = my + 250;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.03);
      ctx.fillStyle = 'rgba(255,240,150,0.45)'; ctx.beginPath();
      for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.07) * 520, Math.sin(a - 0.07) * 520); ctx.lineTo(Math.cos(a + 0.07) * 520, Math.sin(a + 0.07) * 520); }
      ctx.fill(); ctx.restore();
      circle(sx, sy, 84); inkFill('#fff3a0', 2);
      ctx.save(); circle(sx, sy, 82); ctx.clip(); K.dotFade(sx - 90, sx + 90, sy - 10, sy + 90, '#ff9a2a', 9, 0.7); ctx.restore();
    } else {
      // an inked yellow moon: a dotted halo, a dot-fade shadow on one side, ringed craters
      circle(mx, my, 84); ctx.fillStyle = 'rgba(120,180,255,0.35)'; ctx.fill();
      ctx.save(); circle(mx, my, 84); ctx.clip(); K.dotScreen(mx - 90, my - 90, mx + 90, my + 90, 'rgba(255,255,255,0.35)', 9, 1.8); ctx.restore();
      circle(mx, my, 54); inkFill('#fff6b8', 2);
      ctx.save(); circle(mx, my, 54); ctx.clip(); ctx.translate(mx, my); ctx.rotate(-0.7); K.dotFade(-70, 70, 4, 62, '#ffc24a', 8, 0.62); ctx.restore();
      for (const [dx, dy, r] of [[-20, -14, 10], [16, 12, 8], [-8, 26, 5], [22, -22, 5], [-30, 14, 4]]) { circle(mx + dx, my + dy, r); ctx.fillStyle = '#f0d27a'; ctx.fill(); strokeInk(2.2); }
    }
    if (!dusk) {
      // pink-lit night clouds; the first one carries the hero signal, lit by a beam from the city
      for (let i = 0; i < 3; i++) {
        const x = ((i * 430 + 60 - cx * 0.04 + t * 3) % 1300 + 1300) % 1300 - 180, y = 150 + (i % 2) * 46;
        const parts = [[0, 0, 26], [34, -10, 32], [72, -2, 26], [104, 6, 18], [-26, 8, 16]];
        if (i === 0) { ctx.fillStyle = 'rgba(255,240,130,0.34)'; ctx.beginPath(); ctx.moveTo(x - 130, H); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x + 66, y + 6); ctx.lineTo(x - 100, H); ctx.fill(); }
        cloudBlob(x, y, parts); ctx.rect(x - 40, y + 4, 160, 20); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke(); ctx.fillStyle = '#ffd0e6'; ctx.fill();
        ctx.save(); cloudBlob(x, y, parts); ctx.rect(x - 40, y + 4, 160, 20); ctx.clip(); K.dotFade(x - 60, x + 140, y - 12, y + 30, '#e8307a', 7, 0.72); ctx.restore();
        if (i === 0) {
          ctx.beginPath(); ctx.ellipse(x + 38, y - 2, 30, 22, 0, 0, TAU); ctx.fillStyle = '#ffe14a'; ctx.fill(); strokeInk(3);
          K.star(x + 38, y - 2, 15, 6.5, 0); ctx.fillStyle = '#ff2e3e'; ctx.fill(); strokeInk(2);
        }
      }
    }
    if (o.life !== false) skyLife(cx, t, dusk);
    if (o.beams) K.beams(cx, t);
    if (o.storm) {
      // inked storm clouds with dotted undersides (more and darker as the storm grows), and a jagged bolt now and then
      const n = 3 + Math.round(o.storm * 4), dk = o.storm > 0.55;
      for (let i = 0; i < n; i++) {
        const x = ((i * 1320 / n - cx * 0.05 + t * 8) % 1320 + 1320) % 1320 - 180, y = 34 + (i % 3) * 20;
        const parts = [[0, 0, 46], [52, -14, 54], [108, 0, 44], [150, 10, 30], [-36, 12, 28]];
        cloudBlob(x, y, parts); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.fillStyle = dk ? '#55639e' : '#6f7fb4'; ctx.fill();
        ctx.save(); cloudBlob(x, y, parts); ctx.clip(); K.dotFade(x - 80, x + 200, y - 10, y + 60, dk ? '#161c46' : '#232c5c', 8, 0.74); ctx.restore();
      }
      const rate = 0.3 + o.storm * 0.4, ph = (t * rate) % 1;
      if (ph < 0.12 && o.storm > 0.2) {
        const bx = 200 + H_(Math.floor(t * rate) + 7) * 560;
        ctx.beginPath(); ctx.moveTo(bx, 60); ctx.lineTo(bx - 34, 170); ctx.lineTo(bx - 8, 170); ctx.lineTo(bx - 50, 290); ctx.lineTo(bx + 26, 150); ctx.lineTo(bx + 2, 150); ctx.lineTo(bx + 30, 60); ctx.closePath();
        inkFill('#fff36a', 3.5);
        if (ph < 0.025) { ctx.fillStyle = 'rgba(255,255,240,0.18)'; ctx.fillRect(0, 0, W, H); }
      }
    }
  };

  /* ---------- the skyline ---------- */
  function landmarks(cx, t, base, dusk, o) {
    const P = 2400, sx = cx * 0.1, pale = dusk ? '#ffe9a0' : '#bfe0ff', pdk = dusk ? '#f09a3a' : '#5f8ee8', lit = '#fff36a';
    for (let i = Math.floor((sx - 400) / P); i <= Math.ceil((sx + W) / P); i++) {
      const ox = i * P - sx, by = base - 26, vis = x => x > -260 && x < W + 260;
      { const x = ox + 250; if (vis(x)) { // a tall stepped tower with a glowing crown and a spire
        ctx.beginPath(); ctx.rect(x - 38, by - 170, 76, 190); ctx.rect(x - 28, by - 232, 56, 63); ctx.rect(x - 17, by - 276, 34, 45); ctx.rect(x - 8, by - 300, 16, 25); ctx.moveTo(x - 3, by - 300); ctx.lineTo(x, by - 362); ctx.lineTo(x + 3, by - 300); inkFill(pale, 2);
        ctx.save(); ctx.beginPath(); ctx.rect(x + 8, by - 300, 40, 320); ctx.clip(); K.dotScreen(x + 8, by - 300, x + 40, by + 20, pdk, 6, 1.7); ctx.restore();
        ctx.fillStyle = lit; for (let k = -3; k <= 3; k++) ctx.fillRect(x + k * 10 - 1.5, by - 160, 3, 170); for (let k = -2; k <= 2; k++) ctx.fillRect(x + k * 10 - 1.5, by - 226, 3, 52);
        ctx.fillStyle = '#ff7ac0'; ctx.fillRect(x - 17, by - 280, 34, 6); ctx.fillRect(x - 28, by - 236, 56, 6); ctx.fillRect(x - 38, by - 174, 76, 6);
        ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ff3b30' : '#8a1a14'; circle(x, by - 364, 4); ctx.fill();
      } }
      { const x = ox + 650; if (vis(x) && o.clock === undefined) clockTower(x, by, 1, t, dusk); }
      { const x = ox + 1000; if (vis(x)) { // a domed hall with a flag
        ctx.beginPath(); ctx.rect(x - 70, by - 70, 140, 90); ctx.moveTo(x - 48, by - 70); ctx.arc(x, by - 70, 48, Math.PI, 0); ctx.rect(x - 8, by - 136, 16, 20); inkFill(dusk ? '#fff3c0' : '#c8f0e8', 2);
        ctx.save(); ctx.beginPath(); ctx.arc(x, by - 70, 48, Math.PI, 0); ctx.clip(); K.dotFade(x - 50, x + 50, by - 110, by - 62, dusk ? '#f0a02a' : '#16a8b8', 6, 0.7); ctx.restore();
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); for (let k = -5; k <= 5; k++) { ctx.moveTo(x + k * 12, by - 60); ctx.lineTo(x + k * 12, by + 10); } ctx.moveTo(x, by - 136); ctx.lineTo(x, by - 166); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, by - 166); ctx.lineTo(x + 22, by - 160 + Math.sin(t * 5) * 2); ctx.lineTo(x, by - 152); inkFill('#e8222e', 1.5);
      } }
      { const x = ox + 1320, y = by - 78, r = 66; if (vis(x)) { // a turning ferris wheel with coloured cabins
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 34, by + 20); ctx.moveTo(x, y); ctx.lineTo(x + 34, by + 20); ctx.stroke();
        ctx.lineWidth = 6; circle(x, y, r); ctx.stroke(); ctx.strokeStyle = dusk ? '#fff36a' : '#ff7ac0'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + t * 0.25; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.stroke();
        for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + t * 0.25; ctx.beginPath(); ctx.rect(x + Math.cos(a) * r - 6, y + Math.sin(a) * r - 2, 12, 11); inkFill(['#ffe14a', '#7af0ff', '#ff5a4a', '#5fe08a'][k % 4], 1.5); }
      } }
      { const x = ox + 1640; if (vis(x)) { // a radio mast: a red-and-white lattice with blinking lights
        ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 26, by + 20); ctx.lineTo(x, by - 300); ctx.lineTo(x + 26, by + 20); ctx.stroke();
        for (let k = 0; k < 8; k++) { ctx.strokeStyle = k % 2 ? '#ffffff' : '#e8222e'; ctx.lineWidth = 3; const y0 = by + 20 - k * 40, y1 = y0 - 40, f0 = (y0 - by + 300) / 320, f1 = (y1 - by + 300) / 320; ctx.beginPath(); ctx.moveTo(x - 26 * f0, y0); ctx.lineTo(x - 26 * f1, y1); ctx.moveTo(x + 26 * f0, y0); ctx.lineTo(x + 26 * f1, y1); ctx.moveTo(x - 26 * f0, y0); ctx.lineTo(x + 26 * f1, y1); ctx.stroke(); }
        for (const [yy, ph] of [[-300, 0], [-180, 1.5], [-60, 3]]) { ctx.fillStyle = Math.sin(t * 3 + ph) > 0 ? '#ff3b30' : '#6a1410'; circle(x, by + yy, 4.5); ctx.fill(); strokeInk(1.5); }
      } }
      { const x = ox + 1900; if (vis(x)) { // a stadium with floodlights
        ctx.beginPath(); ctx.moveTo(x - 110, by + 20); ctx.lineTo(x - 100, by - 50); ctx.quadraticCurveTo(x, by - 80, x + 100, by - 50); ctx.lineTo(x + 110, by + 20); ctx.closePath(); inkFill(dusk ? '#ffb0d0' : '#ffd0e6', 2);
        ctx.save(); ctx.clip(); K.dotFade(x - 120, x + 120, by - 50, by + 20, dusk ? '#e8307a' : '#c83a9a', 7, 0.7); ctx.restore();
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); for (let k = -4; k <= 4; k++) { ctx.moveTo(x + k * 22, by - 58 + Math.abs(k) * 3); ctx.lineTo(x + k * 24, by + 20); } ctx.stroke();
        for (const fx of [-120, 120]) {
          ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + fx, by + 20); ctx.lineTo(x + fx, by - 130); ctx.stroke();
          ctx.fillStyle = 'rgba(255,248,180,0.28)'; ctx.beginPath(); ctx.moveTo(x + fx, by - 130); ctx.lineTo(x - fx * 0.1 - 60, by - 30); ctx.lineTo(x - fx * 0.1 + 60, by - 30); ctx.fill();
          ctx.beginPath(); ctx.rect(x + fx - 14, by - 146, 28, 16); inkFill('#fff8c0', 1.5);
          ctx.fillStyle = INK; for (let k = 0; k < 3; k++) ctx.fillRect(x + fx - 10 + k * 8, by - 141, 3, 6);
        }
      } }
      { const x = ox + 2220; if (vis(x)) { // a big neon sign on stilts
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 50, by + 20); ctx.lineTo(x - 50, by - 120); ctx.moveTo(x + 50, by + 20); ctx.lineTo(x + 50, by - 120); ctx.moveTo(x - 50, by - 60); ctx.lineTo(x + 50, by - 30); ctx.stroke();
        ctx.beginPath(); ctx.rect(x - 80, by - 190, 160, 74); inkFill('#14121c', 2);
        const on = Math.sin(t * 4) > -0.6;
        ctx.strokeStyle = on ? '#ff7ac0' : '#6a2a4a'; ctx.lineWidth = 2.5; ctx.strokeRect(x - 73, by - 183, 146, 60);
        K.word('HERO', x, by - 166, 26, on ? '#7af0ff' : '#2a5a6a', { lw: 0 }); K.word('BURGERS', x, by - 138, 18, on ? '#ffe14a' : '#5a5a2a', { lw: 0 });
      } }
    }
  }
  function clockTower(x, by, sc, t, dusk) {
    ctx.save(); ctx.translate(x, by); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.rect(-30, -190, 60, 210); ctx.moveTo(-38, -190); ctx.lineTo(0, -262); ctx.lineTo(38, -190); inkFill(dusk ? '#ffc0a0' : '#ffc0e0', 2);
    ctx.save(); ctx.beginPath(); ctx.rect(6, -190, 26, 210); ctx.clip(); K.dotScreen(6, -190, 32, 20, dusk ? '#e8562a' : '#c83a9a', 6, 1.7); ctx.restore();
    circle(0, -150, 21); inkFill('#fff8d0', 2);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(Math.sin(t * 0.05) * 11, -150 - Math.cos(t * 0.05) * 11); ctx.moveTo(0, -150); ctx.lineTo(Math.sin(t * 0.6) * 16, -150 - Math.cos(t * 0.6) * 16); ctx.stroke();
    ctx.fillStyle = '#fff36a'; for (let r = 0; r < 4; r++) { ctx.fillRect(-16, -112 + r * 28, 8, 14); ctx.fillRect(8, -112 + r * 28, 8, 14); }
    ctx.restore();
  }
  function elTrain(cx, t, base, dusk) {
    const sx = cx * 0.2, y = base - 64;
    // street glow rising between the buildings
    K.dotFade(0, W, base - 130, base + 10, dusk ? '#fff36a' : '#ffe14a', 9, 0.6, sx);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = -((sx % 70) + 70); x < W + 70; x += 70) { ctx.moveTo(x, base + 20); ctx.lineTo(x, y + 26); ctx.arc(x + 35, y + 26, 35, Math.PI, 0); }
    ctx.stroke();
    K.inkRect(-4, y, W + 8, 8, dusk ? '#0e7a72' : '#19a89a', 1.25);
    const tx = ((t * 70 - sx) % 1700 + 1700) % 1700 - 320;
    for (let k = 0; k < 4; k++) {
      const x = tx + k * 66; if (x > W + 10 || x < -80) continue;
      ctx.beginPath(); ctx.rect(x, y - 24, 62, 24); inkFill(k === 3 ? '#e8222e' : '#ffb02e', 2);
      ctx.fillStyle = '#fff8c0'; for (let q = 0; q < 4; q++) ctx.fillRect(x + 5 + q * 14, y - 19, 10, 9);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y - 7, 62, 3);
    }
    ctx.fillStyle = 'rgba(255,244,150,0.5)'; ctx.beginPath(); ctx.moveTo(tx + 266, y - 12); ctx.lineTo(tx + 340, y - 26); ctx.lineTo(tx + 340, y + 4); ctx.fill();
  }
  function crane(x, base, h, t, seed) {
    // a tower crane in the skyline (the building site stretch)
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.rect(x - 8, base - h, 16, h); ctx.stroke();
    ctx.fillStyle = '#ffb02e'; ctx.fillRect(x - 8, base - h, 16, h);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); for (let y = base - h; y < base; y += 16) { ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y + 16); } ctx.stroke();
    const jib = 150 + H_(seed) * 60, sw = Math.sin(t * 0.2 + seed) * 0.05;
    ctx.save(); ctx.translate(x, base - h); ctx.rotate(sw);
    ctx.beginPath(); ctx.rect(-50, -12, jib + 50, 12); inkFill('#ffb02e', 1.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = -50; k < jib; k += 14) { ctx.moveTo(k, 0); ctx.lineTo(k + 7, -12); ctx.lineTo(k + 14, 0); } ctx.stroke();
    ctx.beginPath(); ctx.rect(-48, -4, 22, 18); inkFill('#e8222e', 1.2);
    const hx = jib * 0.7; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, 60); ctx.stroke();
    ctx.beginPath(); ctx.rect(hx - 26, 60, 52, 9); inkFill('#e8222e', 1.2);
    ctx.restore();
  }
  function scaffold(x, top, w, base) {
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); for (let xx = x; xx <= x + w; xx += w / 3) { ctx.moveTo(xx, top); ctx.lineTo(xx, base); } for (let y = top; y < base; y += 30) { ctx.moveTo(x, y); ctx.lineTo(x + w, y); } ctx.stroke();
    ctx.strokeStyle = '#ffb02e'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // one layer of buildings: no transform. par = how fast it scrolls, base = bottom y, pal = [[col, shade, hi]...]
  function layer(cx, t, par, base, hMin, hMax, pal, win, seedK, step, edge, detail, o) {
    const sx = cx * par, i0 = Math.floor(sx / step) - 2, i1 = Math.ceil((sx + W) / step) + 2;
    const neonP = o.neon ? 0.6 - o.neon * 0.45 : 0.6;
    for (let i = i0; i <= i1; i++) {
      const seed = i * 13 + seedK, w = Math.round(step * (0.7 + H_(seed) * 0.6)), x = Math.round(i * step - sx + (H_(seed + 1) - 0.5) * step * 0.3);
      if (x > W + 20 || x + w < -20) continue;
      const h = hMin + H_(seed + 2) * (hMax - hMin), top = Math.round(base - h), kind = Math.floor(H_(seed + 3) * 5);
      const [col, dk, hi] = pal[Math.floor(H_(seed + 4) * pal.length)];
      const shape = () => {
        ctx.beginPath(); ctx.rect(x, top, w, h + 40);
        if (kind === 0) { ctx.rect(x + w * 0.2, top - 18, w * 0.6, 19); ctx.rect(x + w * 0.35, top - 34, w * 0.3, 17); }
        else if (kind === 1) { ctx.moveTo(x + w * 0.3, top + 1); ctx.lineTo(x + w * 0.5, top - 60); ctx.lineTo(x + w * 0.7, top + 1); }
        else if (kind === 2) ctx.rect(x + w * 0.46, top - 50, 4, 51);
      };
      if (edge) { shape(); ctx.strokeStyle = INK; ctx.lineWidth = edge * 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineJoin = 'miter'; }
      shape(); ctx.fillStyle = col; ctx.fill();
      if (dk) { // the shadow side: a flat strip that breaks into dots
        const sw = w * 0.3; ctx.fillStyle = dk; ctx.fillRect(x + w - sw, top, sw, h + 40);
        K.dotFadeX(top, base + 40, x + w - sw - 30, x + w - sw, dk, 7, 0.55);
      }
      if (kind === 2 && Math.sin(t * 3 + i) > 0.2) { ctx.fillStyle = '#ff3b30'; circle(x + w * 0.46 + 2, top - 53, 4); ctx.fill(); }
      if (win) {
        const cols = Math.max(2, Math.floor(w / 17)), rows = Math.floor(h / 21), cw = w / cols;
        const ww = Math.round(cw * 0.5);
        // (batched: one path per colour, so a tower of windows is a handful of fills, not hundreds)
        const fills = new Map(), glint = new Path2D(), frames = detail ? new Path2D() : null;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const hv = H_(seed * 7 + r * 31 + c * 17), wx = Math.round(x + c * cw + cw * 0.26), wy = top + 12 + r * 21;
          if (hv < 0.3) continue;
          if (detail) frames.rect(wx - 1.5, wy - 1.5, ww + 3, 14);
          const fc = hv < 0.52 ? dk || col : hv > 0.95 ? '#ff7ac0' : hv > 0.88 ? '#7af0ff' : hv > 0.7 ? '#fff36a' : win;
          let pth = fills.get(fc); if (!pth) fills.set(fc, pth = new Path2D());
          pth.rect(wx, wy, ww, 11);
          if (detail && hv >= 0.52) { glint.moveTo(wx, wy + 6); glint.lineTo(wx + 5, wy); glint.lineTo(wx + 8, wy); glint.lineTo(wx, wy + 9); glint.closePath(); }
        }
        if (frames) { ctx.fillStyle = INK; ctx.fill(frames); }
        for (const [fc, pth] of fills) { ctx.fillStyle = fc; ctx.fill(pth); }
        if (detail) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill(glint); }
        if (detail) { // floor lines, a lit cap, ledges, and rooftop detail picked by the seed
          ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); for (let r = 1; r < rows; r += 2) { ctx.moveTo(x, top + 8 + r * 21); ctx.lineTo(x + w, top + 8 + r * 21); } ctx.stroke();
          K.inkRect(x - 3, top - 1, w + 6, 6, hi, 1);
          ctx.fillStyle = hi; for (let ly = top + 70; ly < base; ly += 84) ctx.fillRect(x - 2, ly, w + 4, 4);
          ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); for (let ly = top + 70; ly < base; ly += 84) ctx.rect(x - 2, ly, w + 4, 4); ctx.stroke();
          const dv = H_(seed + 9);
          if (kind === 0) { const fx = x + w * 0.5; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, top - 34); ctx.lineTo(fx, top - 62); ctx.stroke(); ctx.beginPath(); ctx.moveTo(fx, top - 62); ctx.lineTo(fx + 20, top - 56 + Math.sin(t * 5 + seed) * 2); ctx.lineTo(fx, top - 50); inkFill(['#ffe14a', '#e8222e', '#7af0ff'][((seed % 3) + 3) % 3], 1.2); }
          if (kind === 3 || kind === 4) { const qx = x + w * 0.78; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(qx, top); ctx.lineTo(qx, top - 12); ctx.stroke(); ctx.beginPath(); ctx.arc(qx, top - 16, 9, 0.5, 0.5 + Math.PI); ctx.closePath(); inkFill('#f2f2f2', 1.2); }
          if (dv < 0.3 && kind > 2) { // a water tank
            const tx = x + w * 0.3; ctx.beginPath(); ctx.rect(tx, top - 30, 22, 20); inkFill('#e08a2e', 1); ctx.beginPath(); ctx.moveTo(tx - 3, top - 30); ctx.lineTo(tx + 11, top - 42); ctx.lineTo(tx + 25, top - 30); ctx.closePath(); inkFill('#d8322e', 1);
            ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx + 3, top - 10); ctx.lineTo(tx + 1, top - 1); ctx.moveTo(tx + 19, top - 10); ctx.lineTo(tx + 21, top - 1); ctx.stroke();
          } else if (dv < 0.55 && kind > 2 && w > 90) { // a small billboard
            const bw = 62, bx = x + w * 0.5 - bw / 2, wd = ['POW!', 'ZAP', 'EAT', 'HERO', 'BAM!'][Math.floor(H_(seed + 12) * 5)];
            ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx + 10, top); ctx.lineTo(bx + 10, top - 12); ctx.moveTo(bx + bw - 10, top); ctx.lineTo(bx + bw - 10, top - 12); ctx.stroke();
            K.inkRect(bx, top - 38, bw, 26, ['#ffe14a', '#7af0ff', '#ff7ac0'][Math.floor(H_(seed + 13) * 3)], 1.25);
            ctx.font = K.disp(19); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e8222e'; ctx.fillText(wd, bx + bw / 2, top - 24);
          }
          if (dv > neonP && h > 150) { // a vertical neon sign
            const nx = x + 5, wd = ['HOTEL', 'DINER', 'COMICS', 'JAZZ', 'NEON', 'PIZZA'][Math.floor(H_(seed + 14) * (o.neon ? 6 : 4))], on = Math.sin(t * 5 + seed) > -0.8;
            ctx.fillStyle = INK; ctx.fillRect(nx, top + 16, 16, wd.length * 15 + 8); ctx.strokeStyle = on ? '#ff7ac0' : '#7a2a5a'; ctx.lineWidth = 1.5; ctx.strokeRect(nx + 1.5, top + 17.5, 13, wd.length * 15 + 5);
            ctx.font = K.disp(14); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = on ? '#7af0ff' : '#2a6a7a'; for (let q = 0; q < wd.length; q++) ctx.fillText(wd[q], nx + 8, top + 28 + q * 15);
          }
          if (o.neon && dv < 0.5 && w > 70) { // Neon Alley: a glowing sign board across the front
            const on = Math.sin(t * 7 + seed * 3) > -0.85, wd = ['OPEN', 'POW', 'EAT', 'NEON', 'HERO'][Math.floor(H_(seed + 15) * 5)], ny = top + 40 + Math.floor(H_(seed + 16) * 3) * 42;
            ctx.fillStyle = INK; ctx.fillRect(x + w * 0.15, ny, w * 0.6, 26);
            ctx.strokeStyle = on ? (seed % 2 ? '#ff7ac0' : '#7af0ff') : '#3a2a4a'; ctx.lineWidth = 2; ctx.strokeRect(x + w * 0.15 + 3, ny + 3, w * 0.6 - 6, 20);
            ctx.font = K.disp(16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = on ? (seed % 2 ? '#7af0ff' : '#ff7ac0') : '#3a3a5a'; ctx.fillText(wd, x + w * 0.45, ny + 14);
          }
        }
      }
    }
  }
  K.skyline = (cx, t, o = {}) => {
    const base = o.base === undefined ? 460 : o.base, n = o.n || 3, dusk = o.mode === 'dusk';
    const far = dusk ? [['#ffc24a'], ['#ff9a5a']] : o.neon ? [['#ff8ac8'], ['#7af0ff'], ['#8a7aff']] : [['#7aa4ff'], ['#ff8ac8'], ['#8a7aff']];
    const mid = dusk ? [['#f0562e', '#b8301e'], ['#e8307a', '#a81a52'], ['#ffa02a', '#d8701a'], ['#7a3ac8', '#4f1f96']]
      : [['#2f6fe8', '#1c3fa8'], ['#16a8b8', '#0c6f86'], ['#c83a9a', '#8a1f6a'], ['#6a4fe0', '#3f2aa0']];
    const near = dusk ? [['#8e1f4a', '#5a0f2e', '#ff7a8a'], ['#1f3f9a', '#12245e', '#6fb0ff'], ['#a8401a', '#6a240c', '#ffb04a'], ['#0e7a72', '#084a46', '#5fe0c0']]
      : [['#a01f6a', '#5e0f40', '#ff7ac0'], ['#0e7f8a', '#084a54', '#5fe0e0'], ['#c84a1e', '#7a2a0c', '#ffb04a'], ['#3a3fb8', '#1e2270', '#8a9aff'], ['#1a5fc0', '#0e3478', '#7ac0ff']];
    if (n >= 3) layer(cx, t, 0.06, base - 40, 160, 330, far, dusk ? '#fff3a0' : '#e8f4ff', 1, 90, 1, false, o);
    landmarks(cx, t, base, dusk, o);
    if (o.clock !== undefined && o.clockA !== 0) {
      // (o.clockA fades it out as the real clock tower comes on screen)
      const u = clamp(o.clock, 0, 1), a0 = ctx.globalAlpha;
      ctx.globalAlpha = a0 * (o.clockA === undefined ? 1 : clamp(o.clockA, 0, 1));
      clockTower(W * 0.72 - u * 60, base - 26 + u * 30, 1.2 + u * 0.9, t, dusk);
      ctx.globalAlpha = a0;
    }
    if (n >= 2) layer(cx, t, 0.14, base - 20, 120, 280, mid, '#ffe14a', 2, 120, 1.5, false, o);
    if (o.site) {
      // the building site: cranes and scaffolds in among the middle towers
      const sx = cx * 0.14, P = 520;
      for (let i = Math.floor((sx - 300) / P); i <= Math.ceil((sx + W + 300) / P); i++) {
        const x = i * P - sx + 140 + H_(i + 70) * 120;
        if (H_(i + 71) < 0.7) crane(x, base - 10, 210 + H_(i + 72) * 60, t, i);
        else scaffold(x - 40, base - 150, 90, base);
      }
    }
    elTrain(cx, t, base, dusk);
    layer(cx, t, 0.26, base, 90, 240, near, '#ffe14a', 3, 150, 2.2, true, o);
  };

  /* ---------- a near building and rooftop props (inside the camera transform) ---------- */
  K.facade = (x, top, w, o = {}) => {
    const seed = o.seed || Math.round(x), brick = o.col ? false : H_(seed) < 0.5, bottom = o.bottom || H + 20;
    const body = o.col ? '#3e7fb0' : brick ? COL.brick : COL.concrete, shade = o.col ? '#1f4a78' : brick ? COL.brickDark : COL.concreteDark, hi = brick ? COL.brickHi : '#8cc4e8';
    ctx.fillStyle = INK; ctx.fillRect(x - 3, top, w + 6, bottom - top);
    ctx.fillStyle = body; ctx.fillRect(x, top, w, bottom - top);
    // the shadow side: a flat dark strip that breaks up into dots
    const sw = Math.min(90, w * 0.22);
    ctx.fillStyle = shade; ctx.fillRect(x + w - sw, top, sw, bottom - top);
    K.dotFadeX(top, bottom, x + w - sw - 40, x + w - sw, shade, 8, 0.55);
    // a few inked brick clusters or panel seams, not every course
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
    if (brick) for (let k = 0; k < Math.floor(w * Math.min(bottom - top, 600) / 4200); k++) {
      const bx = x + 14 + H_(seed + k * 3) * (w - 60), by = top + 40 + H_(seed + k * 5 + 1) * (Math.min(bottom, top + 600) - top - 60);
      for (let r = 0; r < 3; r++) { const ox = (r % 2) * 9; ctx.moveTo(bx + ox, by + r * 7); ctx.lineTo(bx + ox + 16, by + r * 7); ctx.moveTo(bx + ox + 21, by + r * 7); ctx.lineTo(bx + ox + 30, by + r * 7); }
    } else for (let xx = x + 70; xx < x + w - 20; xx += 70) { ctx.moveTo(xx, top + 30); ctx.lineTo(xx, bottom); }
    ctx.stroke(); ctx.lineCap = 'butt';
    // windows
    const cols = Math.max(1, Math.floor((w - 20) / 50)), cw = (w - 20) / cols;
    for (let r = 0; ; r++) {
      const wy = top + 48 + r * 64;
      if (wy > bottom || wy > H + 40) break;
      for (let c = 0; c < cols; c++) {
        const wx = Math.round(x + 10 + c * cw + cw / 2 - 15), hv = H_(seed + r * 11 + c * 7), lit = hv > 0.45;
        ctx.fillStyle = INK; ctx.fillRect(wx - 4, wy - 4, 38, 46);
        ctx.fillStyle = lit ? '#ffe14a' : '#16307a'; ctx.fillRect(wx, wy, 30, 38);
        if (lit) {
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(wx, wy + 16); ctx.lineTo(wx + 16, wy); ctx.lineTo(wx + 24, wy); ctx.lineTo(wx, wy + 24); ctx.fill();
          ctx.fillStyle = (r + c) % 2 ? '#ff5a4a' : '#2fc4b0'; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 9, wy); ctx.quadraticCurveTo(wx + 8, wy + 22, wx, wy + 30); ctx.moveTo(wx + 30, wy); ctx.lineTo(wx + 21, wy); ctx.quadraticCurveTo(wx + 22, wy + 22, wx + 30, wy + 30); ctx.fill(); strokeInk(1.4);
          if (hv > 0.9) { ctx.fillStyle = INK; circle(wx + 15, wy + 31, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(wx + 9, wy + 27); ctx.lineTo(wx + 10, wy + 19); ctx.lineTo(wx + 14, wy + 25); ctx.moveTo(wx + 16, wy + 25); ctx.lineTo(wx + 20, wy + 19); ctx.lineTo(wx + 21, wy + 27); ctx.fill(); }
          else if (hv > 0.7) { circle(wx + 9, wy + 27, 7); ctx.fillStyle = '#2fae5a'; ctx.fill(); strokeInk(1.8); K.inkRect(wx + 4, wy + 31, 10, 7, '#e2562a', 0.9); }
        } else { ctx.strokeStyle = '#7ab4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + 5, wy + 14); ctx.lineTo(wx + 14, wy + 5); ctx.moveTo(wx + 5, wy + 22); ctx.lineTo(wx + 20, wy + 7); ctx.stroke(); }
        ctx.fillStyle = INK; ctx.fillRect(wx + 14, wy, 2.5, 38); ctx.fillRect(wx, wy + 18, 30, 2.5);
        K.inkRect(wx - 6, wy + 42, 42, 5, hi, 0.9);
        const dv = H_(seed + r * 17 + c * 29 + 5);
        if (dv < 0.22) { // a striped awning
          for (let q = 0; q < 6; q++) { ctx.fillStyle = q % 2 ? '#ffffff' : (brick ? '#19a89a' : '#e8222e'); ctx.beginPath(); ctx.moveTo(wx - 6 + q * 7, wy - 6); ctx.lineTo(wx + 1 + q * 7, wy - 6); ctx.lineTo(wx - 1 + q * 7.7, wy + 8); ctx.lineTo(wx - 9 + q * 7.7, wy + 8); ctx.closePath(); ctx.fill(); }
          ctx.beginPath(); ctx.moveTo(wx - 6, wy - 6); ctx.lineTo(wx + 36, wy - 6); ctx.lineTo(wx + 37.5, wy + 8); ctx.lineTo(wx - 9, wy + 8); ctx.closePath(); strokeInk(2);
        } else if (dv < 0.45) { // a flower box
          ctx.fillStyle = '#2fae5a'; ctx.beginPath(); for (let q = 0; q < 5; q++) { ctx.moveTo(wx + q * 8 + 4, wy + 38); ctx.arc(wx + q * 8 - 1, wy + 38, 5, 0, TAU); } ctx.fill(); strokeInk(1.4);
          for (let q = 0; q < 5; q++) { ctx.fillStyle = ['#ff5ab4', '#ffe14a', '#ffffff'][q % 3]; circle(wx + q * 8 - 1, wy + 35, 2.4); ctx.fill(); }
          K.inkRect(wx - 5, wy + 40, 40, 7, '#e08a2e', 0.9);
        }
      }
    }
    // a drainpipe, and a poster or two on the bare wall between the windows
    K.inkRect(x + 6, top + 13, 6, bottom - top, brick ? '#19a89a' : '#ffb02e', 0.9);
    ctx.fillStyle = INK; for (let y = top + 60; y < Math.min(bottom, H + 40); y += 90) ctx.fillRect(x + 3, y, 12, 4);
    if (cw > 62) for (let c = 1; c < cols; c += 2) if (H_(seed + c * 41) < 0.6) {
      const px = Math.round(x + 10 + c * cw - 13), py = top + 52 + Math.floor(H_(seed + c * 43) * 2) * 64, kind = Math.floor(H_(seed + c * 47) * 3);
      ctx.save(); ctx.translate(px + 13, py + 17); ctx.rotate((H_(seed + c) - 0.5) * 0.16);
      ctx.fillStyle = INK; ctx.fillRect(-11, -15, 26, 34); K.inkRect(-13, -17, 26, 34, ['#fff3a0', '#7af0ff', '#ff7ac0'][kind], 0.9);
      ctx.font = K.disp(10); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e8222e'; ctx.fillText(['WANTED', 'HEROES', 'POW!'][kind], 0, -10);
      if (kind === 0) { ctx.fillStyle = INK; circle(0, 3, 6); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(-5, 1, 10, 3); ctx.fillStyle = INK; circle(-2, 2.5, 1); ctx.fill(); circle(2, 2.5, 1); ctx.fill(); }
      else { K.star(0, 4, 8, 3.5, 0); inkFill(kind === 1 ? '#ff5a2e' : '#ffe14a', 0.6); }
      ctx.restore();
    }
    if (o.fire) {
      // a fire escape, in ink
      const fx = x + w * 0.62;
      ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
      for (let y = top + 90; y < Math.min(bottom, H + 130); y += 124) {
        ctx.strokeRect(fx - 40, y, 80, 3);
        ctx.beginPath(); for (let k = 0; k <= 8; k++) { ctx.moveTo(fx - 40 + k * 10, y); ctx.lineTo(fx - 40 + k * 10, y - 18); } ctx.moveTo(fx - 40, y - 18); ctx.lineTo(fx + 40, y - 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fx + 20, y); ctx.lineTo(fx - 20, y + 124); ctx.moveTo(fx + 28, y); ctx.lineTo(fx - 12, y + 124); ctx.stroke();
      }
    }
    if (o.sign) {
      // a yellow sign board with a red word
      const sw2 = Math.min(w - 32, 150);
      ctx.fillStyle = INK; ctx.fillRect(x + 20, top + 54, sw2, 40);
      K.inkRect(x + 16, top + 50, sw2, 40, '#ffe14a', 1.5);
      K.word(o.sign, x + 16 + sw2 / 2, top + 72, 26, '#e8222e', { lw: 0 });
    }
    // the cornice: a light band, a hard black shadow under it, a thick outline (the roof you run on reads at once)
    ctx.fillStyle = INK; ctx.fillRect(x, top + 12, w, 9);
    K.inkRect(x - 6, top, w + 12, 13, o.col ? '#fff3a8' : hi, 2);
    ctx.fillStyle = o.col ? '#ffffff' : '#fff3d6'; ctx.fillRect(x - 6, top, w + 12, 3);
  };
  K.ac = (x, y, w, h, t = 0) => {
    ctx.fillStyle = INK; ctx.fillRect(x + 4, y - h + 4, w, h);
    ctx.beginPath(); rr(x, y - h, w, h, 3); inkFill('#7fdcf0', 1.5);
    ctx.save(); ctx.beginPath(); rr(x, y - h, w, h, 3); ctx.clip(); K.dotFade(x, x + w, y - h * 0.4, y, '#1d8fb0', 6, 0.66); ctx.restore();
    ctx.fillStyle = INK; for (let k = 0; k < 3; k++) ctx.fillRect(x + 4, y - h + 6 + k * 5, w * 0.4, 2);
    const fx = x + w * 0.7, fy = y - h / 2, fr = Math.min(h, w * 0.5) * 0.36;
    circle(fx, fy, fr); inkFill('#0f5f7a', 1);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const a = t * 14 + k * TAU / 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * fr * 0.9, fy + Math.sin(a) * fr * 0.9); ctx.stroke(); }
  };
  K.waterTower = (x, y, s = 1) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 6 * s;
    const legs = () => { ctx.beginPath(); ctx.moveTo(x - 26 * s, y); ctx.lineTo(x - 20 * s, y - 50 * s); ctx.moveTo(x + 26 * s, y); ctx.lineTo(x + 20 * s, y - 50 * s); ctx.moveTo(x - 24 * s, y - 16 * s); ctx.lineTo(x + 22 * s, y - 40 * s); ctx.moveTo(x + 24 * s, y - 16 * s); ctx.lineTo(x - 22 * s, y - 40 * s); };
    legs(); ctx.stroke(); ctx.strokeStyle = '#19a89a'; ctx.lineWidth = 2.5 * s; legs(); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = INK; ctx.fillRect(x - 26 * s, y - 116 * s, 60 * s, 72 * s);
    ctx.beginPath(); ctx.rect(x - 30 * s, y - 120 * s, 60 * s, 72 * s); inkFill('#e08a2e', 1.5 * s);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 30 * s, y - 120 * s, 60 * s, 72 * s); ctx.clip(); K.dotFadeX(y - 120 * s, y - 48 * s, x + 6 * s, x + 30 * s, '#a8501a', 6, 0.66); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * s;
    for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x - 30 * s + k * 10 * s, y - 120 * s); ctx.lineTo(x - 30 * s + k * 10 * s, y - 48 * s); ctx.stroke(); }
    K.inkRect(x - 32 * s, y - 100 * s, 64 * s, 4 * s, '#19a89a', 1); K.inkRect(x - 32 * s, y - 70 * s, 64 * s, 4 * s, '#19a89a', 1);
    ctx.beginPath(); ctx.moveTo(x - 34 * s, y - 118 * s); ctx.lineTo(x, y - 150 * s); ctx.lineTo(x + 34 * s, y - 118 * s); ctx.closePath(); inkFill('#d8322e', 1.5 * s);
  };
  K.antenna = (x, y, h, t = 0) => {
    const path = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.moveTo(x - 12, y); ctx.lineTo(x, y - h * 0.6); ctx.lineTo(x + 12, y); ctx.moveTo(x - 10, y - h * 0.75); ctx.lineTo(x + 10, y - h * 0.75); ctx.moveTo(x - 7, y - h * 0.88); ctx.lineTo(x + 7, y - h * 0.88); };
    K.edge(path, '#ff8a2a', 2.5);
    const on = Math.sin(t * 3 + x) > 0;
    circle(x, y - h, 4.5); inkFill(on ? '#ff3b30' : '#6a1410', 1.2);
    if (on) { ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.moveTo(x + Math.cos(a) * 8, y - h + Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a) * 13, y - h + Math.sin(a) * 13); } ctx.stroke(); }
  };
  K.vent = (x, y, w, h) => {
    ctx.fillStyle = INK; ctx.fillRect(x + 4, y - h + 1, w, h);
    K.inkRect(x, y - h, w, h, '#ffb02e', 1.5);
    K.inkRect(x - 3, y - h - 6, w + 6, 7, '#d8572a', 1.5);
    ctx.fillStyle = INK; for (let k = 6; k < h - 4; k += 7) ctx.fillRect(x + 4, y - h + k, w - 8, 2);
  };
  K.billboard = (x, y, w, h, str, t = 0, o = {}) => {
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y); ctx.lineTo(x + w * 0.2, y - 40); ctx.moveTo(x + w * 0.8, y); ctx.lineTo(x + w * 0.8, y - 40); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillRect(x + 5, y - 35 - h, w, h);
    K.inkRect(x, y - 40 - h, w, h, o.bg || '#ffe14a', 2);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y - 40 - h, w, h); ctx.clip(); K.dotFade(x, x + w, y - 40 - h * 0.5, y - 36, '#ff9a2a', 8, 0.66); ctx.restore();
    K.word(str, x + w / 2, y - 40 - h / 2, Math.min(h * 0.5, 34), o.col || '#ff2e3e', { rot: -0.05, lw: 6, shadow: 2 });
    ctx.fillStyle = '#fff2b0'; for (let k = 0; k < 4; k++) { circle(x + w * (k + 0.5) / 4, y - 44 - h, 3); ctx.fill(); strokeInk(1.2); }
  };

  /* ---------- HUD: caption boxes, balloons, comic buttons (ink on light boxes; no purple) ---------- */
  const capsKeys = () => {
    const out = new Set();
    for (const id of [0, 1]) for (const w of ['act', 'right', 'left', 'up', 'down', 'lr']) { const k = K.key(id, w); if (k && k.toUpperCase() !== k) out.add(k); }
    return [...out];
  };
  // comic lettering is capitals, but the key names stay exactly as K.key gives them
  K.caps = str => {
    str = String(str);
    const keys = capsKeys();
    if (!keys.length) return str.toUpperCase();
    let out = '', i = 0;
    while (i < str.length) {
      const k = keys.find(q => str.startsWith(q, i));
      if (k) { out += k; i += k.length; } else { out += str[i].toUpperCase(); i++; }
    }
    return out;
  };
  const NARR = {};
  K.pillW = () => {
    const big = hudBig(), fs = big ? 22 : 18;
    ctx.font = K.disp(fs);
    return ctx.measureText(levelCode(G.levelIndex) + '  ' + G.level.def.name.toUpperCase()).width + 28;
  };
  K.pills = st => {
    const L = G.level, big = hudBig(), fs = big ? 22 : 18, h = big ? 36 : 30, w = K.pillW();
    K.box(14, 10, w, h, '#ffe14a', { sh: 4 });
    K.word(levelCode(G.levelIndex) + '  ' + L.def.name, 28, 10 + h / 2 + 1.5, fs, INK, { align: 'left', lw: 0 });
    if (L.def.rooms && L.def.roomCount) {
      const nf = big ? 17 : 13, nh = big ? 30 : 26, y = 10 + h + 8;
      const line = 'PART ' + (L.def.roomIndex + 1) + ' OF ' + L.def.roomCount + ':  ' + (L.def.narr || NARR[L.def.title] || String(L.def.title).toUpperCase() + '!');
      ctx.font = CK.body(nf, true);
      const nw = Math.max(ctx.measureText(line).width + 34, w + 40);
      K.box(14, y, nw, nh, '#fff3a8', { sh: 4 });
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(line, 28, y + nh / 2 + 1);
      return y + nh;
    }
    return 10 + h;
  };
  K.counter = (st, tm, n) => {
    const big = hudBig(), fs = big ? 20 : 15, h = big ? 38 : 30;
    ctx.font = CK.body(fs);
    const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 34, x0 = W - 14 - w, cy = 10 + h / 2 + 1;
    K.box(x0, 10, w, h, '#ffe14a', { sh: 4 });
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillStyle = st.waiting ? '#6a6070' : INK; ctx.fillText(tm, x0 + 15, cy);
    ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.fillText(n, x0 + w - 15, cy);
    return x0;
  };
  K.card = (x, y, w, h, fill = PAPER) => K.box(x, y, w, h, fill, { sh: 4, r: 3 });
  K.chip = (x, y, w, h, str, lit, held, z) => {
    const on = lit && Math.sin(G.clock * 12) > -0.3;
    K.box(x, y, w, h, lit ? (on ? '#ffe14a' : '#fff3a8') : held ? '#6ee08a' : '#ffffff', { r: 4, sh: lit || held ? 1.5 : 3, lw: 2.2 });
    let fs = 13 * (z || 1);
    ctx.font = CK.body(fs);
    while (fs > 8 && ctx.measureText(str).width > w - 8) { fs -= 0.5; ctx.font = CK.body(fs); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(str, x + w / 2, y + h / 2 + 1);
  };
  K.portrait = (id, x, y, q, kit, tilt) => {
    ctx.save(); ctx.translate(x + q / 2, y + q / 2); ctx.rotate(tilt);
    ctx.fillStyle = INK; ctx.fillRect(-q / 2 + 4, -q / 2 + 4, q, q);
    ctx.fillStyle = '#ffe14a'; ctx.fillRect(-q / 2, -q / 2, q, q);
    ctx.save(); ctx.beginPath(); ctx.rect(-q / 2, -q / 2, q, q); ctx.clip();
    ctx.fillStyle = id === 0 ? '#ff8a1e' : '#6fd0ff'; ctx.beginPath();
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + 0.2; ctx.moveTo(0, 6); ctx.lineTo(Math.cos(a - 0.1) * 80, 6 + Math.sin(a - 0.1) * 80); ctx.lineTo(Math.cos(a + 0.1) * 80, 6 + Math.sin(a + 0.1) * 80); }
    ctx.fill();
    K.suit(id, 0, q * 0.62, { s: q / 33, face: id === 0 ? 1 : -1, capeV: 0.4, kit });
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(-q / 2, -q / 2, q, q);
    ctx.restore();
  };
  K.panel = (id, job, w, h, z, kit) => {
    z = z || 1;
    const pw = Math.round(w * z), ph = Math.round(h * z), py = H - ph - 14, px = id === 0 ? 14 : W - 16 - pw;
    K.box(px, py, pw, ph, PAPER, { r: 3, sh: 5 });
    ctx.save(); rr(px, py, pw, ph, 3); ctx.clip(); ctx.fillStyle = PCOL[id]; ctx.fillRect(px, py, pw, 24 * z); ctx.fillStyle = INK; ctx.fillRect(px, py + 24 * z - 1, pw, 2.5); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 3); ctx.stroke();
    const q = 50 * z, s = (NAMES[id] + ' · ' + job + (K.quiet(id) ? ' (computer)' : '')).toUpperCase();
    const nx = id === 0 ? px + q + 12 : px + 12 * z;
    let fs = 16 * z; ctx.font = K.disp(fs);
    const room = pw - q - 22;
    while (fs > 10 && ctx.measureText(s).width > room) { fs -= 0.5; ctx.font = K.disp(fs); }
    K.word(s, nx, py + 13 * z, fs, '#ffffff', { align: 'left', lw: 3.5 });
    K.portrait(id, id === 0 ? px + 6 : px + pw - q - 6, py - q * 0.42, q, kit || K.JOBKIT[job] || null, id === 0 ? -0.06 : 0.06);
    return { x: px, y: py, w: pw, h: ph };
  };
  K.meter = (x, y, w, h, frac, col, mark) => {
    ctx.fillStyle = '#ffffff'; rr(x, y, w, h, 3); ctx.fill();
    const fw = Math.max(h, w * clamp(frac, 0, 1));
    if (frac > 0) { ctx.fillStyle = col && col !== '#ffffff' ? col : '#3d86e8'; rr(x, y, fw, h, 3); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; rr(x, y, w, h, 3); ctx.stroke();
    if (mark !== undefined) { ctx.fillStyle = '#e8222e'; ctx.fillRect(x + w * clamp(mark, 0, 1) - 1.5, y - 3, 3, h + 6); }
  };
  // the message line (gold help, taking a break): a caption box top middle when it fits, else under the captions
  K.drawMsg = (st, m, rightX = W - 14) => {
    if (!m) return;
    const big = hudBig();
    let fs = big ? 19 : 14;
    const h = big ? 34 : 28, str = K.caps(m.gold ? '★ ' + m.text : m.text);
    const left = 14 + K.pillW() + 10, right = rightX - 10;
    ctx.font = CK.body(fs);
    let w = ctx.measureText(str).width + 30, cx = W / 2 + 40, y = 10;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = G.level.def.rooms ? (big ? 104 : 86) : (big ? 56 : 48);
      while (w > W - 40 && fs > 11) { fs--; ctx.font = CK.body(fs); w = ctx.measureText(str).width + 30; }
    }
    ctx.globalAlpha = clamp((m.life - m.t) / 0.3, 0, 1);
    K.box(cx - w / 2, y, w, h, m.gold ? '#ffe14a' : '#fff3a8', { sh: 4 });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(str, cx, y + h / 2 + 1);
    ctx.globalAlpha = 1;
  };
  // prompts over the players: say(id, str, x, y, col, pulse) with screen px; white speech balloons with a tail pointing at
  // the hero (a hint balloon has a thin inner line in the player's colour). The placement is SHRUNK's: no overlaps, on screen.
  K.prompter = st => {
    const big = hudBig(), z = big ? 1.35 : 1, fs = 13.5 * z, yMin = big ? 100 : 84, yMax = H - Math.round(58 * z) - 26;
    const placed = [];
    const place = (w, h, x0, y0) => {
      const x = clamp(x0 - w / 2, 8, W - w - 8);
      let y = clamp(y0 - h - 10, yMin, yMax - h);
      for (const q of placed) if (Math.abs(q.y - y) < h + 14 && x < q.x + q.w && x + w > q.x) y = clamp(q.y - h - 16, yMin, yMax - h);
      placed.push({ x, y, w });
      return { x, y };
    };
    const balloon = (str, x, y, edge, sc) => {
      ctx.font = CK.body(fs);
      str = K.caps(str);
      const w = ctx.measureText(str).width + 26 * z, h = fs + 14 * z, o = place(w, h, x, y);
      ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(sc, sc); ctx.translate(-(o.x + w / 2), -(o.y + h / 2));
      K.balloon(o.x, o.y, w, h, x, { edge, lw: 4.5 });
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(str, o.x + w / 2, o.y + h / 2 + 1);
      ctx.restore();
    };
    return {
      say(id, str, x, y, col, pulse) {
        const hn = st.hints[id];
        if (hn) { ctx.globalAlpha = clamp((hn.life - hn.t) / 0.3, 0, 1); balloon(hn.text, x, y, PCOL[id], 1); ctx.globalAlpha = 1; return; }
        if (K.quiet(id) || !str) return;
        balloon(str, x, y, null, pulse ? 1 + 0.06 * Math.sin(G.clock * 14) : 1);
      },
    };
  };
  // the printed finish and the panel border: lighter on phones (no off-register copy)
  // (always light: the off-register copy of the whole canvas cost about 50x the rest of the frame on a slow CPU)
  K.page = () => CK.finish({ light: true });

  /* ---------- shared sounds ---------- */
  Sfx.extra.cityPop = function (p) { p = p || 1; this.tone(990 * p, 0.05, 'triangle', 0.035, 1480 * p); this.tone(1480 * p, 0.08, 'sine', 0.025, null, 0.04); };
  Sfx.extra.cityHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.cityCheer = function () { [392, 523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.03, null, i * 0.08)); };
  Sfx.extra.cityWhoosh = function (p) { p = p || 1; this.tone(260 * p, 0.18, 'sawtooth', 0.016, 1000 * p); };
  Sfx.extra.cityThud = function () { this.tone(110, 0.14, 'sine', 0.07, 55); this.tone(240, 0.05, 'triangle', 0.02, 160, 0.01); };
  Sfx.extra.cityBoing = function (p) { p = p || 1; this.tone(150 * p, 0.3, 'sine', 0.06, 480 * p); };
  Sfx.extra.cityAlarm = function () { [880, 660, 880, 660].forEach((f, i) => this.tone(f, 0.1, 'square', 0.03, null, i * 0.11)); };
  Sfx.extra.cityZap = function () { this.tone(1600, 0.08, 'sawtooth', 0.02, 400); };
  Sfx.extra.cityPow = function (p) { p = p || 1; this.tone(180 * p, 0.1, 'square', 0.05, 70 * p); this.tone(900 * p, 0.05, 'triangle', 0.03, 300 * p); };
  Sfx.extra.cityClang = function () { this.tone(620, 0.25, 'square', 0.03, 560); this.tone(930, 0.3, 'triangle', 0.03, 880, 0.01); this.tone(90, 0.2, 'sine', 0.05, 50); };
  return K;
})();
