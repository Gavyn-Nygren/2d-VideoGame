/* Pip & Bo - World 39 Crystal Caverns: shared helpers for the four cave levels (loads before them). */
'use strict';

/* The only global here is CAVE. One trip underground in four parts (Gavyn's order): down the old mine lift of Glimmer
   Gulch, up the angry crystal golem that guards the Crystal Cavern, away from the cave worm that bit it, and a gem dig
   that the grateful golem sets up as a thank-you. The look changes with depth so the four levels do not look alike:
   timber and rusty iron at the top of the mine, then wet grey limestone, then the Crystal Cavern itself, full of big
   angled crystals that glow from inside (teal, gold, rose, ice white and green). Dark, but always lit by the crystals.
   Purple is only a rare amethyst accent, never the main crystal colour and never in the HUD.
   Not a toddler world (Gavyn): the lift really drops, the golem is huge and angry, the worm has rings of crystal teeth.
   Nobody gets hurt on screen: a failure is a lurch, a tumble into the glow-mushrooms, a gulp-and-spit-out, a restart.
   The players-and-keys, effects and HUD helpers are World 31's SHRUNK kit (same names, same arguments: its header is
   the manual), so this file loads after js/levels/world31/shrunk-kit.js. K.panel and K.prompter are redrawn here in
   the charcoal of the menus (no indigo). Nothing here keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = CAVE; ... CAVE.defs.<mode> = {...}; })();

   From SHRUNK: K.FONT, K.lerp, K.smooth, K.hash, K.mmss, K.stubMap, K.BREAK, K.quiet, K.key, K.track, K.both, K.idle,
     K.actLabels, K.hide, K.unhide, K.place, K.fx, K.pop, K.part, K.spark, K.confetti, K.dust, K.poof, K.hint,
     K.hintOnce, K.msg, K.tickFx, K.star, K.drawParts, K.drawPops, K.chip, K.meter, K.medal, K.helpLine, K.drawMsg,
     K.hero.
   Own helpers
     K.goldHelp(st, text, life)          the gold-help banner (plays caveHelp, counts st.stats.helps).
     K.panel(id, job, w, h, z)           a player's HUD panel in the bottom corner (charcoal), returns its box.
     K.prompter(st)                      prompts over the players: P.say(id, str, x, y, col, pulse) (charcoal pills).
     K.mabel(st, line)                   Old Mabel shouting down the brass speaking tube: call once in setup; it types the
                                         line out for 5 s after the intro (K.drawMabel(st) in the HUD, K.tickMabel(st, dt)).
     K.ofx(st, id)                       the per-player outfit state the cave outfits read: { soot, crook, dust, slime,
                                         dirt, sack, hatDown, crown, glow } (all 0..1 or seconds). Levels write it.
   Crystals and rock
     K.crystal(x, y, h, ang, o)          one glowing crystal from its base at x, y, h long, leaning ang (radians, 0 up).
                                         o: col (a K.GLOW colour), w (h * 0.32), glow 0..1 (inner light), t (for the
                                         sparkle), ring 0..1 (a ring of light when struck), seed.
     K.cluster(x, y, s, seed, o)         a little bunch of 3 to 5 crystals. o: col (else picked by seed), t, glow, lean.
     K.rock(x, y, w, h, o)               a lumpy block of cave rock, top-left at x, y. o: col, dark, seed, wet (drips).
     K.stalactites(x0, x1, y, o)         a row hanging from y down. o: seed, len (40), col, dark, t (for drips).
     K.stalagmites(x0, x1, y, o)         a row standing on y. o: seed, len, col.
     K.back(camX, camY, t, o)            full screen, no transform: the far cave behind. o.zone 'mine' | 'rock' |
                                         'crystal' | 'cavern' | 'deep' | 'chamber', o.par (0.25), o.bright 0..1.
     K.glitter(st, dt, n)                drifting glitter dust: call in the tick; K.drawGlitter(st, cx, cy) in the draw.
     K.glowWorms(x0, x1, y, t, o)        a ceiling of glow-worms: dangling threads with blue-green lights. o.seed, o.n.
     K.mushrooms(x0, x1, y, t, o)        giant glow-mushrooms on the cavern floor. o.seed, o.s, o.squish (x, amount).
     K.bat(x, y, t, o)                   a bat, flapping. o: s, face, sit (folded on a rope or drum), seed.
     K.gem(x, y, r, t, o)                the glow gem pickup (a faceted gem in a halo). o: col, big, star, dim.
   The golem (39-2 draws its body from these; 39-3 and 39-4 use the hands and the face)
     K.golemFace(x, y, s, t, o)          its head front-on, centre at x, y (about 120 * s wide). o: calm 0..1 (red eyes
                                         to soft teal), look (-1..1), blink, roar 0..1 (mouth), chuckle.
     K.golemHand(x, y, s, t, o)          a huge crystal hand, wrist at x, y. o: ang, open 0..1, flip, calm, grip (a thing
                                         in it).
     K.golemBlock(x, y, w, h, o)         one of its crystal-studded stone blocks. o: calm, moss, seed, crack (a red
                                         crack that heals teal with calm), rot.
   The worm
     K.wormHead(x, y, r, t, o)           the round maw: three turning rings of crystal teeth around a glowing gullet.
                                         o: open 0..1, ang (which way it faces, 0 = right), spin (ring speed), cough.
     K.wormSeg(x, y, r, ang, o)          one plated body segment. o: seed, glow.
   Sounds (Sfx.play('caveGem')): caveTube (Old Mabel's speaking tube), caveGem (pitch p), caveHelp (K.goldHelp),
     caveCrystalRing, caveSting (stretch clear), caveGolemGroan, caveGolemSigh, caveWormRoarFar, caveWormRoarNear,
     caveThud, caveBoing, caveCheer. Levels add their own as Sfx.extra.<mode>Name.
   Music and ambience: this file adds its songs to SONGS (cavedeep, the 39-2 arrangements cavegolem0-3, cavechase and
     its key steps cavechase1-3 and cavechaseLow, cavedig and cavedigFast), its ambience to AMBIENCE (caveShaft,
     caveCavern, caveRumble, caveChamber) and MUSIC_BY_WORLD[38] = 'cavedeep', so js/music-tracks.js is left alone.
   Outfits: this file defines the four outfits (cavelift, cavegolem, caveworm, gemrush) and their parts (cv*).
   Colours: K.COL = { rock, rockDark, rockHi, wet, timber, timberDark, iron, soil, soilDark, soilHi, moss, ink, brass },
     K.GLOW = { teal, gold, rose, ice, green, amber, amethyst }. Gold (C.gold) is kept for help and "press now". */
const CAVE = (() => {
  const S = SHRUNK, K = { defs: {} };
  for (const k of ['FONT', 'lerp', 'smooth', 'hash', 'mmss', 'stubMap', 'BREAK', 'quiet', 'key', 'track', 'both', 'idle', 'actLabels',
    'hide', 'unhide', 'place', 'fx', 'pop', 'part', 'spark', 'confetti', 'dust', 'poof', 'hint', 'hintOnce', 'msg', 'tickFx', 'star',
    'drawParts', 'drawPops', 'chip', 'meter', 'medal', 'helpLine', 'drawMsg', 'hero']) K[k] = S[k];
  const TAU = Math.PI * 2, H_ = K.hash, FONT = K.FONT;
  const COL = K.COL = {
    rock: '#5a6472', rockDark: '#363d48', rockHi: '#7d8896', wet: '#4a5a66', timber: '#8a5e36', timberDark: '#553818', iron: '#6a5a50',
    soil: '#7a5638', soilDark: '#523824', soilHi: '#9a7250', moss: '#4f9a5a', ink: '#1c1a36', brass: '#d8a84a',
  };
  const GLOW = K.GLOW = { teal: '#4fe8d6', gold: '#ffd25a', rose: '#ff8fb4', ice: '#dff6ff', green: '#86ec7a', amber: '#ffb35a', amethyst: '#c49cff' };
  const GLOWS = [GLOW.teal, GLOW.gold, GLOW.rose, GLOW.ice, GLOW.green, GLOW.teal, GLOW.gold, GLOW.green];
  K.GLOWS = GLOWS;
  const CHAR = 'rgba(23,25,29,';
  const circ = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); };
  // a colour a bit lighter or darker ('#rrggbb' only)
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = v => clamp(Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)), 0, 255);
    return '#' + ((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1);
  };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  K.shade = shade; K.rgba = rgba;

  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('caveHelp');
  };

  /* ---------- HUD in charcoal ---------- */
  K.panel = (id, job, w, h, z) => {
    z = z || 1;
    const pw = Math.round(w * z), ph = Math.round(h * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = CHAR + '0.86)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    text(NAMES[id] + (job ? ' · ' + job : '') + (K.quiet(id) ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 13 * z, PCOL[id], 'left', 'body');
    return { x: px, y: py, w: pw, h: ph };
  };
  K.prompter = st => {
    const big = hudBig(), z = big ? 1.35 : 1, fs = 14 * z, yMin = big ? 100 : 84, yMax = H - Math.round(58 * z) - 18;
    const placed = [];
    const place = (w, h, x0, y0) => {
      const x = clamp(x0 - w / 2, 4, W - w - 4);
      let y = clamp(y0 - h, yMin, yMax - h);
      for (const q of placed) if (Math.abs(q.y - y) < h + 4 && x < q.x + q.w && x + w > q.x) y = clamp(q.y - h - 6, yMin, yMax - h);
      placed.push({ x, y, w });
      return { x, y };
    };
    return {
      say(id, str, x, y, col, pulse) {
        const hn = st.hints[id];
        if (hn) {
          ctx.font = FONT(fs);
          const w = ctx.measureText(hn.text).width + 22 * z, h = fs + 14 * z, o = place(w, h, x, y);
          ctx.globalAlpha = clamp((hn.life - hn.t) / 0.3, 0, 1);
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5;
          rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
          text(hn.text, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
          ctx.globalAlpha = 1;
          return;
        }
        if (K.quiet(id) || !str) return;
        col = col || C.gold;
        ctx.font = FONT(fs);
        const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(w, h, x, y);
        const sc = pulse ? 1 + 0.06 * Math.sin(G.clock * 14) : 1;
        ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(sc, sc);
        ctx.fillStyle = CHAR + '0.9)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
        text(str, 0, 0.5, fs, col, 'center', 'body');
        ctx.restore();
      },
    };
  };

  /* ---------- Old Mabel's speaking tube ---------- */
  K.mabel = (st, line) => { st.mab = { line, t: -0.4 }; };
  K.tickMabel = (st, dt) => { if (st.mab && G.introT <= 0) st.mab.t += dt; };
  K.horn = (x, y, s) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = COL.brass; ctx.strokeStyle = '#7a5a1a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, -3); ctx.lineTo(2, -3); ctx.lineTo(12, -11); ctx.lineTo(12, 11); ctx.lineTo(2, 3); ctx.lineTo(-14, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe29a'; ctx.fillRect(-12, -2, 12, 1.5);
    ctx.fillStyle = '#5a3a10'; ctx.beginPath(); ctx.ellipse(12, 0, 2.4, 11, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };
  K.drawMabel = st => {
    const m = st.mab;
    if (!m || m.t < 0 || m.t > 5.6) return;
    const big = hudBig(), z = big ? 1.3 : 1, n = Math.floor(clamp(m.t / 1.6, 0, 1) * m.line.length), str = '"' + m.line.slice(0, n) + (n < m.line.length ? '' : '"');
    if (n > 0 && n < m.line.length && Math.floor(m.t * 30) % 3 === 0 && !m.blip) { m.blip = true; Sfx.play('caveTube'); }
    ctx.globalAlpha = clamp((5.6 - m.t) / 0.4, 0, 1) * clamp(m.t / 0.25, 0, 1);
    const fs = 15 * z;
    ctx.font = FONT(fs);
    const w = ctx.measureText('"' + m.line + '"').width + 90 * z, h = 46 * z, x = W / 2 - w / 2, y = big ? 108 : 56;
    ctx.fillStyle = CHAR + '0.9)'; rr(x, y, w, h, 16 * z); ctx.fill();
    ctx.strokeStyle = COL.brass; ctx.lineWidth = 2; rr(x, y, w, h, 16 * z); ctx.stroke();
    K.horn(x + 28 * z, y + h / 2, z * 1.1);
    text('Old Mabel', x + 52 * z, y + 13 * z, 11 * z, COL.brass, 'left', 'body');
    text(str, x + 52 * z, y + 30 * z, fs, '#fff3d6', 'left', 'body');
    ctx.globalAlpha = 1;
  };

  /* ---------- per-player outfit state (soot, a crooked hat, slime...) ---------- */
  const OFX0 = { soot: 0, crook: 0, dust: 0, slime: 0, dirt: 0, sack: 0, hatDown: 0, crown: 0, glow: 1 };
  K.ofx = (st, id) => { if (!st.ofx) st.ofx = [Object.assign({}, OFX0), Object.assign({}, OFX0)]; return st.ofx[id]; };
  K.tickOfx = (st, dt) => { if (!st.ofx) return; for (const o of st.ofx) { o.crook = Math.max(0, o.crook - dt); o.dust = Math.max(0, o.dust - dt); o.slime = Math.max(0, o.slime - dt); o.hatDown = Math.max(0, o.hatDown - dt); } };
  // what an outfit part reads (null in the menus and previews: clean outfits)
  const ofxNow = id => {
    if (typeof G === 'undefined' || !G.mst || !G.mst.ofx || !G.level || !G.level.def || !/^(cavelift|cavegolem|caveworm|gemrush)$/.test(G.level.def.mode || '')) return OFX0;
    return G.mst.ofx[id] || OFX0;
  };

  /* ---------- crystals ---------- */
  K.crystal = (x, y, h, ang, o = {}) => {
    const col = o.col || GLOW.teal, w = o.w || h * 0.32, glow = o.glow === undefined ? 1 : o.glow, t = o.t || 0, seed = o.seed || 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    if (glow > 0) {
      const g = ctx.createRadialGradient(0, -h * 0.5, 2, 0, -h * 0.5, h * 0.9);
      g.addColorStop(0, rgba(col, 0.32 * glow)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(-h, -h * 1.4, h * 2, h * 1.8);
    }
    // the body: a long hexagonal prism seen side-on (three faces, light to dark), pointed tip
    const tip = h * 0.22;
    ctx.fillStyle = shade(col, -0.35);
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h + tip); ctx.lineTo(0, -h); ctx.lineTo(w / 2, -h + tip); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(col, 0.05);
    ctx.beginPath(); ctx.moveTo(-w * 0.12, 0); ctx.lineTo(-w * 0.12, -h + tip * 0.8); ctx.lineTo(0, -h); ctx.lineTo(w * 0.22, -h + tip); ctx.lineTo(w * 0.22, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.55);
    ctx.beginPath(); ctx.moveTo(-w * 0.38, -2); ctx.lineTo(-w * 0.38, -h + tip * 1.1); ctx.lineTo(-w * 0.2, -h + tip * 0.6); ctx.lineTo(-w * 0.2, -2); ctx.closePath(); ctx.fill();
    // inner light
    if (glow > 0) { ctx.fillStyle = rgba(shade(col, 0.6), 0.5 * glow); ctx.fillRect(-w * 0.1, -h * 0.75, w * 0.18, h * 0.6); }
    ctx.strokeStyle = rgba(shade(col, -0.6), 0.9); ctx.lineWidth = Math.max(1, w * 0.07);
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h + tip); ctx.lineTo(0, -h); ctx.lineTo(w / 2, -h + tip); ctx.lineTo(w / 2, 0); ctx.stroke();
    // a sparkle that travels up now and then
    const sp = ((t * 0.5 + H_(seed) * 7) % 3.2);
    if (sp < 1) { const yy = -h * (0.15 + sp * 0.75), a = Math.sin(sp * Math.PI); ctx.fillStyle = rgba('#ffffff', 0.9 * a); K.star(-w * 0.05, yy, w * 0.35 * a + 0.5, w * 0.1, t); ctx.fill(); }
    if (o.ring) { ctx.strokeStyle = rgba('#ffffff', 0.8 * (1 - o.ring)); ctx.lineWidth = 3; circ(0, -h * 0.5, h * (0.4 + o.ring * 0.9)); ctx.stroke(); }
    ctx.restore();
  };
  K.cluster = (x, y, s = 1, seed = 0, o = {}) => {
    const n = 3 + Math.floor(H_(seed) * 3), col = o.col || GLOWS[Math.floor(H_(seed + 1) * GLOWS.length)], lean = o.lean || 0;
    for (let k = 0; k < n; k++) {
      const u = (k - (n - 1) / 2), a = lean + u * 0.32 + (H_(seed + k * 3) - 0.5) * 0.25, h = (22 + H_(seed + k * 7) * 30) * s * (k === Math.floor(n / 2) ? 1.35 : 1);
      K.crystal(x + u * 7 * s, y, h, a, { col, t: o.t, glow: o.glow, seed: seed + k });
    }
  };
  K.rock = (x, y, w, h, o = {}) => {
    const col = o.col || COL.rock, dark = o.dark || COL.rockDark, seed = o.seed || 0;
    ctx.fillStyle = col; ctx.beginPath();
    const n = Math.max(4, Math.round(w / 26));
    ctx.moveTo(x, y + h);
    for (let k = 0; k <= n; k++) ctx.lineTo(x + (k / n) * w, y + (H_(seed + k) * 0.35) * Math.min(18, h * 0.3));
    ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(x, y + h * 0.72, w, h * 0.28);
    ctx.save(); ctx.beginPath(); ctx.moveTo(x, y + h); for (let k = 0; k <= n; k++) ctx.lineTo(x + (k / n) * w, y + (H_(seed + k) * 0.35) * Math.min(18, h * 0.3)); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < n; k++) { const cx0 = x + (k + 0.5) * w / n; ctx.beginPath(); ctx.moveTo(cx0, y + h * 0.15); ctx.lineTo(cx0 + 6, y + h * 0.4); ctx.lineTo(cx0 + 2, y + h * 0.6); ctx.lineTo(cx0 - 2, y + h * 0.6); ctx.lineTo(cx0 + 2, y + h * 0.4); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k <= n; k++) { const yy = y + (H_(seed + k) * 0.35) * Math.min(18, h * 0.3) + 1.5; k ? ctx.lineTo(x + (k / n) * w, yy) : ctx.moveTo(x, yy); } ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let k = 0; k < n; k++) { ctx.fillRect(x + (k + 0.2) * w / n, y + 6 + H_(seed + k * 5) * h * 0.4, w / n * 0.5, 2); }
    if (o.wet) { ctx.fillStyle = 'rgba(160,210,240,0.25)'; for (let k = 0; k < n; k++) ctx.fillRect(x + (k + 0.5) * w / n, y + 4, 2, h * (0.3 + H_(seed + k * 9) * 0.5)); }
  };
  K.stalactites = (x0, x1, y, o = {}) => {
    const seed = o.seed || 0, len = o.len || 40, col = o.col || COL.rock, t = o.t || 0;
    for (let x = x0, k = 0; x < x1; k++) {
      const w = 14 + H_(seed + k) * 22, l = len * (0.4 + H_(seed + k * 3) * 0.9);
      ctx.fillStyle = k % 2 ? col : shade(col, -0.15);
      ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x + w / 2, y + l); ctx.lineTo(x + w, y - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(x + w * 0.6, y - 2); ctx.lineTo(x + w / 2, y + l); ctx.lineTo(x + w, y - 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 1.5, y); ctx.lineTo(x + w / 2, y + l - 2); ctx.stroke();
      if (o.drip && H_(seed + k * 11) > 0.6) { const dy = ((t * 80 + H_(k) * 200) % 160); ctx.fillStyle = 'rgba(170,220,255,' + (0.7 * (1 - dy / 160)) + ')'; circ(x + w / 2, y + l + dy, 1.8); ctx.fill(); }
      x += w * 0.8;
    }
  };
  K.stalagmites = (x0, x1, y, o = {}) => {
    const seed = o.seed || 0, len = o.len || 40, col = o.col || COL.rock;
    for (let x = x0, k = 0; x < x1; k++) {
      const w = 18 + H_(seed + k) * 26, l = len * (0.3 + H_(seed + k * 3) * 1.0);
      ctx.fillStyle = k % 2 ? col : shade(col, -0.12);
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x + w * 0.45, y - l * 0.5, x + w / 2, y - l); ctx.quadraticCurveTo(x + w * 0.55, y - l * 0.5, x + w, y + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(x + w * 0.55, y + 2); ctx.quadraticCurveTo(x + w * 0.52, y - l * 0.4, x + w / 2, y - l); ctx.quadraticCurveTo(x + w * 0.55, y - l * 0.5, x + w, y + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.quadraticCurveTo(x + w * 0.45, y - l * 0.5, x + w / 2, y - l + 2); ctx.stroke();
      x += w * (0.9 + H_(seed + k * 7) * 1.4);
    }
  };

  /* ---------- the far cave (full screen, no transform) ---------- */
  const ZONES = {
    mine: { top: '#2a241e', bot: '#4a3a2a', far: '#3a3026', near: '#2a2018', glows: [GLOW.amber], lamp: true },
    rock: { top: '#1e2a32', bot: '#3a4a52', far: '#33434c', near: '#25323a', glows: [GLOW.teal, GLOW.ice] },
    crystal: { top: '#182a34', bot: '#24444e', far: '#2a4a54', near: '#1c343c', glows: [GLOW.teal, GLOW.gold, GLOW.rose, GLOW.green] },
    cavern: { top: '#142a36', bot: '#26505a', far: '#2c5460', near: '#1c3a44', glows: [GLOW.teal, GLOW.gold, GLOW.rose, GLOW.ice, GLOW.green] },
    deep: { top: '#16222a', bot: '#2c3a40', far: '#2a3a42', near: '#1a262c', glows: [GLOW.teal, GLOW.green, GLOW.gold] },
    chamber: { top: '#3a2a1e', bot: '#5a4028', far: '#4a3624', near: '#3a2a1c', glows: [GLOW.gold, GLOW.teal, GLOW.rose] },
  };
  K.ZONES = ZONES;
  K.back = (camX, camY, t, o = {}) => {
    const Z = ZONES[o.zone || 'cavern'], par = o.par === undefined ? 0.25 : o.par, br = o.bright === undefined ? 1 : o.bright;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, Z.top); g.addColorStop(1, Z.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // far glowing crystals (soft blobs of light)
    for (let i = 0; i < 9; i++) {
      const span = W + 300, x = ((H_(i * 13) * span - camX * par * 0.5) % span + span) % span - 150;
      const y = ((H_(i * 7 + 3) * (H + 200) - camY * par * 0.5) % (H + 200) + H + 200) % (H + 200) - 100;
      const col = Z.glows[i % Z.glows.length], r = 50 + H_(i * 5) * 80;
      const rg = ctx.createRadialGradient(x, y, 2, x, y, r);
      rg.addColorStop(0, rgba(col, 0.22 * br)); rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // two layers of far rock: pillars and hanging teeth
    for (const [p, col, step, k0] of [[par, Z.far, 260, 0], [par * 1.8, Z.near, 200, 50]]) {
      const ox = camX * p, oy = camY * p;
      ctx.fillStyle = col;
      const i0 = Math.floor(ox / step) - 1;
      for (let i = i0; i < i0 + W / step + 3; i++) {
        const x = i * step - ox, w = 40 + H_(i + k0) * 70, hx = H_(i * 3 + k0);
        const rim = rgba(shade(Z.glows[(((i + k0) % Z.glows.length) + Z.glows.length) % Z.glows.length], 0.2), 0.18 * br);
        if (hx > 0.45) { // a pillar floor to roof, lit on one edge by the far crystals, with rock strata
          ctx.beginPath(); ctx.moveTo(x, -20); ctx.quadraticCurveTo(x + w * 0.5 + 10, H * 0.5 - oy % 50, x + w * 0.2, H + 20); ctx.lineTo(x + w * 1.1, H + 20); ctx.quadraticCurveTo(x + w * 0.7, H * 0.5, x + w, -20); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = rim; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, -20); ctx.quadraticCurveTo(x + w * 0.5 + 10, H * 0.5 - oy % 50, x + w * 0.2, H + 20); ctx.stroke();
          ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let q = 0; q < 6; q++) { const sy = ((H_(i * 17 + q + k0) * H - oy * 0.5) % H + H) % H; ctx.fillRect(x + w * 0.35, sy, w * 0.55, 2); }
          ctx.fillStyle = col;
        } else { // teeth from the roof and the floor
          const l = 60 + H_(i * 5 + k0) * 120;
          ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + w / 2, l); ctx.lineTo(x + w, -10); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + 20, H + 10); ctx.lineTo(x + 20 + w / 2, H - l * 0.8); ctx.lineTo(x + 20 + w, H + 10); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + w / 2, l); ctx.moveTo(x + 20, H + 10); ctx.lineTo(x + 20 + w / 2, H - l * 0.8); ctx.stroke();
        }
        if (Z.lamp && H_(i * 9 + k0) > 0.6) {
          // an old mine lantern on a beam
          const ly = ((H_(i * 11) * H - oy) % H + H) % H;
          ctx.fillStyle = Z.near; ctx.fillRect(x - 10, ly - 3, w + 20, 6);
          const lg = ctx.createRadialGradient(x + w / 2, ly + 10, 1, x + w / 2, ly + 10, 40); lg.addColorStop(0, 'rgba(255,190,90,' + 0.4 * br + ')'); lg.addColorStop(1, 'rgba(255,190,90,0)');
          ctx.fillStyle = lg; ctx.fillRect(x + w / 2 - 40, ly - 30, 80, 80);
          ctx.fillStyle = '#ffcf6a'; rr(x + w / 2 - 3, ly + 4, 6, 9, 2); ctx.fill(); ctx.fillStyle = col;
        }
      }
    }
  };

  /* ---------- glitter dust, glow-worms, mushrooms, bats ---------- */
  K.glitter = (st, dt, n = 40) => {
    if (!st.glit) st.glit = [];
    const G2 = st.glit;
    while (G2.length < n) G2.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 10, vy: -4 - Math.random() * 8, ph: Math.random() * TAU, col: GLOWS[Math.floor(Math.random() * GLOWS.length)] });
    for (const q of G2) { q.x += q.vx * dt; q.y += q.vy * dt; q.ph += dt * 3; if (q.y < -10) { q.y = H + 10; q.x = Math.random() * W; } if (q.x < -10) q.x = W + 10; if (q.x > W + 10) q.x = -10; }
  };
  // drawn in screen px; the dust drifts against the camera a little (cx, cy: how far the camera moved, for parallax)
  K.drawGlitter = (st, cx = 0, cy = 0) => {
    if (!st.glit) return;
    for (const q of st.glit) {
      const x = ((q.x - cx * 0.4) % (W + 20) + W + 20) % (W + 20) - 10, y = ((q.y - cy * 0.4) % (H + 20) + H + 20) % (H + 20) - 10, a = 0.35 + 0.35 * Math.sin(q.ph);
      ctx.fillStyle = rgba(q.col, a); ctx.fillRect(x, y, 2, 2);
    }
  };
  K.glowWorms = (x0, x1, y, t, o = {}) => {
    const seed = o.seed || 0, n = o.n || Math.round((x1 - x0) / 22);
    for (let k = 0; k < n; k++) {
      const x = x0 + (k + H_(seed + k)) * (x1 - x0) / n, l = 10 + H_(seed + k * 3) * 34, a = 0.55 + 0.4 * Math.sin(t * 1.5 + k * 1.7);
      ctx.strokeStyle = 'rgba(190,240,230,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(t + k) * 1.5, y + l); ctx.stroke();
      ctx.fillStyle = 'rgba(120,255,220,' + (a * 0.25) + ')'; circ(x, y + l, 5); ctx.fill();
      ctx.fillStyle = 'rgba(170,255,235,' + a + ')'; circ(x, y + l, 1.8); ctx.fill();
    }
  };
  K.mushrooms = (x0, x1, y, t, o = {}) => {
    const seed = o.seed || 0, s = o.s || 1;
    for (let x = x0, k = 0; x < x1; k++) {
      const w = (50 + H_(seed + k) * 70) * s, h = (30 + H_(seed + k * 5) * 50) * s, col = [GLOW.teal, GLOW.green, GLOW.rose, GLOW.gold][Math.floor(H_(seed + k * 7) * 4)];
      let sq = 0; if (o.squish && Math.abs(o.squish.x - (x + w / 2)) < w / 2 + 10) sq = o.squish.a;
      ctx.fillStyle = '#d8e8d0'; ctx.fillRect(x + w / 2 - 6 * s, y - h * (1 - sq * 0.3), 12 * s, h * (1 - sq * 0.3));
      const g = ctx.createRadialGradient(x + w / 2, y - h, 2, x + w / 2, y - h, w * 0.9);
      g.addColorStop(0, rgba(col, 0.35)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - w * 0.4, y - h - w * 0.7, w * 1.8, w * 1.4);
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x + w / 2, y - h * (1 - sq * 0.3), w / 2 * (1 + sq * 0.2), h * 0.42 * (1 - sq * 0.4), 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (let d = 0; d < 3; d++) { circ(x + w * (0.3 + d * 0.2), y - h * (1.15 - sq * 0.3) + (d % 2) * 4, 3 * s); ctx.fill(); }
      x += w * (0.85 + H_(seed + k * 9) * 0.8);
    }
  };
  K.bat = (x, y, t, o = {}) => {
    const s = o.s || 1, f = o.face || 1, seed = o.seed || 0, flap = o.sit ? 0.1 : Math.sin(t * 18 + seed * 5);
    ctx.save(); ctx.translate(x, y); ctx.scale(f * s, s);
    ctx.fillStyle = '#2a2430';
    if (o.sit) {
      ctx.beginPath(); ctx.ellipse(0, 4, 5, 8, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-8, 10); ctx.lineTo(-2, 6); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(5, -2); ctx.lineTo(8, 10); ctx.lineTo(2, 6); ctx.closePath(); ctx.fill();
    } else {
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sd * 8, -6 - flap * 8, sd * 18, -2 - flap * 10); ctx.lineTo(sd * 13, 2 - flap * 3); ctx.lineTo(sd * 8, 0 - flap * 2); ctx.lineTo(sd * 4, 4); ctx.closePath(); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, 1, 4.5, 5.5, 0, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-4, -8); ctx.lineTo(-1, -5); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(4, -8); ctx.lineTo(1, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd25a'; circ(-1.6, o.sit ? -1 : -1, 1.1); ctx.fill(); circ(1.6, o.sit ? -1 : -1, 1.1); ctx.fill();
    ctx.restore();
  };
  K.gem = (x, y, r, t, o = {}) => {
    const col = o.col || (o.star ? GLOW.gold : o.big ? GLOW.rose : GLOW.teal), bob = o.still ? 0 : Math.sin(t * 3 + x * 0.01) * 2, dim = o.dim || 0;
    y += bob;
    const a = 1 - dim * 0.7;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.4);
    g.addColorStop(0, rgba(col, 0.55 * a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    ctx.globalAlpha = a;
    if (o.star) { ctx.fillStyle = col; K.star(x, y, r * 1.25, r * 0.55, t * 0.5); ctx.fill(); ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#fff6c8'; K.star(x - r * 0.15, y - r * 0.15, r * 0.5, r * 0.22, t * 0.5); ctx.fill(); ctx.globalAlpha = 1; return; }
    // a cut gem: a crown on top, a point below
    ctx.fillStyle = shade(col, -0.3);
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.2); ctx.lineTo(x - r * 0.55, y - r * 0.75); ctx.lineTo(x + r * 0.55, y - r * 0.75); ctx.lineTo(x + r, y - r * 0.2); ctx.lineTo(x, y + r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(col, 0.2);
    ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.75); ctx.lineTo(x + r * 0.1, y - r * 0.75); ctx.lineTo(x - r * 0.15, y - r * 0.2); ctx.lineTo(x - r, y - r * 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(col, 0.55);
    ctx.beginPath(); ctx.moveTo(x - r * 0.15, y - r * 0.2); ctx.lineTo(x + r * 0.45, y - r * 0.2); ctx.lineTo(x, y + r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(col, -0.65); ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.2); ctx.lineTo(x - r * 0.55, y - r * 0.75); ctx.lineTo(x + r * 0.55, y - r * 0.75); ctx.lineTo(x + r, y - r * 0.2); ctx.lineTo(x, y + r); ctx.closePath(); ctx.stroke();
    const sp = (t * 1.3 + x * 0.003) % 2;
    if (sp < 0.5) { ctx.fillStyle = 'rgba(255,255,255,' + Math.sin(sp * 2 * Math.PI) + ')'; K.star(x - r * 0.3, y - r * 0.45, r * 0.55, r * 0.15, 0); ctx.fill(); }
    ctx.globalAlpha = 1;
  };

  /* ---------- the golem ---------- */
  // red (angry) to soft teal (calm)
  const calmCol = (calm, a = 1) => { const u = clamp(calm, 0, 1); const r = Math.round(K.lerp(255, 90, u)), g = Math.round(K.lerp(70, 240, u)), b = Math.round(K.lerp(60, 220, u)); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
  K.calmCol = calmCol;
  K.golemBlock = (x, y, w, h, o = {}) => {
    const seed = o.seed || 0;
    ctx.save(); if (o.rot) { ctx.translate(x + w / 2, y + h / 2); ctx.rotate(o.rot); ctx.translate(-x - w / 2, -y - h / 2); }
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#7a8494'); g.addColorStop(1, '#4a5260');
    ctx.fillStyle = g;
    const c = Math.min(w, h) * 0.18;
    ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a303a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x + c, y + 3, w - c * 2, Math.min(8, h * 0.12));
    // little crystal studs
    const n = Math.max(1, Math.round(w * h / 9000));
    for (let k = 0; k < n; k++) {
      const sx = x + 10 + H_(seed + k * 3) * (w - 20), sy = y + 14 + H_(seed + k * 5) * (h - 20), col = GLOWS[Math.floor(H_(seed + k * 7) * GLOWS.length)];
      K.crystal(sx, sy, 10 + H_(seed + k) * 12, (H_(seed + k * 11) - 0.5) * 1.2, { col, glow: 0.6 * (0.4 + 0.6 * (o.calm || 0)), seed: seed + k, t: o.t });
    }
    if (o.moss) { ctx.fillStyle = COL.moss; for (let k = 0; k < w / 10; k++) { const mx = x + k * 10 + H_(seed + k) * 6; ctx.beginPath(); ctx.ellipse(mx, y + 2, 7, 4 + H_(seed + k * 2) * 3, 0, 0, TAU); ctx.fill(); } }
    if (o.crack !== undefined) {
      const cc = calmCol(o.crack, 0.95);
      ctx.strokeStyle = cc; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.3); ctx.lineTo(x + w * 0.4, y + h * 0.45); ctx.lineTo(x + w * 0.35, y + h * 0.6); ctx.lineTo(x + w * 0.6, y + h * 0.75);
      ctx.stroke();
    }
    ctx.restore();
  };
  K.golemFace = (x, y, s, t, o = {}) => {
    const calm = clamp(o.calm || 0, 0, 1), look = o.look || 0, roar = clamp(o.roar || 0, 0, 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // a big squarish head of grey stone with crystal growths on top
    const g = ctx.createLinearGradient(0, -70, 0, 70);
    g.addColorStop(0, '#8a94a4'); g.addColorStop(1, '#4e5664');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-58, -52); ctx.lineTo(-40, -68); ctx.lineTo(40, -68); ctx.lineTo(58, -52); ctx.lineTo(62, 30); ctx.lineTo(40, 62); ctx.lineTo(-40, 62); ctx.lineTo(-62, 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a303a'; ctx.lineWidth = 4; ctx.stroke();
    for (let k = 0; k < 5; k++) K.crystal(-36 + k * 18, -64, 26 + (k % 2) * 16, (k - 2) * 0.22, { col: k % 2 ? GLOW.teal : GLOW.gold, glow: 0.4 + calm * 0.6, seed: k, t });
    // brow
    ctx.fillStyle = '#3e4552'; ctx.beginPath(); ctx.moveTo(-52, -22 - (1 - calm) * 6); ctx.lineTo(-8, -12 + (1 - calm) * 4); ctx.lineTo(-8, -4); ctx.lineTo(-52, -10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(52, -22 - (1 - calm) * 6); ctx.lineTo(8, -12 + (1 - calm) * 4); ctx.lineTo(8, -4); ctx.lineTo(52, -10); ctx.closePath(); ctx.fill();
    // eyes: glowing, red when angry, teal when calm
    const eye = calmCol(calm), blink = o.blink ? 0.15 : 1, lx = look * 6;
    for (const sd of [-1, 1]) {
      const ex = sd * 28 + lx, ey = 6;
      const eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, 26); eg.addColorStop(0, calmCol(calm, 0.6)); eg.addColorStop(1, calmCol(calm, 0));
      ctx.fillStyle = eg; ctx.fillRect(ex - 26, ey - 26, 52, 52);
      ctx.fillStyle = '#1a1c22'; ctx.beginPath(); ctx.ellipse(ex, ey, 14, 11, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = eye; ctx.beginPath(); ctx.ellipse(ex, ey, 9, 7 * blink, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; circ(ex - 3, ey - 2 * blink, 2.2 * blink); ctx.fill();
    }
    // mouth: a crack of light, open when it roars or chuckles
    const mo = roar * 22 + (o.chuckle ? (Math.abs(Math.sin(t * 14)) * 8) : 0);
    ctx.fillStyle = '#1a1c22'; ctx.beginPath(); ctx.moveTo(-30, 36); ctx.lineTo(30, 36); ctx.lineTo(24, 40 + mo); ctx.lineTo(-24, 40 + mo); ctx.closePath(); ctx.fill();
    ctx.fillStyle = calmCol(calm, 0.8); ctx.fillRect(-20, 37, 40, 2 + mo * 0.5);
    ctx.restore();
  };
  K.golemHand = (x, y, s, t, o = {}) => {
    const open = clamp(o.open === undefined ? 1 : o.open, 0, 1), calm = o.calm || 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.ang || 0); ctx.scale(o.flip ? -s : s, s);
    // the palm: a slab with crystal knuckles; four fingers curl from open (flat) to closed (a fist)
    const g = ctx.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, '#848ea0'); g.addColorStop(1, '#4e5664');
    ctx.fillStyle = g; rr(-10, -26, 80, 52, 14); ctx.fill(); ctx.strokeStyle = '#2a303a'; ctx.lineWidth = 4; rr(-10, -26, 80, 52, 14); ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const fy = -20 + k * 13, curl = (1 - open) * 1.9;
      ctx.save(); ctx.translate(68, fy + 6); ctx.rotate(curl);
      ctx.fillStyle = k % 2 ? '#6a7484' : '#788294'; rr(0, -6, 38, 12, 6); ctx.fill(); ctx.strokeStyle = '#2a303a'; ctx.lineWidth = 3; rr(0, -6, 38, 12, 6); ctx.stroke();
      ctx.restore();
    }
    // thumb
    ctx.save(); ctx.translate(20, -26); ctx.rotate(-0.6 - (1 - open) * 0.8); ctx.fillStyle = '#7a8494'; rr(0, -7, 34, 14, 7); ctx.fill(); ctx.strokeStyle = '#2a303a'; ctx.lineWidth = 3; rr(0, -7, 34, 14, 7); ctx.stroke(); ctx.restore();
    K.crystal(10, -24, 18, -0.3, { col: GLOW.teal, glow: 0.4 + 0.6 * calm, t }); K.crystal(40, -24, 14, 0.2, { col: GLOW.gold, glow: 0.4 + 0.6 * calm, t, seed: 3 });
    ctx.restore();
  };

  /* ---------- the worm ---------- */
  K.wormHead = (x, y, r, t, o = {}) => {
    const open = clamp(o.open === undefined ? 1 : o.open, 0, 1), ang = o.ang || 0, spin = o.spin === undefined ? 1 : o.spin;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    // the collar of plates
    ctx.fillStyle = '#4a4440'; circ(-r * 0.25, 0, r * 1.08); ctx.fill();
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; ctx.fillStyle = k % 2 ? '#6a625a' : '#5a524c'; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.24); ctx.lineTo(r * 1.12, -r * 0.14); ctx.lineTo(r * 1.12, r * 0.14); ctx.lineTo(r * 0.7, r * 0.24); ctx.closePath(); ctx.fill(); K.crystal(r * 1.05, 0, r * 0.22, Math.PI / 2, { col: k % 3 ? GLOW.teal : GLOW.gold, glow: 0.5, seed: k, t }); ctx.restore(); }
    // the maw: a dark disc with a glowing gullet
    const mr = r * (0.42 + open * 0.42);
    const gg = ctx.createRadialGradient(r * 0.05, 0, 2, r * 0.05, 0, mr);
    gg.addColorStop(0, o.cough ? '#ffe8a0' : '#ffb06a'); gg.addColorStop(0.25, '#c8503a'); gg.addColorStop(0.6, '#3a1418'); gg.addColorStop(1, '#140808');
    ctx.fillStyle = gg; circ(0, 0, mr); ctx.fill();
    // three rings of crystal teeth, turning
    for (let ring = 0; ring < 3; ring++) {
      const rr2 = mr * (1 - ring * 0.24), n = 16 - ring * 3, rot = t * spin * (ring % 2 ? -0.8 : 1.1) + ring;
      for (let k = 0; k < n; k++) {
        const a = rot + k / n * TAU, tl = r * (0.16 - ring * 0.03) * (0.6 + 0.4 * open);
        ctx.save(); ctx.rotate(a); ctx.translate(rr2, 0);
        ctx.fillStyle = ring === 0 ? '#eaf8ff' : ring === 1 ? '#bfeff0' : '#9fe0e0';
        ctx.beginPath(); ctx.moveTo(0, -tl * 0.45); ctx.lineTo(-tl, 0); ctx.lineTo(0, tl * 0.45); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(30,40,50,0.6)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  };
  K.wormSeg = (x, y, r, ang, o = {}) => {
    const seed = o.seed || 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#7a7068'); g.addColorStop(1, '#3a3430');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 0.82, 0, -2.4, -0.7); ctx.stroke();
    // crystal plates along the back
    for (let k = -1; k <= 1; k++) K.crystal(k * r * 0.3, -r * 0.9, r * (0.34 + H_(seed + k) * 0.2), k * 0.3, { col: (seed + k) % 3 ? GLOW.teal : GLOW.green, glow: o.glow === undefined ? 0.5 : o.glow, seed: seed + k });
    ctx.restore();
  };

  /* ---------- outfit parts and the four outfits ----------
     Pip still reads as orange and Bo as blue: no blue or navy on Pip, no orange or red on Bo. Pip's sprout and Bo's
     ears stay visible, and they never wear the same hat. Each part reads ofxNow(c.id) for its messy state. */
  const INK = OF_INK;
  // soot (39-1) and dirt (39-4) smudges on the body: a few dark blotches that grow with the amount
  const smudge = (c, amt, col) => {
    if (amt <= 0.02) return;
    const g = c.g; g.save(); ofBodyClip(g);
    g.fillStyle = col;
    const spots = [[-6, -10, 3.4], [5, -6, 3], [-2, -3, 2.6], [7, -13, 2.2], [-8, -4, 2.4], [2, -11, 2]];
    const n = Math.ceil(clamp(amt, 0, 1) * spots.length);
    for (let k = 0; k < n; k++) { const [x, y, r] = spots[k]; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0.4, 0, Math.PI * 2); g.fill(); }
    g.restore();
  };
  // a hat drawn tilted a little when crooked (seconds left in fx.crook) and pushed down over the eyes (fx.hatDown)
  const hatTilt = (c, fx, fn) => {
    const g = c.g, cr = fx.crook > 0 ? Math.min(1, fx.crook) * 0.32 * (c.id ? -1 : 1) : 0, dn = fx.hatDown > 0 ? 5 : 0;
    g.save(); g.translate(0, -24 + dn); g.rotate(cr); g.translate(0, 24); fn(); g.restore();
  };
  defineOutfitPart('cvSoot', { layer: 'body', draw(c) { const fx = ofxNow(c.id); smudge(c, fx.soot, 'rgba(40,34,30,0.42)'); } });
  defineOutfitPart('cvDirt', { layer: 'body', draw(c) { const fx = ofxNow(c.id); smudge(c, fx.dirt, 'rgba(96,64,36,0.5)'); } });
  defineOutfitPart('cvMinerHat', { layer: 'head', lift: 7, draw(c) {
    // Pip: a dented yellow miner's hard hat with a round brass lamp at the front (lit), the sprout through a hole
    const g = c.g, fx = ofxNow(c.id), f = c.face >= 0 ? 1 : -1;
    hatTilt(c, fx, () => {
      ofRR(g, -13, -25.8, 26, 3.4, 1.7); ofFillStroke(g, '#ffcf3a', INK, 1.3);
      g.beginPath(); g.moveTo(-9.6, -24.6); g.bezierCurveTo(-10, -35.5, 9.8, -35.5, 9.6, -24.6); g.closePath(); ofFillStroke(g, '#ffcf3a', INK, 1.4);
      // the dent and the hole for the sprout
      g.strokeStyle = 'rgba(120,80,10,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-6, -31); g.quadraticCurveTo(-4, -29, -6.5, -27.5); g.stroke();
      g.fillStyle = '#3a2a10'; g.beginPath(); g.ellipse(0, -33, 1.8, 0.8, 0, 0, Math.PI * 2); g.fill();
      // the brass lamp and its warm light
      const lx = f * 6.5;
      const lg = g.createRadialGradient(lx + f * 4, -28.5, 0.5, lx + f * 4, -28.5, 9); lg.addColorStop(0, 'rgba(255,230,150,0.7)'); lg.addColorStop(1, 'rgba(255,230,150,0)');
      g.fillStyle = lg; g.fillRect(lx - 6, -38, 22, 20);
      ofCircle(g, lx, -28.6, 3.2); ofFillStroke(g, COL.brass, INK, 1.1);
      ofCircle(g, lx + f * 0.6, -28.6, 2); g.fillStyle = '#fff2b8'; g.fill();
    });
  } });
  defineOutfitPart('cvBraces', { layer: 'body', draw(c) {
    const g = c.g; g.save(); ofBodyClip(g);
    g.fillStyle = '#7a4a22'; g.fillRect(-7, -11, 2.6, 11); g.fillRect(4.4, -11, 2.6, 11);
    g.fillStyle = '#d8a84a'; ofCircle(g, -5.7, -10, 0.9); g.fill(); ofCircle(g, 5.7, -10, 0.9); g.fill();
    g.restore();
  } });
  defineOutfitPart('cvTinyCap', { layer: 'head', lift: 0, draw(c) {
    // Bo: a grey flat cap worn between the ears
    const g = c.g, fx = ofxNow(c.id), f = c.face >= 0 ? 1 : -1;
    hatTilt(c, fx, () => {
      g.beginPath(); g.moveTo(-f * 5.6, -24.2); g.quadraticCurveTo(-f * 6.4, -30.4, f * 1, -30.2); g.quadraticCurveTo(f * 7, -29.6, f * 9.4, -25); g.quadraticCurveTo(f * 4, -23.4, -f * 5.6, -24.2); g.closePath(); ofFillStroke(g, '#8f969e', INK, 1.3);
      g.strokeStyle = 'rgba(28,26,54,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-f * 4, -24.8); g.quadraticCurveTo(f * 2, -27.4, f * 7.6, -25.4); g.stroke();
      g.fillStyle = INK; ofCircle(g, -f * 0.6, -29.8, 0.8); g.fill();
    });
  } });
  defineOutfitPart('cvLantern', { layer: 'body', draw(c) {
    // a small candle lantern clipped to the belt, on the side away from the way Bo faces
    const g = c.g, b = c.face >= 0 ? -1 : 1, sw = Math.sin(c.t * 6) * 0.15;
    g.save(); g.translate(b * 8.5, -6); g.rotate(sw);
    g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, 0); g.stroke();
    const lg = g.createRadialGradient(0, 3.5, 0.5, 0, 3.5, 7); lg.addColorStop(0, 'rgba(255,220,140,0.6)'); lg.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = lg; g.fillRect(-7, -3, 14, 14);
    ofRR(g, -2.6, 0, 5.2, 7, 1.2); ofFillStroke(g, 'rgba(255,236,170,0.85)', '#3a3a3a', 1);
    g.fillStyle = '#ffb84a'; ofCircle(g, 0, 3.6, 1.1); g.fill();
    g.restore();
  } });
  defineOutfitPart('cvGloves', { layer: 'front', draw(c, o) {
    // thick work gloves (or one glove): small mitts at the body's sides
    const g = c.g, col = o.col || '#f2e6c8';
    for (const sd of o.one ? [c.face >= 0 ? 1 : -1] : [-1, 1]) { g.beginPath(); g.ellipse(sd * 11.4, -7.6, 3, 3.6, 0, 0, Math.PI * 2); ofFillStroke(g, col, INK, 1); }
  } });
  // 39-2: the climbers
  defineOutfitPart('cvClimbHelmet', { layer: 'head', lift: 6, draw(c) {
    const g = c.g, fx = ofxNow(c.id);
    hatTilt(c, fx, () => {
      g.beginPath(); g.moveTo(-11.5, -22); g.bezierCurveTo(-12.5, -35, 12.5, -35, 11.5, -22); g.lineTo(8.6, -22); g.bezierCurveTo(8.6, -25, -8.6, -25, -8.6, -22); g.closePath(); ofFillStroke(g, '#3faa55', INK, 1.4);
      g.fillStyle = 'rgba(0,0,0,0.28)'; for (const vx of [-5, 5]) { ofRR(g, vx - 1.1, -31, 2.2, 4, 1.1); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-5, -29.5, 2.6, 1.4, -0.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-9, -22); g.lineTo(-10, -14); g.moveTo(9, -22); g.lineTo(10, -14); g.stroke();
    });
  } });
  defineOutfitPart('cvRopeCoil', { layer: 'body', draw(c) {
    // a coil of yellow rope slung over one shoulder, across the body
    const g = c.g; g.save(); ofBodyClip(g);
    g.strokeStyle = '#e8c23a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-11, -15); g.lineTo(11, -2); g.stroke();
    g.strokeStyle = '#a8861a'; g.lineWidth = 0.7; for (let k = 0; k < 6; k++) { const u = k / 5; g.beginPath(); g.moveTo(-11 + 22 * u - 1, -15 + 13 * u - 1); g.lineTo(-11 + 22 * u + 1, -15 + 13 * u + 1); g.stroke(); }
    g.restore();
    const b = c.face >= 0 ? -1 : 1;
    g.strokeStyle = '#e8c23a'; g.lineWidth = 2; g.beginPath(); g.ellipse(b * 10, -8, 3.4, 4.4, 0, 0, Math.PI * 2); g.stroke(); g.strokeStyle = '#a8861a'; g.lineWidth = 0.8; g.stroke();
  } });
  defineOutfitPart('cvChalk', { layer: 'front', draw(c) {
    const g = c.g;
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 11.2, -7.4, 2.8, 3.2, 0, 0, Math.PI * 2); ofFillStroke(g, '#fbfbf4', 'rgba(28,26,54,0.6)', 0.9); g.fillStyle = 'rgba(255,255,255,0.7)'; ofCircle(g, sd * 12.6, -4, 1.1); g.fill(); }
  } });
  defineOutfitPart('cvBandCrystal', { layer: 'head', lift: 0, draw(c) {
    // Bo: a white headband with a glow crystal tied on at the front, between the ears (teal light)
    const g = c.g; g.save(); ofBodyClip(g); g.fillStyle = '#f6f6f0'; g.fillRect(-12, -24.4, 24, 3.4); g.restore();
    g.strokeStyle = 'rgba(28,26,54,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-10.6, -21); g.lineTo(10.6, -21); g.stroke();
    const lx = c.look * 0.5, lg = g.createRadialGradient(lx, -27, 0.5, lx, -27, 8); lg.addColorStop(0, 'rgba(79,232,214,0.7)'); lg.addColorStop(1, 'rgba(79,232,214,0)');
    g.fillStyle = lg; g.fillRect(lx - 8, -35, 16, 16);
    ofPoly(g, [lx, -32.5, lx + 2.6, -27.6, lx, -23.4, lx - 2.6, -27.6]); ofFillStroke(g, '#7ff0e0', '#1a6a64', 1);
    g.fillStyle = 'rgba(255,255,255,0.8)'; ofPoly(g, [lx - 0.6, -31, lx + 0.6, -28, lx - 1.4, -27.4]); g.fill();
  } });
  defineOutfitPart('cvHookBelt', { layer: 'body', draw(c) {
    const g = c.g; g.save(); ofBodyClip(g); g.fillStyle = '#c4ccd6'; g.fillRect(-12, -5.6, 24, 2.6); g.restore();
    g.strokeStyle = '#8a929c'; g.lineWidth = 0.9;
    for (const x of [-7, -3, 3, 7]) { g.beginPath(); g.moveTo(x, -3); g.lineTo(x, -1.2); g.arc(x + 0.9, -1.2, 0.9, Math.PI, 0, true); g.stroke(); }
  } });
  defineOutfitPart('cvKneePads', { layer: 'body', draw(c) {
    const g = c.g; for (const x of [-5.4, 5.4]) { ofRR(g, x - 2.8, -3.2, 5.6, 3, 1.2); ofFillStroke(g, '#8c929a', INK, 0.8); }
  } });
  defineOutfitPart('cvDust', { layer: 'front', draw(c) {
    // crystal dust sparkling on them for a few seconds after a stomp (fx.dust)
    const fx = ofxNow(c.id); if (fx.dust <= 0) return;
    const g = c.g, a = clamp(fx.dust / 2, 0, 1);
    for (let k = 0; k < 7; k++) { const x = -9 + (k * 37 % 19), y = -24 + (k * 13 % 22), s = 0.6 + 0.6 * Math.abs(Math.sin(c.t * 6 + k)); g.fillStyle = 'rgba(' + (k % 2 ? '200,255,245' : '255,240,170') + ',' + a + ')'; ofStar(g, x, y, 1.6 * s); g.fill(); }
  } });
  // 39-3: on the run (the climbing gear half lost)
  defineOutfitPart('cvTornScarf', { layer: 'body', draw(c) {
    // a torn green scarf streaming out behind
    const g = c.g, b = c.face >= 0 ? -1 : 1, w = Math.sin(c.t * 12) * 1.6, s = Math.min(1, Math.abs(c.vx) / 200) * 7;
    g.fillStyle = '#3faa55'; g.strokeStyle = INK; g.lineWidth = 1;
    g.beginPath(); g.moveTo(b * 8, -7); g.quadraticCurveTo(b * (14 + s), -7 + w, b * (19 + s), -6 - w); g.lineTo(b * (17 + s), -4.4 - w); g.lineTo(b * (19.5 + s), -2.6 - w); g.quadraticCurveTo(b * (13 + s), -2.6 + w, b * 8, -3.6); g.closePath(); g.fill(); g.stroke();
    g.save(); ofBodyClip(g); g.fillStyle = '#3faa55'; g.fillRect(-12, -7.4, 24, 3.6); g.restore();
    ofHem(c, -7.4, 'rgba(28,26,54,0.35)'); ofHem(c, -3.8, 'rgba(28,26,54,0.35)');
  } });
  defineOutfitPart('cvSatchel', { layer: 'body', draw(c) {
    const g = c.g, b = c.face >= 0 ? -1 : 1, bob = Math.abs(Math.sin(c.t * 14)) * Math.min(1, Math.abs(c.vx) / 150) * 1.6;
    g.save(); ofBodyClip(g); g.fillStyle = '#7a5230'; ofPoly(g, [-12, -15, -9, -15, 12, -3, 12, 0]); g.fill(); g.restore();
    ofRR(g, b * 9 - 3.6, -6.4 - bob, 7.2, 6, 1.6); ofFillStroke(g, '#9a6a3a', INK, 1);
    g.fillStyle = '#c89a5a'; g.fillRect(b * 9 - 3.6, -6.4 - bob, 7.2, 2);
  } });
  defineOutfitPart('cvSlime', { layer: 'front', draw(c) {
    // harmless glittery worm slime for 3 s after a gulp (fx.slime)
    const fx = ofxNow(c.id); if (fx.slime <= 0) return;
    const g = c.g, a = clamp(fx.slime / 1.2, 0, 1);
    g.save(); ofBodyClip(g);
    g.fillStyle = 'rgba(150,240,170,' + 0.35 * a + ')'; g.fillRect(-12, -27, 24, 28);
    g.fillStyle = 'rgba(170,255,190,' + 0.7 * a + ')';
    for (let k = 0; k < 5; k++) { const x = -9 + k * 4.4, l = 3 + (k * 7 % 5) + Math.sin(c.t * 3 + k) * 1.4; g.beginPath(); g.ellipse(x, -24 + l, 1.4, l, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
    for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(255,255,255,' + a + ')'; ofStar(g, -7 + k * 5, -20 + (k % 2) * 8, 1.2 + Math.abs(Math.sin(c.t * 7 + k))); g.fill(); }
  } });
  // 39-4: prize diggers, each in their own colours so they are easy to tell apart in the dirt
  defineOutfitPart('cvRushHatPip', { layer: 'head', lift: 7, draw(c) {
    const g = c.g, fx = ofxNow(c.id), f = c.face >= 0 ? 1 : -1;
    hatTilt(c, fx, () => {
      ofRR(g, -12.6, -25.8, 25.2, 3.4, 1.7); ofFillStroke(g, '#e8b02a', INK, 1.3);
      g.beginPath(); g.moveTo(-9.6, -24.6); g.bezierCurveTo(-10, -35.5, 9.8, -35.5, 9.6, -24.6); g.closePath(); ofFillStroke(g, '#ffd23a', INK, 1.4);
      g.save(); g.clip(); g.fillStyle = '#ff7a2a'; g.fillRect(-1.8, -36, 3.6, 12); g.restore();
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-5, -30.4, 2.4, 1.3, -0.5, 0, Math.PI * 2); g.fill();
      const lx = f * 6.6;
      const lg = g.createRadialGradient(lx + f * 5, -28.6, 0.5, lx + f * 5, -28.6, 12); lg.addColorStop(0, 'rgba(255,240,180,0.75)'); lg.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = lg; g.fillRect(lx - 6, -40, 26, 24);
      ofCircle(g, lx, -28.6, 3.6); ofFillStroke(g, '#5a5a62', INK, 1.1); ofCircle(g, lx + f * 0.7, -28.6, 2.4); g.fillStyle = '#fff6c8'; g.fill();
    });
    if (fx.crown > 0) crown(g, -40);
  } });
  defineOutfitPart('cvRushHatBo', { layer: 'head', lift: 0, draw(c) {
    // Bo: a silver hard hat of another shape, a wide brim with the ears out through it, a blue stripe
    const g = c.g, fx = ofxNow(c.id), f = c.face >= 0 ? 1 : -1;
    hatTilt(c, fx, () => {
      g.beginPath(); g.ellipse(0, -24.6, 15.4, 2.6, 0, 0, Math.PI * 2); ofFillStroke(g, '#b8c2cc', INK, 1.3);
      g.beginPath(); g.moveTo(-5.4, -25); g.bezierCurveTo(-6, -34, 6, -34, 5.4, -25); g.closePath(); ofFillStroke(g, '#dfe6ec', INK, 1.4);
      g.save(); g.clip(); g.fillStyle = '#3a6ee8'; g.fillRect(-6, -29.2, 12, 2.2); g.restore();
      const lx = f * 3.4, lg = g.createRadialGradient(lx + f * 5, -29, 0.5, lx + f * 5, -29, 11); lg.addColorStop(0, 'rgba(230,250,255,0.75)'); lg.addColorStop(1, 'rgba(230,250,255,0)');
      g.fillStyle = lg; g.fillRect(lx - 6, -40, 24, 22);
      ofCircle(g, lx, -29.4, 2.4); ofFillStroke(g, '#5a5a62', INK, 1); ofCircle(g, lx + f * 0.5, -29.4, 1.5); g.fillStyle = '#f4fbff'; g.fill();
    });
    if (fx.crown > 0) crown(g, -36);
  } });
  // the match winner's crown of crystals, set on by the golem
  function crown(g, y) {
    const cols = ['#4fe8d6', '#ffd25a', '#ff8fb4', '#86ec7a', '#dff6ff'];
    g.fillStyle = '#ffd25a'; ofRR(g, -8, y + 2, 16, 3, 1.2); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.8; g.stroke();
    for (let k = 0; k < 5; k++) { const x = -6.4 + k * 3.2, h = k === 2 ? 7 : k % 2 ? 4.6 : 5.6; ofPoly(g, [x - 1.4, y + 2, x, y + 2 - h, x + 1.4, y + 2]); ofFillStroke(g, cols[k], INK, 0.7); }
  }
  defineOutfitPart('cvGemSack', { layer: 'back', draw(c) {
    // a gem sack on the back that visibly fills (fx.sack 0..1), a few gems peeping out
    const g = c.g, fx = ofxNow(c.id), b = c.face >= 0 ? -1 : 1, f = clamp(fx.sack, 0, 1), r = 4 + f * 3.4;
    g.beginPath(); g.ellipse(b * 9.6, -9 - f * 1.5, r, r * 1.15, 0, 0, Math.PI * 2); ofFillStroke(g, '#c8a878', INK, 1.1);
    g.strokeStyle = '#7a5a30'; g.lineWidth = 1; g.beginPath(); g.moveTo(b * 9.6 - 2, -9 - f * 1.5 - r * 1.05); g.lineTo(b * 9.6 + 2, -9 - f * 1.5 - r * 1.05); g.stroke();
    if (f > 0.15) { const cols = ['#4fe8d6', '#ffd25a', '#ff8fb4']; for (let k = 0; k < Math.ceil(f * 3); k++) { ofPoly(g, [b * 9.6 - 2 + k * 2, -10 - f * 1.5 - r * 1.1, b * 9.6 - 1 + k * 2, -12 - f * 1.5 - r * 1.1, b * 9.6 + k * 2, -10 - f * 1.5 - r * 1.1]); ofFillStroke(g, cols[k], INK, 0.6); } }
  } });

  defineOutfit('cavelift', {
    pip: [['cvMinerHat', {}], ['cvBraces', {}], ['neckerchief', { col: '#3faa55' }], ['cvSoot', {}]],
    bo: [['cvTinyCap', {}], ['vest', { col: '#2fb3a8' }], ['cvLantern', {}], ['cvGloves', {}], ['cvSoot', {}]],
  });
  defineOutfit('cavegolem', {
    pip: [['cvClimbHelmet', {}], ['cvRopeCoil', {}], ['cvChalk', {}], ['cvDust', {}]],
    bo: [['cvBandCrystal', {}], ['cvHookBelt', {}], ['cvKneePads', {}], ['cvDust', {}]],
  });
  defineOutfit('caveworm', {
    pip: [['goggles', { up: true, frame: '#5a4a3a', lens: 'rgba(200,240,220,0.55)' }], ['cvTornScarf', {}], ['cvGloves', { one: true, col: '#d8c8a8' }], ['cvSlime', {}]],
    bo: [['neckerchief', { col: '#2fb3a8' }], ['cvSatchel', {}], ['cvSlime', {}]],
  });
  defineOutfit('gemrush', {
    pip: [['cvRushHatPip', {}], ['cvGemSack', {}], ['cvDirt', {}]],
    bo: [['cvRushHatBo', {}], ['cvGemSack', {}], ['cvDirt', {}]],
  });

  /* ---------- shared sounds ---------- */
  Sfx.extra.caveTube = function () { this.tone(330, 0.07, 'sawtooth', 0.012, 260); this.tone(392, 0.05, 'square', 0.006, 300, 0.05); };
  Sfx.extra.caveGem = function (p) { p = p || 1; this.tone(1568 * p, 0.09, 'triangle', 0.035, null); this.tone(2349 * p, 0.16, 'sine', 0.025, null, 0.05); this.tone(3136 * p, 0.12, 'sine', 0.01, null, 0.1); };
  Sfx.extra.caveHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.045, null, i * 0.07)); this.tone(2637, 0.5, 'sine', 0.012, null, 0.35); };
  Sfx.extra.caveCrystalRing = function (p) { p = p || 1; this.tone(1318 * p, 0.7, 'sine', 0.035, null); this.tone(1976 * p, 0.55, 'sine', 0.018, null, 0.01); this.tone(2637 * p, 0.4, 'sine', 0.008, null, 0.02); };
  Sfx.extra.caveSting = function () { [659, 784, 988, 1319].forEach((f, i) => { this.tone(f, 0.5 - i * 0.05, 'sine', 0.03, null, i * 0.12); this.tone(f * 2, 0.3, 'sine', 0.008, null, i * 0.12 + 0.02); }); };
  Sfx.extra.caveGolemGroan = function () { this.tone(70, 1.1, 'sawtooth', 0.04, 55); this.tone(105, 0.9, 'triangle', 0.03, 80, 0.1); this.noise(0.9, { type: 'lowpass', f: 220, vol: 0.05, a: 0.2 }); };
  Sfx.extra.caveGolemSigh = function () { this.tone(220, 1.6, 'sine', 0.03, 180); [880, 1109, 1319, 1760].forEach((f, i) => this.tone(f, 1.2, 'sine', 0.012, null, 0.3 + i * 0.18)); };
  Sfx.extra.caveWormRoarFar = function () { this.tone(60, 1.2, 'sawtooth', 0.025, 45); this.noise(1.1, { type: 'lowpass', f: 300, to: 120, vol: 0.04, a: 0.3 }); };
  Sfx.extra.caveWormRoarNear = function () { this.tone(80, 1.0, 'sawtooth', 0.05, 50); this.tone(120, 0.8, 'square', 0.02, 70, 0.05); this.noise(1.0, { type: 'bandpass', f: 500, to: 160, q: 0.8, vol: 0.08, a: 0.1 }); };
  Sfx.extra.caveThud = function () { this.tone(70, 0.35, 'sine', 0.1, 38); this.noise(0.3, { type: 'lowpass', f: 400, to: 80, vol: 0.08 }); };
  Sfx.extra.caveBoing = function () { this.tone(220, 0.3, 'sine', 0.06, 560); this.tone(160, 0.18, 'triangle', 0.03, 100, 0.14); };
  Sfx.extra.caveCheer = function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.035, null, i * 0.08)); };

  /* ---------- music: three new songs (and their arrangements), loudness set with tools/audio/check.js ---------- */
  // cavedeep (39-1): wonder with a little unease. Glassy bells with long echoes, a slow plucked bass, dripping mallets,
  // a low hum, and a creaking wooden tick in time like the crank ratchet. The hook: 4 - 7 - 6 4 2 -
  SONGS.cavedeep = {
    bpm: 84, vol: 0.42, root: 57, scale: 'minor', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'bell', bass: 'upright', arp: 'musicbox', pad: 'softpad' }, oct: { lead: 1 },
    bass: '0 . . . 2 . . .', arp: '. . 2 . . 4 . .',
    drums: { w: 'o.o.o.o.o.o.o.o.', D: 'x.......o.......', e: '......o.......o.' },
    sec: {
      A: { ch: [0, 5, 3, 4], lead: ['4 - 7 - 6 4 2 -', '2 - 4 - 0 - - .', '3 - 5 - 4 2 0 -', '1 - - - -1 - . .'] },
      A2: { ch: [0, 5, 3, 6], lead: ['4 - 7 - 9 7 6 -', '7 - 4 - 2 - - .', '5 - 7 - 8 7 5 -', '6 - 4 - 1 - . .'] },
      B: { ch: [5, 6, 0, 4], lead: ['9 - - 8 7 - 5 -', '6 - - 5 4 - 2 -', '4 - 7 - 11 - 9 -', '8 - - - 7 - . .'] },
    },
  };
  // cavegolem (39-2): the same hook slower and heavier, a deep slow drum like the golem's footfalls (one bar = its
  // 4 s step), and a low choir-like pad that turns from minor to major as the shards come out (cavegolem1 after
  // shard 4, cavegolem2 after shard 8, cavegolem3 the calm ending)
  const golem = (scale, vol) => ({
    bpm: 60, vol, root: 50, scale, form: ['A', 'B'],
    inst: { lead: 'bell', bass: 'bass', pad: 'strings', arp: 'vibes' }, oct: { lead: 1 },
    bass: '0 . . . . . . . 2 . . . . . . .', arp: '. . . . 2 . . . . . . . 4 . . .',
    drums: { m: 'X...............', t: '........o.......', e: '....o.......o...' },
    sec: {
      A: { ch: [0, 5, 3, 4], lead: ['4 - 7 - 6 4 2 -', '2 - 4 - 0 - - .', '3 - 5 - 4 2 0 -', '1 - - - - - . .'] },
      B: { ch: [5, 3, 0, 4], lead: ['9 - - 8 7 - 5 -', '6 - - 5 4 - 2 -', '4 - 7 - 9 - 7 -', '4 - - - - - . .'] },
    },
  });
  SONGS.cavegolem0 = golem('minor', 0.47); SONGS.cavegolem1 = golem('dorian', 0.47); SONGS.cavegolem2 = golem('mixo', 0.47); SONGS.cavegolem3 = golem('major', 0.47);
  // cavechase (39-3, and the rope snap in 39-1, a tantrum warning in 39-2): fast, pounding, a little frightening.
  // Driving low drums, a growling bass ostinato, the bell hook played fast, brass-like stabs; a key step up each
  // stretch (cavechase1-3) and bass and drums alone during the inhale (cavechaseLow)
  const chase = (root, low) => ({
    bpm: 150, vol: low ? 0.38 : 0.32, root, scale: 'minor', form: ['A', 'B'],
    inst: low ? { bass: 'sawbass' } : { lead: 'bell', bass: 'sawbass', comp: 'brass', pad: 'strings' }, oct: { lead: 1 },
    bass: '0 0 3 0 0 0 3 0 0 0 3 0 1 1 2 1',
    comp: '. . . . . . X . . . . . . . . .',
    drums: { t: 'x...x...x...x.x.', k: 'x.....x...x.....', s: '....x.......x...', h: low ? '' : 'x.x.x.x.x.x.x.x.' },
    sec: {
      A: { ch: [0, 0, 5, 4], lead: ['4 7 6 4 2 . 4 .', '4 7 6 4 2 . 0 .', '3 5 4 2 0 . 3 .', '1 . 4 . 6 . 7 .'] },
      B: { ch: [5, 3, 0, 4], lead: ['9 . 8 7 . 5 7 .', '6 . 5 4 . 2 4 .', '4 7 9 11 9 7 4 .', '8 - - - 7 - 6 -'] },
    },
  });
  SONGS.cavechase = chase(57); SONGS.cavechase1 = chase(59); SONGS.cavechase2 = chase(60); SONGS.cavechase3 = chase(62); SONGS.cavechaseLow = chase(57, true);
  // cavedig (39-4): bright, bouncy and competitive: a skipping pickaxe-clink rhythm, a jaunty marimba and bell tune on
  // the same hook in a major key, a tuba oompah; cavedigFast for the last 10 s of a round
  const dig = (bpm, vol) => ({
    bpm, vol, root: 60, scale: 'major', swing: 0.16, form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'marimba', lead2: 'bell', bass: 'tuba', comp: 'pizz' }, oct: { lead2: 1 },
    bass: '0 . 2 . 0 . 2 .', comp: '. x . x . x . x',
    drums: { w: 'x.x..x.xx.x..x.x', k: 'x.......x.......', s: '....o.......o...' },
    sec: {
      A: { ch: [0, 4, 5, 3], lead: ['4 . 7 . 6 4 2 .', '2 . 4 . 1 . 4 .', '5 . 7 . 9 7 5 .', '3 . 2 . 0 . . .'] },
      A2: { ch: [0, 4, 5, [3, 4]], lead: ['4 . 7 . 9 7 6 .', '6 . 4 . 2 . 4 .', '5 . 7 . 8 7 5 .', '4 . 2 . 0 . . .'], lead2: ['. . . . 7 . . .', '. . . . 6 . . .', '. . . . 9 . . .', '. . . . 7 . . .'] },
      B: { ch: [3, 0, 3, 4], lead: ['5 . 7 . 10 . 9 7', '9 . 7 . 4 . . .', '5 . 7 . 10 . 9 7', '8 . 6 . 8 . 11 .'] },
    },
  });
  SONGS.cavedig = dig(132, 0.51); SONGS.cavedigFast = dig(156, 0.48);
  MUSIC_BY_WORLD[38] = 'cavedeep';
  const DRIP = (A, t) => { A.chirp(t, 1500 + Math.random() * 600, 800, 0.05, 0.018); A.chirp(t + 0.18, 1300, 700, 0.04, 0.006); };
  Object.assign(AMBIENCE, {
    // 39-1: hollow wind up the shaft, rope creak, dripping, far rumbles from below, bat squeaks
    caveShaft: { beds: [{ noise: 'bandpass', f: 380, q: 1.2, vol: 0.02, lfo: [0.11, 0.6], sweep: [0.06, 160] }, { hum: 'sine', f: 49, vol: 0.012 }],
      events: [{ every: [2, 5], fn: DRIP }, { every: [5, 11], fn(A, t) { A.chirp(t, 150, 120, 0.4, 0.008, 'sawtooth'); } },
        { every: [9, 18], fn(A, t) { A.puff(t, 'lowpass', 120, 0.7, 0.06, 1.4, 0.3); } },
        { every: [8, 16], fn(A, t) { for (let i = 0; i < 3; i++) A.chirp(t + i * 0.08, 5200, 6400, 0.03, 0.004); } }] },
    // 39-2: a wide soft crystal hum, glitter tinkles, slow drips into pools, the golem's breathing
    caveCavern: { beds: [{ hum: 'sine', f: 110, vol: 0.008, lfo: [0.07, 0.5] }, { hum: 'sine', f: 165.5, vol: 0.005, lfo: [0.05, 0.6] }, { noise: 'lowpass', f: 240, vol: 0.016, lfo: [0.25, 0.5] }],
      events: [{ every: [1.5, 4], fn(A, t) { const f = 2600 + Math.random() * 1800; A.chirp(t, f, f, 0.12, 0.005); A.chirp(t + 0.1, f * 1.5, f * 1.5, 0.1, 0.003); } },
        { every: [3, 7], fn: DRIP }] },
    // 39-3: a constant deep rumble and falling grit, distant roars, cracking rock
    caveRumble: { beds: [{ noise: 'lowpass', f: 140, vol: 0.06, lfo: [0.3, 0.4] }, { noise: 'highpass', f: 4000, vol: 0.004, lfo: [2, 0.8] }],
      events: [{ every: [6, 12], fn(A, t) { A.chirp(t, 70, 50, 1.0, 0.02, 'sawtooth'); } }, { every: [2, 5], fn(A, t) { A.puff(t, 'highpass', 2400, 0.7, 0.02, 0.05); A.puff(t + 0.05, 'bandpass', 1200, 2, 0.015, 0.08); } }] },
    // 39-4: muffled earth, small trickles of dirt, the golem's breathing above, the odd happy chime
    caveChamber: { beds: [{ noise: 'lowpass', f: 300, vol: 0.016, lfo: [0.2, 0.5] }],
      events: [{ every: [2, 5], fn(A, t) { A.puff(t, 'bandpass', 2200, 1.5, 0.012, 0.25, 0.05); } }, { every: [5, 10], fn(A, t) { A.puff(t, 'lowpass', 160, 0.7, 0.04, 1.6, 0.6); } },
        { every: [9, 18], fn(A, t) { A.chirp(t, 1568, 1568, 0.25, 0.005); A.chirp(t + 0.14, 2093, 2093, 0.3, 0.004); } }] },
  });
  return K;
})();
