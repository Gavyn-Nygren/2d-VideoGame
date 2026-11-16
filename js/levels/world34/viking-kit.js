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
  for (const k of ['FONT', 'pic', 'lerp', 'smooth', 'hash', 'mmss', 'stubMap', 'BREAK', 'quiet', 'key', 'track', 'both', 'idle', 'actLabels',
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
  // a shield is drawn once per look into a picture (K.pic) and copied: a longship carries seven
  K.shield = (x, y, r, o = {}) => {
    const rot = Math.round((o.rot || 0) * 50) / 50, rr2 = Math.round(r * 2) / 2, e = Math.ceil(rr2 + 3);
    K.pic('shield|' + (o.col || '') + (o.col2 || '') + '|' + rr2 + '|' + rot + '|' + (o.boss !== false), e * 2, e * 2, e, e, () => shieldArt(rr2, rot, o), x, y);
  };
  function shieldArt(r, rot, o) {
    const c1 = o.col || '#c8323a', c2 = o.col2 || '#f2e6c8';
    ctx.save(); ctx.rotate(rot);
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, -Math.PI / 2, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, Math.PI / 2, Math.PI); ctx.closePath(); ctx.fill();
    // a soft shade on the lower right, painted planks, the iron rim with rivets, a boss with a glint
    ctx.fillStyle = 'rgba(20,10,0,0.16)'; ctx.beginPath(); ctx.arc(0, 0, r, -0.2, Math.PI * 0.85); ctx.arc(r * 0.18, -r * 0.18, r * 0.92, Math.PI * 0.85, -0.2, true); ctx.closePath(); ctx.fill();
    if (r >= 8) { ctx.strokeStyle = 'rgba(60,30,10,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); for (const d of [-0.5, 0.5]) { ctx.moveTo(d * r, -r * 0.86); ctx.lineTo(d * r, r * 0.86); } ctx.stroke(); }
    ctx.strokeStyle = '#5a3418'; ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    if (r >= 8) { ctx.fillStyle = '#d8c8a0'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.2, rv = Math.max(0.7, r * 0.06), vx = Math.cos(a) * r * 0.93, vy = Math.sin(a) * r * 0.93; ctx.moveTo(vx + rv, vy); ctx.arc(vx, vy, rv, 0, TAU); } ctx.fill(); }
    if (o.boss !== false) {
      ctx.fillStyle = '#b8bec8'; circle(0, 0, r * 0.28); ctx.fill(); ctx.strokeStyle = '#4a4e56'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; circle(-r * 0.08, -r * 0.09, r * 0.09); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, Math.PI * 1.05, Math.PI * 1.45); ctx.arc(0, 0, r * 0.62, Math.PI * 1.45, Math.PI * 1.05, true); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ---------- the sea ---------- */
  K.waveLine = (x0, x1, y, scroll, t, amp, col, w) => {
    ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) { const yy = y + Math.sin((x + scroll) * 0.035 + t * 1.6) * amp + Math.sin((x + scroll) * 0.013 - t) * amp * 0.6; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
  };
  K.sea = (scroll, t, y0, o = {}) => {
    const rough = o.rough || 0, rows = o.rows || [y0, y0 + 44, y0 + 88];
    const deep = o.col || COL.sea, hi = o.hi || COL.seaHi, dark = o.dark || COL.seaDark;
    // the water's gradient and a pale sheen of sky on the far water never move: one solid picture
    K.pic('vsea|' + y0 + deep + hi + dark, W, H - y0 + 6, 0, 0, () => {
      ctx.translate(0, 6 - y0);
      const g = ctx.createLinearGradient(0, y0 - 10, 0, H);
      g.addColorStop(0, hi); g.addColorStop(0.35, deep); g.addColorStop(1, dark);
      ctx.fillStyle = g; ctx.fillRect(0, y0 - 6, W, H - y0 + 6);
      ctx.fillStyle = 'rgba(230,240,246,0.16)'; ctx.fillRect(0, y0 - 6, W, 5);
      ctx.fillStyle = 'rgba(230,240,246,0.08)'; ctx.fillRect(0, y0 - 1, W, 9);
    }, 0, y0 - 6, true);
    // little glints that wink as the swell rolls
    for (const [lo, hi2, al] of [[0.35, 0.7, 0.16], [0.7, 2, 0.4]]) {
      ctx.fillStyle = 'rgba(240,250,255,' + al + ')'; ctx.beginPath();
      for (let i = 0; i < 26; i++) {
        const a = Math.sin(t * 2.2 + i * 1.7); if (a < lo || a >= hi2) continue;
        const gx = ((H_(i + 70) * (W + 80) - scroll * (0.25 + H_(i + 71) * 0.4)) % (W + 80) + W + 80) % (W + 80) - 40, gy = y0 + 6 + H_(i + 72) * (H - y0 - 10);
        ctx.rect(gx, gy, 6 + H_(i + 73) * 10, 1.5);
      }
      ctx.fill();
    }
    rows.forEach((ry, k) => {
      const sp = 0.4 + k * 0.3, amp = 3 + k * 1.5 + rough * 4, sc = scroll * sp;
      // a slightly darker band under each crest line, then the crest with foam
      ctx.fillStyle = 'rgba(10,30,50,' + (0.08 + k * 0.05) + ')';
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, ry + Math.sin((x + sc) * 0.03 + t * (1.2 + k * 0.3)) * amp);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      K.waveLine(0, W, ry, sc, t * (1 + k * 0.2), amp, 'rgba(232,244,246,' + (0.35 + k * 0.12) + ')', 2 + k * 0.5);
      // foam flecks
      ctx.fillStyle = 'rgba(232,244,246,0.5)'; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const fx = ((i * 131 - sc * 1.2) % (W + 60) + W + 60) % (W + 60) - 30, fy = ry + 10 + (i * 7) % 18; ctx.rect(fx, fy, 10 + (i % 3) * 6, 2); }
      ctx.fill();
    });
  };
  K.splash = (st, x, y, n = 8) => { for (let i = 0; i < n; i++) K.part(st, x + (Math.random() - 0.5) * 30, y, (Math.random() - 0.5) * 220, -120 - Math.random() * 220, 0.7, i % 2 ? '#e8f4f6' : '#9fd0e0', 3 + Math.random() * 2, 700, 'dot'); };
  const SHIELD_COLS = [['#c8323a', '#f2e6c8'], ['#2a5aa8', '#f2e6c8'], ['#e8b42a', '#5a3418'], ['#3a8a4a', '#f2e6c8']];
  K.longship = (x, y, o = {}) => {
    const s = o.s || 1, len = (o.len || 220), t = G.clock || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-(o.tilt || 0));
    const hl = len / 2;
    // the hull's dark reflection on the water
    ctx.fillStyle = 'rgba(8,24,40,0.28)'; ctx.beginPath(); ctx.ellipse(0, 18, hl * 0.95, 7, 0, 0, TAU); ctx.fill();
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
    // the sail's belly in shade low down and on its far edge, a stitched hem and the yard's shadow
    {
      const sg = ctx.createLinearGradient(0, top, 0, bot);
      sg.addColorStop(0, 'rgba(255,255,255,0.12)'); sg.addColorStop(0.45, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(40,20,10,0.22)');
      ctx.fillStyle = sg; ctx.fillRect(mastX - 54, top, 108 + belly * 0.6, bot - top);
      ctx.fillStyle = 'rgba(40,20,10,0.25)'; ctx.fillRect(mastX - 54, top, 108, 3);
      ctx.strokeStyle = 'rgba(60,30,10,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(mastX - 52, bot - 3); ctx.lineTo(mastX + 54, bot - 3); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(mastX - 2, mastTop, 1.5, 150);
    ctx.fillStyle = COL.woodHi; ctx.fillRect(mastX - 56, mastTop + 12, 112, 1.5);
    if (o.torn) { ctx.fillStyle = 'rgba(30,40,60,0.85)'; ctx.beginPath(); ctx.moveTo(mastX + 10, top + 20); ctx.lineTo(mastX + 24, top + 36 + o.torn * 30); ctx.lineTo(mastX + 2, top + 40 + o.torn * 20); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(90,52,24,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mastX, mastTop); ctx.lineTo(hl - 10, -26); ctx.moveTo(mastX, mastTop); ctx.lineTo(-hl + 14, -26); ctx.stroke();
    // oars below the shields, sweeping in time
    if (o.oars !== null && o.oars !== undefined) {
      const n = 7, ph = o.oars * TAU, spread = o.oarSpread === undefined ? 1 : o.oarSpread;
      ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 3; ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const ox = -hl + 40 + k * (len - 80) / (n - 1), a = Math.sin(ph + k * 0.15) * 0.45 * spread;
        ctx.moveTo(ox, -8); ctx.lineTo(ox - 22 + Math.sin(a) * 30, 22 + Math.cos(ph + k * 0.15) * 6 * spread);
      }
      ctx.stroke();
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
    // overlapping strakes (clinker planks), each with a lit lip and a row of iron rivets
    ctx.strokeStyle = 'rgba(58,34,16,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (const yy of [-12, -3, 6]) { ctx.moveTo(-hl + 6, yy - 6); ctx.quadraticCurveTo(0, yy + 4, hl - 6, yy - 6); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,170,0.22)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const yy of [-12, -3, 6]) { ctx.moveTo(-hl + 8, yy - 4.8); ctx.quadraticCurveTo(0, yy + 5.2, hl - 8, yy - 4.8); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,24,12,0.55)'; ctx.beginPath();
    for (const yy of [-12, -3, 6]) for (let k = 1; k < 12; k++) { const u = k / 12, rx = -hl + 6 + u * (len - 12), ry = yy - 6 + 4 * (1 - (2 * u - 1) * (2 * u - 1)) * 2.5 + 2; ctx.rect(rx, ry, 1.6, 1.6); }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,190,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-hl + 30, -19); ctx.lineTo(hl - 30, -19); ctx.stroke();
    ctx.fillStyle = '#e8b42a'; ctx.fillRect(-hl + 24, -19, len - 48, 3);
    ctx.fillStyle = 'rgba(120,70,10,0.5)'; ctx.fillRect(-hl + 24, -17, len - 48, 1);
    // the bite out of the stern rail
    if (o.bitten) { ctx.fillStyle = 'rgba(20,30,40,0.9)'; ctx.beginPath(); ctx.arc(-hl + 30, -20, 8 + o.bitten * 8, 0, Math.PI); ctx.fill(); }
    // the dragon prow and the curled stern
    ctx.fillStyle = COL.wood; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hl + 4, -36); ctx.quadraticCurveTo(hl + 18, -60, hl + 10, -74); ctx.quadraticCurveTo(hl + 24, -82, hl + 34, -74); ctx.lineTo(hl + 30, -70); ctx.quadraticCurveTo(hl + 22, -72, hl + 18, -64); ctx.quadraticCurveTo(hl + 22, -46, hl + 12, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
    // carved scales down the neck and a lit edge on the curl
    ctx.strokeStyle = 'rgba(58,34,16,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = 0; k < 4; k++) { const sy = -40 - k * 8, sx2 = hl + 12 + k * 1.5; ctx.moveTo(sx2 + 3.2 * Math.cos(0.2), sy + 3.2 * Math.sin(0.2)); ctx.arc(sx2, sy, 3.2, 0.2, Math.PI - 0.2); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,170,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hl + 6, -38); ctx.quadraticCurveTo(hl + 19, -60, hl + 12, -73); ctx.stroke();
    ctx.fillStyle = '#ffd23a'; circle(hl + 24, -76, 2.2); ctx.fill();
    ctx.fillStyle = '#1a1008'; circle(hl + 24.5, -76, 1); ctx.fill();
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
    // the gradient (and the sun) never move on the screen: one solid picture, copied each frame (a full-screen
    // gradient fill is one of the slowest things to draw on a phone)
    const mode = o.night ? 'night' : o.dusk ? 'dusk' : 'day';
    K.pic('vsky|' + mode, W, H, 0, 0, () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      if (o.night) { g.addColorStop(0, '#081428'); g.addColorStop(0.6, '#1a2e4a'); g.addColorStop(1, '#2e4a62'); }
      else if (o.dusk) { g.addColorStop(0, '#3a3a6a'); g.addColorStop(0.55, '#c87a7a'); g.addColorStop(1, '#f2c27a'); }
      else { g.addColorStop(0, '#7a8ea0'); g.addColorStop(0.6, '#b8c8d2'); g.addColorStop(1, '#dfe8ec'); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (o.dusk) {
        const sg = ctx.createRadialGradient(760, 250, 4, 760, 250, 120);
        sg.addColorStop(0, 'rgba(255,240,200,0.95)'); sg.addColorStop(0.2, 'rgba(255,210,150,0.6)'); sg.addColorStop(1, 'rgba(255,200,150,0)');
        ctx.fillStyle = sg; ctx.fillRect(600, 120, 320, 260);
      } else if (!o.night) {
        // a pale sun behind the overcast
        ctx.fillStyle = 'rgba(255,250,235,0.22)'; circle(780, 92, 70); ctx.fill();
        ctx.fillStyle = 'rgba(255,250,235,0.45)'; circle(780, 92, 34); ctx.fill();
      }
    }, 0, 0, true);
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
    } else if (!o.dusk) {
      // low cloud banks drifting: a grey belly, puffy white tops and a lit rim
      // (all six banks share three paths: one fill each for the bellies, the banks and the lit tops)
      const banks = [];
      for (let i = 0; i < 6; i++) {
        const span = W + 400, x = ((i * 233 - cx * 0.04 + t * (5 + i)) % span + span) % span - 200, y = 40 + (i * 47) % 110;
        banks.push([i, x, y, 90 + (i % 3) * 30, 16 + (i % 2) * 6]);
      }
      ctx.fillStyle = 'rgba(96,112,130,0.28)'; ctx.beginPath();
      for (const [, x, y, rw, rh] of banks) { ctx.moveTo(x + 6 + rw, y + rh * 0.45); ctx.ellipse(x + 6, y + rh * 0.45, rw, rh * 0.8, 0, 0, TAU); }
      ctx.fill();
      ctx.fillStyle = 'rgba(236,242,246,0.5)'; ctx.beginPath();
      for (const [i, x, y, rw, rh] of banks) {
        ctx.moveTo(x + rw, y); ctx.ellipse(x, y, rw, rh, 0, 0, TAU);
        for (let k = 0; k < 4; k++) { const px = x - rw * 0.6 + k * rw * 0.4, pr = rh * (0.9 + H_(i * 5 + k) * 0.7); ctx.moveTo(px + pr * 1.3, y - rh * 0.35); ctx.ellipse(px, y - rh * 0.35, pr * 1.3, pr, 0, 0, TAU); }
      }
      ctx.fill('nonzero');
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath();
      for (const [, x, y, rw, rh] of banks) { ctx.moveTo(x - rw * 0.2 + rw * 0.4, y - rh * 0.85); ctx.ellipse(x - rw * 0.2, y - rh * 0.85, rw * 0.4, rh * 0.32, 0, 0, TAU); }
      ctx.fill();
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
    // a hazy far range first, barely darker than the sky
    {
      const step = 110, off = cx * par * 0.5, i0 = Math.floor(off / step) - 1;
      ctx.fillStyle = o.dim ? 'rgba(52,62,74,0.5)' : 'rgba(132,148,164,0.4)';
      ctx.beginPath(); ctx.moveTo(0, base + 10);
      for (let i = i0; i < i0 + W / step + 3; i++) { const x = i * step - off, h = 120 + H_(i * 3 + 91) * 70; ctx.lineTo(x, base - h * 0.6); ctx.lineTo(x + step * 0.5, base - h); }
      ctx.lineTo(W, base + 10); ctx.closePath(); ctx.fill();
    }
    for (const [k, p, col, snow, hMin, hMax] of [[0, par, '#5a6a7a', '#e8eef2', 120, 200], [1, par * 2.2, '#3e4a58', '#d8e2e8', 70, 150]]) {
      const step = 140 + k * 40, off = cx * p, base0 = o.dim ? '#28323c' : col;
      ctx.fillStyle = base0;
      ctx.beginPath(); ctx.moveTo(0, base + 10);
      const i0 = Math.floor(off / step) - 1, i1 = i0 + W / step + 3;
      for (let i = i0; i < i1; i++) {
        const x = i * step - off, h = hMin + H_(i * 7 + k * 31) * (hMax - hMin);
        ctx.lineTo(x, base - h * 0.35); ctx.lineTo(x + step * 0.4, base - h); ctx.lineTo(x + step * 0.7, base - h * 0.6);
      }
      ctx.lineTo(W, base + 10); ctx.closePath(); ctx.fill();
      // the shaded east face of every peak, a lit ridge line on the west, gullies, then snow caps with a shaded side
      ctx.fillStyle = mixCol(base0, '#101824', 0.2 + k * 0.06); ctx.beginPath(); // solid: it never leaves its own cliff
      for (let i = i0; i < i1; i++) {
        const x = i * step - off, h = hMin + H_(i * 7 + k * 31) * (hMax - hMin), px = x + step * 0.4;
        ctx.moveTo(px, base - h); ctx.lineTo(x + step * 0.7, base - h * 0.6); ctx.lineTo(x + step, base - (hMin + H_((i + 1) * 7 + k * 31) * (hMax - hMin)) * 0.35); ctx.lineTo(x + step * 0.62, base + 10); ctx.lineTo(px + 6, base + 10); ctx.closePath();
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,238,244,' + (0.22 - k * 0.06) + ')'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = i0; i < i1; i++) { const x = i * step - off, h = hMin + H_(i * 7 + k * 31) * (hMax - hMin); ctx.moveTo(x, base - h * 0.35); ctx.lineTo(x + step * 0.4, base - h); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(16,24,36,0.18)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = i0; i < i1; i++) {
        const x = i * step - off, h = hMin + H_(i * 7 + k * 31) * (hMax - hMin), px = x + step * 0.4;
        for (let g = 0; g < 2; g++) { const gx = px - 14 + g * 22, gy = base - h + 30 + g * 12; ctx.moveTo(gx, gy); ctx.lineTo(gx - 6 + g * 10, gy + h * 0.35); }
      }
      ctx.stroke();
      // the snow caps, then their shaded sides (each as one path: fewer fills are much quicker on a slow phone)
      const capX = i => i * step - off + step * 0.4, capH = i => hMin + H_(i * 7 + k * 31) * (hMax - hMin);
      ctx.fillStyle = o.dim ? 'rgba(170,184,196,0.8)' : snow; ctx.beginPath();
      for (let i = i0; i < i1; i++) { const px = capX(i), h = capH(i); ctx.moveTo(px, base - h); ctx.lineTo(px - 18, base - h + 26); ctx.lineTo(px - 4, base - h + 20); ctx.lineTo(px + 6, base - h + 28); ctx.lineTo(px + 16, base - h + 16); ctx.closePath(); }
      ctx.fill();
      ctx.fillStyle = o.dim ? 'rgba(120,140,170,0.45)' : mixCol(snow, '#788caa', 0.45); ctx.beginPath();
      for (let i = i0; i < i1; i++) { const px = capX(i), h = capH(i); ctx.moveTo(px, base - h); ctx.lineTo(px + 6, base - h + 28); ctx.lineTo(px + 16, base - h + 16); ctx.closePath(); }
      ctx.fill();
    }
    // a dark line of pines along the shore at the foot of the cliffs
    {
      const off = cx * par * 3.2, step = 13, i0 = Math.floor(off / step) - 1;
      ctx.fillStyle = o.dim ? '#16202a' : '#2a3a40';
      ctx.beginPath();
      for (let i = i0; i < i0 + W / step + 3; i++) {
        if (H_(i * 13 + 5) < 0.18) continue;
        const x = i * step - off, h = 10 + H_(i * 13) * 16;
        ctx.moveTo(x - 5, base + 10); ctx.lineTo(x, base + 10 - h); ctx.lineTo(x + 5, base + 10);
      }
      ctx.fill();
    }
    // mist lying on the water at the cliffs' feet
    const mg = ctx.createLinearGradient(0, base - 30, 0, base + 12);
    mg.addColorStop(0, 'rgba(220,230,236,0)'); mg.addColorStop(1, o.dim ? 'rgba(80,96,110,0.35)' : 'rgba(220,230,236,0.45)');
    ctx.fillStyle = mg; ctx.fillRect(0, base - 30, W, 42);
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
