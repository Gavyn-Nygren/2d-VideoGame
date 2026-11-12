/* Pip & Bo - World 34 Viking Voyage: shared helpers for the four Viking levels (loads before them). */
'use strict';

/* The only global here is VIKING. Pip and Bo are Vikings on a voyage north: a longship with a dragon prow and a striped
   sail, grey seas, fjords, ice and a roaring mead hall at the end. Not a toddler world (Gavyn): the serpent is huge and
   has teeth, the fortress rains arrows, the hall is a riot. Nobody gets hurt on screen: a failure is a dunking, a
   knock-back, a mess or a checkpoint restart.
   The players-and-keys, effects and HUD helpers are World 31's SHRUNK kit (same names, same arguments: its header is
   the manual for those), so this file loads after js/levels/world31/shrunk-kit.js. What is new here is the Viking look,
   the sea and the northern scenery, and the viking* sounds.
   Nothing here touches the rules of a level and nothing keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = VIKING; ... VIKING.defs.<mode> = {...}; })();

   From SHRUNK (see js/levels/world31/shrunk-kit.js): K.FONT, K.lerp, K.smooth, K.hash, K.mmss, K.stubMap, K.BREAK,
     K.quiet, K.key, K.track, K.both, K.idle, K.actLabels, K.hide, K.unhide, K.place, K.fx, K.pop, K.part, K.spark,
     K.confetti, K.dust, K.poof, K.hint, K.hintOnce, K.msg, K.tickFx, K.star, K.drawParts, K.drawPops, K.chip, K.panel,
     K.meter, K.medal, K.helpLine, K.drawMsg, K.prompter, K.hero.
   K.goldHelp(st, text, life)       the gold-help banner (plays vikingHelp, counts st.stats.helps).
   Vikings
     K.viking(id, x, y, o)           Pip or Bo as a Viking, feet at x, y: Pip has a horned helmet and an orange braided
                                     beard, Bo a winged helmet and a blue cloak. o: face, rot, s, sy, sx, vy, stun, alpha,
                                     arms ('up' both arms overhead, 'fwd' reaching forward), cloakV (0..1 how hard the
                                     cloak flies).
     K.shield(x, y, r, o)            a round shield face-on, centred at x, y. o: col, col2 (the two halves), rot, boss.
     K.helmet(id, x, y, s, face)     just the helmet (for HUD panels and the preview), centred on the head top at x, y.
   The sea (call inside your camera transform or with none; everything is in screen px with a scroll value)
     K.sea(scroll, t, y0, o)         full width, from y0 down to the screen bottom: three wave bands that roll at different
                                     speeds, with foam lines. o: col (deep), hi (light), dark, rough 0..1, rows (y of the
                                     band tops; default three bands 44 px apart from y0).
     K.waveLine(x0, x1, y, scroll, t, amp, col, w)   one rolling wave crest line from x0 to x1 at y.
     K.longship(x, y, o)             a longship side-on, waterline middle at x, y, facing right: hull with a stripe, a row
                                     of round shields on the rail, a dragon prow, a curled stern, mast and a striped sail.
                                     o: s (scale), len (hull length, 220), sail 0..1 (how full the sail is: 0 luffing),
                                     oars (the oar phase in turns, or null for no oars), oarSpread, tilt (radians, bow up
                                     +), shields (array of colours, null = a gap where one was knocked off), torn (a rip
                                     in the sail 0..1), bitten (a bite out of the stern rail 0..1), sailCols [a, b], gold.
     K.splash(st, x, y, n)           spray particles.
   Northern scenery (no transform)
     K.sky(cx, t, o)                 full screen: grey northern day, o.night for a dark sky with stars and an aurora,
                                     o.dusk for a pink-gold low sun, o.storm 0..1 darkens, o.sleet 0..1 slanting sleet.
     K.fjords(cx, t, o)              two layers of steep fjord cliffs with snow caps along the horizon. o: base (y of
                                     their feet, 300), dim 0..1, par (parallax of the far layer, 0.08).
     K.fog(x0, x1, t, a)             a soft fog bank over the screen from x0 to x1 (alpha a).
   Sounds (Sfx.play('vikingHorn')): vikingHorn, vikingDrum, vikingOar, vikingWave, vikingHiss, vikingRoar, vikingChop,
     vikingThunk, vikingCheer, vikingHelp (played by K.goldHelp), vikingPop (a collectable), vikingSplash, vikingClang.
     Levels add their own as Sfx.extra.<mode>Name.
   Colours: K.COL = { sea, seaHi, seaDark, foam, wood, woodDark, woodHi, ice, iceHi, iceDark, blueIce, snow, stone,
     stoneDark, sail1, sail2, gold, fire }. Gold (C.gold) is kept for help and "press now". */
const VIKING = (() => {
  const S = SHRUNK, K = { defs: {} };
  for (const k of ['FONT', 'lerp', 'smooth', 'hash', 'mmss', 'stubMap', 'BREAK', 'quiet', 'key', 'track', 'both', 'idle', 'actLabels',
    'hide', 'unhide', 'place', 'fx', 'pop', 'part', 'spark', 'confetti', 'dust', 'poof', 'hint', 'hintOnce', 'msg', 'tickFx', 'star',
    'drawParts', 'drawPops', 'chip', 'panel', 'meter', 'medal', 'helpLine', 'drawMsg', 'prompter', 'hero']) K[k] = S[k];
  const TAU = Math.PI * 2, H_ = K.hash;
  const COL = K.COL = {
    sea: '#2e5a72', seaHi: '#5f93a8', seaDark: '#1a3a50', foam: '#e8f4f6', wood: '#8a5a32', woodDark: '#5a3418', woodHi: '#b07a48',
    ice: '#bfe4f2', iceHi: '#eaf8ff', iceDark: '#7fb4cc', blueIce: '#5aa6d8', snow: '#f4f8fb', stone: '#6e737a', stoneDark: '#464a52',
    sail1: '#c8323a', sail2: '#f2e6c8', gold: '#ffc53d', fire: '#ff8a2a',
  };
  // catch-up help is gold and announced, never hidden, and counted for the results card
  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('vikingHelp');
  };

  /* ---------- Vikings ---------- */
  // the helmet, centred on the top of the head at (x, y), s = scale
  K.helmet = (id, x, y, s = 1, face = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (id === 0) {
      // two curved horns
      for (const d of [-1, 1]) {
        ctx.fillStyle = '#f4ead2'; ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(d * 9, 1); ctx.quadraticCurveTo(d * 20, 0, d * 19, -12); ctx.quadraticCurveTo(d * 15, -4, d * 7, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    } else {
      // two little white wings
      for (const d of [-1, 1]) {
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#9aaabb'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(d * 9, -1);
        ctx.quadraticCurveTo(d * 16, -14, d * 22, -15); ctx.quadraticCurveTo(d * 19, -9, d * 21, -8); ctx.quadraticCurveTo(d * 16, -5, d * 18, -2); ctx.quadraticCurveTo(d * 13, -1, d * 9, 2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    // the steel dome with a band and rivets
    const g = ctx.createLinearGradient(0, -9, 0, 4);
    g.addColorStop(0, '#d8dee6'); g.addColorStop(1, '#7a828e');
    ctx.fillStyle = g; ctx.strokeStyle = '#3c424c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-12, 4); ctx.quadraticCurveTo(-12, -10, 0, -10); ctx.quadraticCurveTo(12, -10, 12, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = id === 0 ? '#b8862a' : '#6a7a9a'; ctx.fillRect(-12, 1, 24, 4);
    ctx.fillStyle = '#ffffff'; for (const rx of [-8, -3, 2, 7]) { circle(rx + 0.5, 3, 0.9); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-4 * face, -5, 3, 2, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  };
  function cloak(x, y, face, t, v, s) {
    const sh = y - 22 * s, back = -face, fl = clamp(v, 0, 1), wave = Math.sin(t * (7 + fl * 9)) * (1.6 + fl * 3) * s;
    const tipX = x + back * (5 + fl * 20) * s, tipY = y - 2 * s - fl * 12 * s;
    ctx.fillStyle = '#1e4a9a';
    ctx.beginPath(); ctx.moveTo(x - 9 * s, sh); ctx.lineTo(x + 9 * s, sh);
    ctx.quadraticCurveTo(tipX + back * 10 * s, (sh + tipY) / 2 + wave, tipX + back * 11 * s + wave * 0.4, tipY);
    ctx.lineTo(tipX - back * 6 * s, tipY + 3 * s + wave * 0.5);
    ctx.quadraticCurveTo(x - back * 3 * s, sh + 14 * s, x - 9 * s, sh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffc53d'; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.moveTo(x - 9 * s, sh + 1); ctx.lineTo(x + 9 * s, sh + 1); ctx.stroke();
  }
  K.viking = (id, x, y, o = {}) => {
    const s = o.s || 1, face = o.face || 1, t = G.clock || 0, a0 = ctx.globalAlpha;
    if (o.alpha !== undefined) ctx.globalAlpha = a0 * o.alpha;
    if (id === 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.translate(-x, -y); cloak(x, y, face, t, o.cloakV || 0, s); ctx.restore(); }
    K.hero(id, x, y, { face, rot: o.rot, s: o.s, sy: o.sy, sx: o.sx, vy: o.vy, stun: o.stun });
    const sy = o.sy || 1, h = PH * sy * s, w = PW * (o.sx || (o.sy ? 2 - o.sy : 1)) * s;
    ctx.save(); ctx.translate(x, y - PH * s / 2); ctx.rotate(o.rot || 0); ctx.translate(0, PH * s / 2);
    if (id === 0) {
      // Pip's orange braided beard under the face
      const by = -h * 0.3;
      ctx.fillStyle = '#ff8a2a'; ctx.strokeStyle = '#b8541a'; ctx.lineWidth = 1.2 * s;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 3, by - 3 * s); ctx.quadraticCurveTo(0, by + 4 * s, w / 2 - 3, by - 3 * s); ctx.lineTo(w / 2 - 5, by + 1 * s); ctx.quadraticCurveTo(0, by + 9 * s, -w / 2 + 5, by + 1 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      // two braids
      for (const d of [-1, 1]) {
        const bx = d * 4 * s + face * 1.5 * s, sw = Math.sin(t * 5 + d) * 1.2 * s;
        for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#ff9a3a' : '#e8741a'; circle(bx + sw * k * 0.5, by + (5 + k * 3.2) * s, (2.3 - k * 0.3) * s); ctx.fill(); }
        ctx.fillStyle = '#ffc53d'; ctx.fillRect(bx + sw * 1.2 - 1.6 * s, by + 13.5 * s, 3.2 * s, 1.6 * s);
      }
    }
    if (o.arms) {
      const up = o.arms === 'up';
      ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      const ex = up ? 2 * s : face * 14 * s, ey = up ? -h - 12 * s : -h * 0.55;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h * 0.55); ctx.lineTo(up ? -w / 2 - ex : ex - 4 * s, ey); ctx.moveTo(w / 2 - 2, -h * 0.55); ctx.lineTo(up ? w / 2 + ex : ex + 2 * s, ey + (up ? 0 : 2 * s)); ctx.stroke();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h * 0.55); ctx.lineTo(up ? -w / 2 - ex : ex - 4 * s, ey); ctx.moveTo(w / 2 - 2, -h * 0.55); ctx.lineTo(up ? w / 2 + ex : ex + 2 * s, ey + (up ? 0 : 2 * s)); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    K.helmet(id, 0, -h + 3 * s, s, face);
    ctx.restore();
    ctx.globalAlpha = a0;
  };
  // a round shield face-on: two coloured halves, a rim and a boss
  K.shield = (x, y, r, o = {}) => {
    const c1 = o.col || '#c8323a', c2 = o.col2 || '#f2e6c8';
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, -Math.PI / 2, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, Math.PI / 2, Math.PI); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a3418'; ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    if (o.boss !== false) { ctx.fillStyle = '#b8bec8'; circle(0, 0, r * 0.28); ctx.fill(); ctx.strokeStyle = '#4a4e56'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  };

  /* ---------- the sea ---------- */
  K.waveLine = (x0, x1, y, scroll, t, amp, col, w) => {
    ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) { const yy = y + Math.sin((x + scroll) * 0.035 + t * 1.6) * amp + Math.sin((x + scroll) * 0.013 - t) * amp * 0.6; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
  };
  K.sea = (scroll, t, y0, o = {}) => {
    const rough = o.rough || 0, rows = o.rows || [y0, y0 + 44, y0 + 88];
    const deep = o.col || COL.sea, hi = o.hi || COL.seaHi, dark = o.dark || COL.seaDark;
    const g = ctx.createLinearGradient(0, y0 - 10, 0, H);
    g.addColorStop(0, hi); g.addColorStop(0.35, deep); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.fillRect(0, y0 - 6, W, H - y0 + 6);
    rows.forEach((ry, k) => {
      const sp = 0.4 + k * 0.3, amp = 3 + k * 1.5 + rough * 4, sc = scroll * sp;
      // a slightly darker band under each crest line, then the crest with foam
      ctx.fillStyle = 'rgba(10,30,50,' + (0.08 + k * 0.05) + ')';
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, ry + Math.sin((x + sc) * 0.03 + t * (1.2 + k * 0.3)) * amp);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      K.waveLine(0, W, ry, sc, t * (1 + k * 0.2), amp, 'rgba(232,244,246,' + (0.35 + k * 0.12) + ')', 2 + k * 0.5);
      // foam flecks
      ctx.fillStyle = 'rgba(232,244,246,0.5)';
      for (let i = 0; i < 9; i++) { const fx = ((i * 131 - sc * 1.2) % (W + 60) + W + 60) % (W + 60) - 30, fy = ry + 10 + (i * 7) % 18; ctx.fillRect(fx, fy, 10 + (i % 3) * 6, 2); }
    });
  };
  K.splash = (st, x, y, n = 8) => { for (let i = 0; i < n; i++) K.part(st, x + (Math.random() - 0.5) * 30, y, (Math.random() - 0.5) * 220, -120 - Math.random() * 220, 0.7, i % 2 ? '#e8f4f6' : '#9fd0e0', 3 + Math.random() * 2, 700, 'dot'); };
  const SHIELD_COLS = [['#c8323a', '#f2e6c8'], ['#2a5aa8', '#f2e6c8'], ['#e8b42a', '#5a3418'], ['#3a8a4a', '#f2e6c8']];
  K.longship = (x, y, o = {}) => {
    const s = o.s || 1, len = (o.len || 220), t = G.clock || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-(o.tilt || 0));
    const hl = len / 2;
    // mast and sail (behind the hull)
    const mastX = -6, mastTop = -150;
    ctx.fillStyle = COL.woodDark; ctx.fillRect(mastX - 3, mastTop, 6, 150);
    ctx.fillRect(mastX - 56, mastTop + 12, 112, 5);
    const fill = clamp(o.sail === undefined ? 1 : o.sail, 0, 1), belly = 6 + fill * 22, luff = (1 - fill) * Math.sin(t * 9) * 5;
    const [sa, sb] = o.sailCols || [COL.sail1, COL.sail2];
    const top = mastTop + 16, bot = -30;
    for (let k = 0; k < 6; k++) {
      const x0 = mastX - 54 + k * 18, x1 = x0 + 18;
      ctx.fillStyle = o.gold ? (k % 2 ? '#ffd86a' : '#e8a82a') : k % 2 ? sb : sa;
      ctx.beginPath(); ctx.moveTo(x0, top);
      ctx.lineTo(x1, top);
      ctx.quadraticCurveTo(x1 + belly * Math.sin((k + 0.5) / 6 * Math.PI) * 0.6 + luff, (top + bot) / 2, x1, bot);
      ctx.lineTo(x0, bot);
      ctx.quadraticCurveTo(x0 + belly * Math.sin(k / 6 * Math.PI) * 0.6 + luff, (top + bot) / 2, x0, top);
      ctx.closePath(); ctx.fill();
    }
    if (o.torn) { ctx.fillStyle = 'rgba(30,40,60,0.85)'; ctx.beginPath(); ctx.moveTo(mastX + 10, top + 20); ctx.lineTo(mastX + 24, top + 36 + o.torn * 30); ctx.lineTo(mastX + 2, top + 40 + o.torn * 20); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(90,52,24,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mastX, mastTop); ctx.lineTo(hl - 10, -26); ctx.moveTo(mastX, mastTop); ctx.lineTo(-hl + 14, -26); ctx.stroke();
    // oars below the shields, sweeping in time
    if (o.oars !== null && o.oars !== undefined) {
      const n = 7, ph = o.oars * TAU, spread = o.oarSpread === undefined ? 1 : o.oarSpread;
      ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 3;
      for (let k = 0; k < n; k++) {
        const ox = -hl + 40 + k * (len - 80) / (n - 1), a = Math.sin(ph + k * 0.15) * 0.45 * spread;
        ctx.beginPath(); ctx.moveTo(ox, -8); ctx.lineTo(ox - 22 + Math.sin(a) * 30, 22 + Math.cos(ph + k * 0.15) * 6 * spread); ctx.stroke();
      }
    }
    // the hull: a long curved boat with a stripe
    const hg = ctx.createLinearGradient(0, -24, 0, 18);
    hg.addColorStop(0, COL.woodHi); hg.addColorStop(1, COL.woodDark);
    ctx.fillStyle = hg; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-hl - 10, -40);
    ctx.quadraticCurveTo(-hl + 6, -18, -hl + 30, -20);
    ctx.lineTo(hl - 30, -20);
    ctx.quadraticCurveTo(hl - 6, -18, hl + 10, -42);
    ctx.quadraticCurveTo(hl + 4, 0, hl - 40, 14);
    ctx.lineTo(-hl + 40, 14);
    ctx.quadraticCurveTo(-hl - 4, 0, -hl - 10, -40);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(58,34,16,0.6)'; ctx.lineWidth = 1;
    for (const yy of [-8, 2]) { ctx.beginPath(); ctx.moveTo(-hl + 10, yy); ctx.quadraticCurveTo(0, yy + 4, hl - 10, yy); ctx.stroke(); }
    ctx.fillStyle = '#e8b42a'; ctx.fillRect(-hl + 24, -19, len - 48, 3);
    // the bite out of the stern rail
    if (o.bitten) { ctx.fillStyle = 'rgba(20,30,40,0.9)'; ctx.beginPath(); ctx.arc(-hl + 30, -20, 8 + o.bitten * 8, 0, Math.PI); ctx.fill(); }
    // the dragon prow and the curled stern
    ctx.fillStyle = COL.wood; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hl + 4, -36); ctx.quadraticCurveTo(hl + 18, -60, hl + 10, -74); ctx.quadraticCurveTo(hl + 24, -82, hl + 34, -74); ctx.lineTo(hl + 30, -70); ctx.quadraticCurveTo(hl + 22, -72, hl + 18, -64); ctx.quadraticCurveTo(hl + 22, -46, hl + 12, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23a'; circle(hl + 24, -76, 2.2); ctx.fill();
    ctx.fillStyle = '#c8323a'; ctx.beginPath(); ctx.moveTo(hl + 34, -74); ctx.lineTo(hl + 40, -72); ctx.lineTo(hl + 33, -70); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-hl - 6, -36); ctx.quadraticCurveTo(-hl - 20, -58, -hl - 6, -66); ctx.quadraticCurveTo(-hl + 6, -66, -hl + 2, -56); ctx.quadraticCurveTo(-hl - 6, -56, -hl - 4, -48); ctx.quadraticCurveTo(-hl + 2, -40, -hl + 2, -32); ctx.closePath(); ctx.fillStyle = COL.wood; ctx.fill(); ctx.stroke();
    // shields along the rail
    const sh = o.shields || [0, 1, 2, 3, 0, 1, 2].map(k => SHIELD_COLS[k]);
    for (let k = 0; k < sh.length; k++) {
      if (!sh[k]) continue;
      const sx = -hl + 36 + k * (len - 72) / Math.max(1, sh.length - 1);
      K.shield(sx, -22, 9, { col: sh[k][0], col2: sh[k][1], rot: k * 0.4 });
    }
    ctx.restore();
  };
  K.SHIELD_COLS = SHIELD_COLS;

  /* ---------- northern scenery ---------- */
  K.sky = (cx, t, o = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (o.night) { g.addColorStop(0, '#081428'); g.addColorStop(0.6, '#1a2e4a'); g.addColorStop(1, '#2e4a62'); }
    else if (o.dusk) { g.addColorStop(0, '#3a3a6a'); g.addColorStop(0.55, '#c87a7a'); g.addColorStop(1, '#f2c27a'); }
    else { g.addColorStop(0, '#7a8ea0'); g.addColorStop(0.6, '#b8c8d2'); g.addColorStop(1, '#dfe8ec'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (o.night) {
      for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * H_(i) * (0.6 + 0.4 * Math.sin(t * 2 + i))) + ')'; ctx.fillRect(((H_(i + 3) * W - cx * 0.02) % W + W) % W, H_(i + 9) * 220, 1.6, 1.6); }
      // the aurora: three soft green-violet curtains that ripple
      for (let k = 0; k < 3; k++) {
        const base = 70 + k * 30, col = k === 1 ? 'rgba(160,110,255,0.16)' : 'rgba(90,255,170,0.2)';
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, base + 80);
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base + Math.sin(x * 0.008 + t * 0.5 + k * 2) * 26 + Math.sin(x * 0.02 - t * 0.8) * 8);
        for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, base + 90 + Math.sin(x * 0.01 + t * 0.4 + k) * 20);
        ctx.closePath(); ctx.fill();
      }
    } else if (o.dusk) {
      const sg = ctx.createRadialGradient(760, 250, 4, 760, 250, 120);
      sg.addColorStop(0, 'rgba(255,240,200,0.95)'); sg.addColorStop(0.2, 'rgba(255,210,150,0.6)'); sg.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = sg; ctx.fillRect(600, 120, 320, 260);
    } else {
      // low grey clouds drifting
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 6; i++) {
        const span = W + 400, x = ((i * 233 - cx * 0.04 + t * (5 + i)) % span + span) % span - 200, y = 40 + (i * 47) % 110;
        ctx.beginPath(); ctx.ellipse(x, y, 90 + (i % 3) * 30, 16 + (i % 2) * 6, 0, 0, TAU); ctx.fill();
      }
    }
    if (o.storm) { ctx.fillStyle = 'rgba(20,28,40,' + clamp(o.storm, 0, 1) * 0.45 + ')'; ctx.fillRect(0, 0, W, H); }
    if (o.sleet) {
      ctx.strokeStyle = 'rgba(230,240,250,' + 0.5 * clamp(o.sleet, 0, 1) + ')'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 70; i++) { const x = ((H_(i) * W * 1.4 - t * 260 - cx * 0.3) % (W + 100) + W + 100) % (W + 100) - 50, y = ((H_(i + 50) * H + t * 420) % H); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 14); }
      ctx.stroke();
    }
  };
  K.fjords = (cx, t, o = {}) => {
    const base = o.base || 300, par = o.par || 0.08;
    for (const [k, p, col, snow, hMin, hMax] of [[0, par, '#5a6a7a', '#e8eef2', 120, 200], [1, par * 2.2, '#3e4a58', '#d8e2e8', 70, 150]]) {
      const step = 140 + k * 40, off = cx * p;
      ctx.fillStyle = o.dim ? 'rgba(40,50,60,1)' : col;
      ctx.beginPath(); ctx.moveTo(0, base + 10);
      const i0 = Math.floor(off / step) - 1;
      for (let i = i0; i < i0 + W / step + 3; i++) {
        const x = i * step - off, h = hMin + H_(i * 7 + k * 31) * (hMax - hMin);
        ctx.lineTo(x, base - h * 0.35); ctx.lineTo(x + step * 0.4, base - h); ctx.lineTo(x + step * 0.7, base - h * 0.6);
      }
      ctx.lineTo(W, base + 10); ctx.closePath(); ctx.fill();
      // snow caps
      ctx.fillStyle = snow;
      for (let i = i0; i < i0 + W / step + 3; i++) {
        const x = i * step - off, h = hMin + H_(i * 7 + k * 31) * (hMax - hMin);
        ctx.beginPath(); ctx.moveTo(x + step * 0.4, base - h); ctx.lineTo(x + step * 0.4 - 18, base - h + 26); ctx.lineTo(x + step * 0.4 - 4, base - h + 20); ctx.lineTo(x + step * 0.4 + 6, base - h + 28); ctx.lineTo(x + step * 0.4 + 16, base - h + 16); ctx.closePath(); ctx.fill();
      }
    }
    if (o.dim) { ctx.fillStyle = 'rgba(20,30,40,' + o.dim * 0.4 + ')'; ctx.fillRect(0, 0, W, base + 10); }
  };
  K.fog = (x0, x1, t, a) => {
    for (let i = 0; i < 7; i++) {
      const y = 120 + i * 50 + Math.sin(t * 0.5 + i) * 10, g = ctx.createLinearGradient(x0, 0, x0 + 80, 0);
      g.addColorStop(0, 'rgba(220,230,236,0)'); g.addColorStop(1, 'rgba(220,230,236,' + a + ')');
      ctx.fillStyle = g; ctx.fillRect(x0, y - 40, x1 - x0, 90);
    }
  };

  /* ---------- sounds ---------- */
  Sfx.extra.vikingHorn = function () { this.tone(147, 0.7, 'sawtooth', 0.03, 165); this.tone(220, 0.6, 'triangle', 0.03, 247, 0.05); };
  Sfx.extra.vikingDrum = function (p) { p = p || 1; this.tone(90 * p, 0.12, 'sine', 0.09, 50); this.tone(180 * p, 0.03, 'square', 0.015, 120); };
  Sfx.extra.vikingOar = function (p) { p = p || 1; this.tone(160 * p, 0.12, 'triangle', 0.03, 110 * p); this.tone(600 * p, 0.06, 'sawtooth', 0.006, 300 * p, 0.03); };
  Sfx.extra.vikingWave = function () { this.tone(300, 0.5, 'sawtooth', 0.01, 80); this.tone(1400, 0.4, 'square', 0.004, 600, 0.05); };
  Sfx.extra.vikingHiss = function () { this.tone(2200, 0.6, 'sawtooth', 0.008, 3000); this.tone(1800, 0.5, 'square', 0.005, 2600, 0.1); };
  Sfx.extra.vikingRoar = function () { this.tone(110, 0.8, 'sawtooth', 0.05, 60); this.tone(160, 0.6, 'square', 0.025, 80, 0.05); };
  Sfx.extra.vikingChop = function (p) { p = p || 1; this.tone(900 * p, 0.04, 'square', 0.03, 400 * p); this.tone(220 * p, 0.06, 'triangle', 0.04, 140); };
  Sfx.extra.vikingThunk = function () { this.tone(420, 0.05, 'square', 0.03, 200); this.tone(130, 0.08, 'triangle', 0.04, 90, 0.01); };
  Sfx.extra.vikingCheer = function () { [392, 494, 587, 784, 587, 784, 988].forEach((f, i) => this.tone(f, 0.13, 'square', 0.03, null, i * 0.08)); };
  Sfx.extra.vikingHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.vikingPop = function (p) { p = p || 1; this.tone(880 * p, 0.05, 'triangle', 0.035, 1320 * p); this.tone(1320 * p, 0.08, 'sine', 0.025, null, 0.04); };
  Sfx.extra.vikingSplash = function () { this.tone(500, 0.25, 'sawtooth', 0.012, 120); this.tone(1600, 0.2, 'square', 0.004, 500, 0.02); };
  Sfx.extra.vikingClang = function () { this.tone(1200, 0.08, 'square', 0.025, 900); this.tone(600, 0.2, 'triangle', 0.03, 560, 0.02); };
  return K;
})();
