/* Pip & Bo - World 38 Operation Midnight: shared helpers for the four secret-agent levels (loads before them). */
'use strict';

/* The only global here is SPY. One mission in four acts, one continuous night (Gavyn's order tells the story):
   Count Zero has stolen the Sunrise Diamond and locked it at the top of Zero Tower. 38-1 Agents Pip and Bo climb the
   glass tower and cut in through a window; 38-2 they cross the laser vault and swap the diamond for a snow globe (the
   alarm goes off anyway); 38-3 they slip down through the air vents in the dark with the diamond in a briefcase;
   38-4 they take Count Zero's own speedboat across the harbour to the agency's seaplane.
   The look is a 1960s spy film: deep teal night, warm window light, red lasers, brass and white gadgets. No purple in
   the HUD or cards (Gavyn's menu rule): panels here are charcoal. Not a toddler world (Gavyn): the climb is very high,
   the alarm is loud, the vent robot has red eyes in the dark, the boats really chase. Nobody gets hurt on screen: a
   failure is a dangle on the rope, a comic zap with frizzed hair, a broom banging the vent, a splash, or a restart.
   The players-and-keys, effects and message helpers are World 31's SHRUNK kit (same names and arguments: its header is
   the manual), so this file loads after js/levels/world31/shrunk-kit.js. Pip and Bo are drawn with K.hero (the engine's
   drawPlayer), so they wear the shared outfits defined below (`outfit: 'spyclimb'` etc. on each def) for free, also in
   the previews, the ready card and the title run.
   Nothing here touches the rules of a level and nothing keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = SPY; ... SPY.defs.<mode> = {...}; })();

   From SHRUNK: K.FONT, K.lerp, K.smooth, K.hash, K.mmss, K.stubMap, K.BREAK, K.quiet, K.track, K.both, K.idle, K.actLabels,
     K.hide, K.unhide, K.place, K.fx, K.pop, K.part, K.spark, K.confetti, K.dust, K.poof, K.hint, K.hintOnce, K.msg,
     K.tickFx, K.star, K.drawParts, K.drawPops, K.chip, K.meter, K.medal, K.helpLine, K.drawMsg, K.hero.
   Charcoal versions (same arguments as SHRUNK's): K.panel(id, job, w, h, z), K.prompter(st).
   K.key(id, what)                      a player's own button name (btnLabel; 'up' is the jump button, 'lr' both arrows).
   K.goldHelp(st, text, life)           the gold-help banner (plays spyHelp, counts st.stats.helps).
   Mission story
     K.control(st, text)                Control (the agency) says one line on the radio: a typed bubble, top left.
     K.drawControl(st)                  draws it (call from the HUD); it types in, holds and fades by itself.
     K.STORY                            the four mission lines and the world's last line.
   Shared alert meter (every level has one under its own name: Spotted, Alarm, Noise, Chase)
     K.alertBar(x, y, w, frac, o)       a HUD bar with an icon (o.icon 'eye' | 'bell' | 'ear' | 'hat'), o.label, o.flash.
   Props and people (draw in whatever space the canvas is in)
     K.zero(x, y, o)                    a Zero goon (round, bowler hat, dark glasses, a white 0 on the tie), feet at x, y.
                                        o: s, face, pose 'stand' | 'walk' | 'look' | 'startle' | 'fist' | 'lean',
                                        t (walk clock), torch (a torch beam the way he faces), broom, net.
     K.briefcase(x, y, s, o)            the diamond's briefcase, bottom middle at x, y. o.open 0..1 (the glow spills out),
                                        o.rot, o.gold (how much the seams glow, default 1).
     K.laser(x0, y0, x1, y1, o)         a red beam with a glow and a sparkle where it ends. o: w, a, col, dim, hum 0..1.
     K.radioIcon(x, y, s, t)            Control's little radio waves.
     K.intel(kind, x, y, s, t)          a collectable: 'envelope', 'card', 'gem', 'reel', 'bottle'.
     K.strobe(a)                        the red alarm wash over the whole screen (a 0..1).
   Scenery (no transform)
     K.nightSky(t, o)                   deep teal night sky with stars and a moon. o.moonX, o.moonY, o.dim.
     K.skyline(cx, cy, t, o)            the city at night with parallax (cx, cy camera), lit windows. o.y (horizon),
                                        o.par (0.15), o.far (a second, dimmer row), o.harbour (water and reflections).
     K.searchBeam(x0, y0, x1, y1, w, a) a soft searchlight beam from (x0, y0) to a spot at (x1, y1).
   Sounds (Sfx.play('spyRadio')): spyRadio (Control's blip), spyIntel (a collectable), spyHelp (K.goldHelp), spyAlarm,
     spyHey (a Zero's "Hey!"), spyGrumble, spySting (the stretch-clear four-note hook), spyCheer, spyThud. Levels add their
     own as Sfx.extra.<mode>Name, named for what they are so the texture layers apply.
   Music: SONGS.spysneak (38-1, 38-2), SONGS.spysneakLow (38-3: the same song slower and darker, no hook), SONGS.spychase
     (38-4, the alarm at the end of 38-2 and a Sniffer close behind in 38-3), SONGS.spychaseUp (38-4's last stretch, a
     key change up). Ambience per level: spyHeights, spyVaultHum, spyDucts, spyHarbour. They are registered from here
     (MUSIC_BY_WORLD[37], AMB_BY_LEVEL) so World 38 never touches the lines of js/music-tracks.js.
   Colours: K.COL = { night, nightHi, teal, glass, glassHi, mullion, warm, warmHi, brass, brassDark, laser, laserGlow,
     green, steel, steelDark, ink, cream, zeroSuit }. Gold (C.gold) is kept for help and "press now". */
const SPY = (() => {
  const S = SHRUNK, K = { defs: {} };
  for (const k of ['FONT', 'lerp', 'smooth', 'hash', 'mmss', 'stubMap', 'BREAK', 'quiet', 'track', 'both', 'idle', 'actLabels',
    'hide', 'unhide', 'place', 'fx', 'pop', 'part', 'spark', 'confetti', 'dust', 'poof', 'hint', 'hintOnce', 'msg', 'tickFx', 'star',
    'drawParts', 'drawPops', 'chip', 'meter', 'medal', 'helpLine', 'drawMsg', 'hero']) K[k] = S[k];
  const TAU = Math.PI * 2, H_ = K.hash, FONT = K.FONT;
  const COL = K.COL = {
    night: '#0b2430', nightHi: '#164454', teal: '#1f6a78', glass: '#1d4b5c', glassHi: '#3f8396', mullion: '#9fb6be', warm: '#ffcf6a',
    warmHi: '#fff1c0', brass: '#d8a640', brassDark: '#8a6420', laser: '#ff2a3a', laserGlow: 'rgba(255,60,70,0.35)', green: '#5dff9a',
    steel: '#8c98a0', steelDark: '#4e5960', ink: '#15181c', cream: '#f4ecd8', zeroSuit: '#23272e',
  };
  const PANEL = 'rgba(23,25,29,0.88)';
  K.key = (id, what) => {
    if (what === 'up') return btnLabel(id, 'jump');
    if (what === 'lr') return btnLabel(id, 'move');
    return btnLabel(id, what);
  };
  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('spyHelp');
  };
  // a player's panel at the bottom corner (charcoal, with the player's colour as the edge)
  K.panel = (id, job, w, h, z) => {
    z = z || 1;
    const pw = Math.round(w * z), ph = Math.round(h * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = PANEL; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    text(NAMES[id] + ' · ' + job + (K.quiet(id) ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 13 * z, PCOL[id], 'left');
    return { x: px, y: py, w: pw, h: ph };
  };
  // prompts over the players (SHRUNK's prompter, charcoal): P.say(id, str, x, y, col, pulse) in screen px
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
          text(hn.text, o.x + w / 2, o.y + h / 2 + 0.5, fs, COL.ink, 'center', 'body');
          ctx.globalAlpha = 1;
          return;
        }
        if (K.quiet(id) || !str) return;
        col = col || C.gold;
        ctx.font = FONT(fs);
        const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(w, h, x, y);
        const sc = pulse ? 1 + 0.06 * Math.sin(G.clock * 14) : 1;
        ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(sc, sc);
        ctx.fillStyle = PANEL; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
        text(str, 0, 0.5, fs, col, 'center', 'body');
        ctx.restore();
      },
    };
  };

  /* ---------- the mission story ---------- */
  K.STORY = {
    spyclimb: 'Agents, the diamond is on floor 40. The front door is not an option.',
    spyvault: 'You\'re in. Nobody has ever crossed that vault. Until tonight.',
    spyvents: 'That was the alarm. New plan: go down. Quietly.',
    spyboat: 'Boathouse, now. The seaplane is waiting past the breakwater.',
    last: 'Mission complete. The Sunrise Diamond is going home.',
  };
  K.control = (st, txt, life) => { st.radio = { text: txt, t: 0, life: life || Math.max(4.5, txt.length * 0.045 + 2.6) }; Sfx.play('spyRadio'); };
  K.tickControl = (st, dt) => { if (st.radio && (st.radio.t += dt) > st.radio.life) st.radio = null; };
  K.radioIcon = (x, y, s, t) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = COL.brass; rr(-5, -3, 10, 12, 2); ctx.fill();
    ctx.fillStyle = COL.ink; ctx.fillRect(-3, 0, 6, 1.5); ctx.fillRect(-3, 3, 6, 1.5);
    ctx.strokeStyle = COL.brass; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(3, -3); ctx.lineTo(5, -10); ctx.stroke();
    ctx.strokeStyle = COL.green; ctx.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) {
      const a = 0.35 + 0.65 * ((Math.sin(t * 6 - k * 1.2) + 1) / 2);
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(5, -10, 4 + k * 4, -1.1, 0.2); ctx.stroke();
    }
    ctx.restore();
  };
  K.drawControl = st => {
    const r = st.radio;
    if (!r) return;
    const big = hudBig(), z = big ? 1.25 : 1, fs = 14 * z;
    const n = Math.min(r.text.length, Math.floor(r.t * 34)), shown = r.text.slice(0, n);
    ctx.font = FONT(fs);
    const w = Math.min(W - 40, ctx.measureText(r.text).width + 74 * z), h = 40 * z, x = W / 2 - w / 2, y = big ? 98 : 84;
    ctx.globalAlpha = clamp((r.life - r.t) / 0.4, 0, 1) * clamp(r.t / 0.2, 0, 1);
    ctx.fillStyle = PANEL; rr(x, y, w, h, 12 * z); ctx.fill();
    ctx.strokeStyle = COL.green; ctx.lineWidth = 2; rr(x, y, w, h, 12 * z); ctx.stroke();
    K.radioIcon(x + 22 * z, y + h / 2 + 2, 1.3 * z, G.clock);
    text('CONTROL', x + 46 * z, y + 11 * z, 10 * z, COL.green, 'left', 'body');
    text(shown + (n < r.text.length && Math.floor(G.clock * 6) % 2 ? '▌' : ''), x + 46 * z, y + 27 * z, fs, '#ffffff', 'left', 'body');
    ctx.globalAlpha = 1;
  };

  /* ---------- the alert meter (Spotted, Alarm, Noise, Chase) ---------- */
  const icon = (kind, x, y, s, col) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2;
    if (kind === 'eye') { ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, -9, 9, 0); ctx.quadraticCurveTo(0, 9, -9, 0); ctx.stroke(); circle(0, 0, 3.2); ctx.fill(); }
    else if (kind === 'bell') { ctx.beginPath(); ctx.moveTo(-7, 5); ctx.quadraticCurveTo(-7, -8, 0, -8); ctx.quadraticCurveTo(7, -8, 7, 5); ctx.closePath(); ctx.fill(); circle(0, 7, 2.2); ctx.fill(); }
    else if (kind === 'ear') { ctx.beginPath(); ctx.arc(0, -1, 7, Math.PI * 0.9, Math.PI * 2.3); ctx.quadraticCurveTo(3, 8, -1, 8); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -1, 3, Math.PI, Math.PI * 2.2); ctx.stroke(); }
    else { ctx.beginPath(); ctx.ellipse(0, 4, 10, 2.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -1, 6, 6, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(-6, -1, 12, 4); }
    ctx.restore();
  };
  K.alertBar = (x, y, w, frac, o = {}) => {
    const big = hudBig(), z = big ? 1.25 : 1, h = 24 * z, hot = frac > 0.7;
    ctx.fillStyle = PANEL; rr(x, y, w * z, h, h / 2); ctx.fill();
    if (o.flash || (hot && Math.sin(G.clock * 14) > 0)) { ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2; rr(x, y, w * z, h, h / 2); ctx.stroke(); }
    icon(o.icon || 'eye', x + 16 * z, y + h / 2, 0.85 * z, hot ? '#ff8a7a' : '#ffffff');
    text(o.label || '', x + 30 * z, y + h / 2 + 0.5, 12 * z, '#ffffff', 'left', 'body');
    ctx.font = FONT(12 * z); const lw = ctx.measureText(o.label || '').width;
    const bx = x + 38 * z + lw, bw = w * z - (bx - x) - 12 * z;
    K.meter(bx, y + h / 2 - 5 * z, bw, 10 * z, frac, frac > 0.7 ? '#ff5a5a' : frac > 0.4 ? '#ffb347' : '#8fe3b0');
  };

  /* ---------- props and people ---------- */
  // a Zero goon: round body, bowler hat, dark glasses, a white 0 on the tie
  K.zero = (x, y, o = {}) => {
    const s = o.s || 1, f = o.face || 1, t = o.t || 0, pose = o.pose || 'stand';
    ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
    const walk = pose === 'walk' ? Math.sin(t * 9) : 0, jump = pose === 'startle' ? -6 : 0;
    // legs
    ctx.fillStyle = COL.ink; ctx.fillRect(-8 + walk * 2, -12, 6, 12); ctx.fillRect(2 - walk * 2, -12, 6, 12);
    ctx.fillStyle = '#0a0c0e'; ctx.fillRect(-9 + walk * 2, -3, 8, 3); ctx.fillRect(2 - walk * 2, -3, 8, 3);
    ctx.translate(0, jump);
    // round body in a dark suit, white shirt front, tie with a 0
    ctx.fillStyle = COL.zeroSuit; ctx.beginPath(); ctx.ellipse(0, -26, 15, 17, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.moveTo(-5, -40); ctx.lineTo(5, -40); ctx.lineTo(0, -22); ctx.fill();
    ctx.fillStyle = '#a8262e'; ctx.beginPath(); ctx.moveTo(-2, -39); ctx.lineTo(2, -39); ctx.lineTo(3, -25); ctx.lineTo(0, -21); ctx.lineTo(-3, -25); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(0, -30, 1.2, 1.8, 0, 0, TAU); ctx.stroke();
    // arms
    ctx.strokeStyle = COL.zeroSuit; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const arm = pose === 'fist' ? [[-12, -32, -18, -46 + Math.sin(t * 16) * 3], [12, -32, 16, -22]] : pose === 'startle' ? [[-12, -32, -20, -44], [12, -32, 20, -44]] :
      pose === 'look' ? [[-12, -32, -16, -20], [12, -32, 8, -44]] : [[-12, -32, -15 - walk * 3, -18], [12, -32, 15 + walk * 3, -18]];
    for (const a of arm) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[2], a[3]); ctx.stroke(); }
    ctx.fillStyle = '#f0c8a0'; for (const a of arm) { circle(a[2], a[3], 3); ctx.fill(); }
    // head
    ctx.fillStyle = '#f0c8a0'; circle(0, -48, 9); ctx.fill();
    ctx.fillStyle = '#0c0e10'; rr(-7, -51, 14, 5, 2); ctx.fill(); // dark glasses
    if (pose === 'startle') { ctx.fillStyle = '#ffffff'; circle(-3, -49, 1.4); ctx.fill(); circle(4, -49, 1.4); ctx.fill(); }
    ctx.strokeStyle = '#7a4a3a'; ctx.lineWidth = 1.2; ctx.beginPath();
    if (pose === 'fist' || pose === 'startle') ctx.arc(1, -42, 2.6, 0, Math.PI, true); else ctx.arc(1, -44, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
    // bowler hat
    ctx.fillStyle = '#111316'; ctx.beginPath(); ctx.ellipse(0, -55, 12, 2.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -57, 8, 7, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(-8, -57, 16, 2);
    if (o.torch) {
      ctx.fillStyle = '#c8c8c8'; ctx.fillRect(15, -22, 6, 3);
      const gl = ctx.createLinearGradient(20, -20, 120, -20); gl.addColorStop(0, 'rgba(255,240,180,0.55)'); gl.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(21, -21); ctx.lineTo(120, -50); ctx.lineTo(120, 10); ctx.closePath(); ctx.fill();
    }
    if (o.broom) { ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, -20); ctx.lineTo(10, -78); ctx.stroke(); ctx.fillStyle = '#d8b060'; ctx.fillRect(4, -88, 12, 10); }
    if (o.net) { ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, -30); ctx.lineTo(40, -50); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(48, -54, 10, 0, TAU); ctx.stroke(); }
    ctx.restore();
  };
  // the briefcase with the Sunrise Diamond: black leather, brass corners, gold light at the seams
  K.briefcase = (x, y, s = 1, o = {}) => {
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(s, s);
    const gl = o.gold == null ? 1 : o.gold, pulse = 0.6 + 0.4 * Math.sin(G.clock * 3);
    if (gl > 0) { ctx.fillStyle = 'rgba(255,214,90,' + (0.22 * gl * pulse) + ')'; circle(0, -8, 18); ctx.fill(); }
    ctx.fillStyle = '#1a1c20'; rr(-13, -17, 26, 17, 3); ctx.fill();
    ctx.strokeStyle = '#2c3036'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, -17); ctx.lineTo(-5, -21); ctx.lineTo(5, -21); ctx.lineTo(5, -17); ctx.stroke();
    ctx.fillStyle = COL.brass; for (const [cx, cy] of [[-13, -17], [11, -17], [-13, -2], [11, -2]]) ctx.fillRect(cx, cy, 2, 2);
    ctx.fillRect(-2, -12, 4, 3);
    ctx.fillStyle = 'rgba(255,214,90,' + (0.55 + 0.45 * pulse) * gl + ')'; ctx.fillRect(-12, -9.8, 24, 1.1);
    if (o.open) { const a = o.open; ctx.fillStyle = 'rgba(255,230,140,' + 0.8 * a + ')'; ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(30, -40 * a - 10); ctx.lineTo(-30, -40 * a - 10); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  };
  // a red laser beam with a soft glow and a sparkle where it lands
  K.laser = (x0, y0, x1, y1, o = {}) => {
    const a = o.a == null ? 1 : o.a, w = o.w || 2.2, dim = o.dim ? 0.35 : 1;
    ctx.save(); ctx.lineCap = 'round';
    ctx.globalAlpha = a * dim * 0.5; ctx.strokeStyle = o.glow || COL.laserGlow; ctx.lineWidth = w * 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.globalAlpha = a * dim; ctx.strokeStyle = o.col || COL.laser; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,220,' + 0.8 * a * dim + ')'; ctx.lineWidth = w * 0.4; ctx.stroke();
    if (o.spark !== false) { const r = 3 + Math.sin(G.clock * 20 + x1) * 1.2; ctx.fillStyle = 'rgba(255,200,200,' + a * dim + ')'; K.star(x1, y1, r + 2, r * 0.4, G.clock * 3); ctx.fill(); }
    ctx.restore();
  };
  // the collectables
  K.intel = (kind, x, y, s = 1, t = 0) => {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3 + x) * 1.5); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,240,170,0.25)'; circle(0, 0, 13); ctx.fill();
    if (kind === 'envelope') {
      ctx.fillStyle = COL.cream; rr(-9, -6, 18, 12, 2); ctx.fill(); ctx.strokeStyle = '#a89870'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(0, 1); ctx.lineTo(9, -6); ctx.stroke();
      ctx.fillStyle = '#c8323a'; circle(0, 1, 2.2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-11, -8, 6, 2.4); // the tape
    } else if (kind === 'card') {
      ctx.fillStyle = '#f2f2f2'; rr(-8, -11, 16, 22, 2); ctx.fill(); ctx.fillStyle = COL.brass; ctx.fillRect(-8, -5, 16, 4); ctx.fillStyle = '#2a7a5a'; ctx.fillRect(-5, 3, 10, 2);
    } else if (kind === 'gem') {
      ctx.fillStyle = '#7ee0ff'; ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-4, -8); ctx.lineTo(4, -8); ctx.lineTo(8, -3); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(0, -3); ctx.lineTo(4, -8); ctx.fill();
    } else if (kind === 'reel') {
      ctx.fillStyle = '#c8ccd2'; circle(0, 0, 8); ctx.fill(); ctx.fillStyle = '#4a5058'; for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + t; circle(Math.cos(a) * 4, Math.sin(a) * 4, 2); ctx.fill(); } circle(0, 0, 1.6); ctx.fill();
      ctx.fillStyle = '#3a2a20'; ctx.fillRect(6, -2, 8, 4);
    } else {
      ctx.fillStyle = 'rgba(150,230,190,0.85)'; rr(-5, -8, 10, 16, 4); ctx.fill(); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-2.5, -12, 5, 4); ctx.fillStyle = COL.cream; ctx.fillRect(-3, -4, 6, 8);
    }
    ctx.restore();
  };
  K.strobe = a => { if (a <= 0) return; ctx.fillStyle = 'rgba(255,30,40,' + 0.28 * a + ')'; ctx.fillRect(0, 0, W, H); };

  /* ---------- scenery ---------- */
  K.nightSky = (t, o = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#061820'); g.addColorStop(0.6, COL.night); g.addColorStop(1, '#174a58');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { const x = H_(i * 3.1) * W, y = H_(i * 7.7) * H * 0.7, tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + H_(i) * 1.5) + i)); ctx.fillStyle = 'rgba(255,255,240,' + 0.5 * tw * (1 - (o.dim || 0)) + ')'; ctx.fillRect(x, y, 1.6, 1.6); }
    const mx = o.moonX == null ? 820 : o.moonX, my = o.moonY == null ? 80 : o.moonY;
    ctx.fillStyle = 'rgba(255,250,220,0.18)'; circle(mx, my, 54); ctx.fill();
    ctx.fillStyle = '#f6f0d6'; circle(mx, my, 30); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,160,0.5)'; circle(mx - 9, my - 6, 6); ctx.fill(); circle(mx + 8, my + 9, 4); ctx.fill();
  };
  // the city at night: towers with lit windows, parallax with the camera
  K.skyline = (cx, cy, t, o = {}) => {
    const base = o.y == null ? 430 : o.y, par = o.par == null ? 0.15 : o.par;
    const rows = o.far === false ? [[par, 1]] : [[par * 0.5, 0.55], [par, 1]];
    for (const [pp, lit] of rows) {
      const off = cx * pp, oy = cy * pp, span = 1400;
      for (let i = -2; i < 26; i++) {
        const seed = i * 13.7 + pp * 100, bw = 40 + H_(seed) * 70, bh = 70 + H_(seed + 1) * (lit < 1 ? 160 : 230);
        let x = i * 70 - (off % span); x = ((x % span) + span) % span - 120;
        if (x > W + 60) continue;
        const y = base - bh - oy * 0.3;
        ctx.fillStyle = lit < 1 ? '#0f3440' : '#0a2a34'; ctx.fillRect(x, y, bw, base - y + 400);
        for (let wy = y + 8; wy < base - 6; wy += 12) for (let wx = x + 6; wx < x + bw - 6; wx += 10) {
          const h = H_(wx * 0.37 + wy * 1.13 + seed);
          if (h > 0.62) { ctx.fillStyle = 'rgba(255,207,106,' + (0.35 + 0.5 * h) * lit + ')'; ctx.fillRect(wx, wy, 4, 6); }
        }
        if (H_(seed + 5) > 0.8) { ctx.fillStyle = Math.sin(t * 3 + i) > 0 ? '#ff4a4a' : '#5a1a1a'; ctx.fillRect(x + bw / 2 - 1, y - 8, 3, 3); }
      }
    }
    if (o.harbour) {
      const wy = base;
      const g = ctx.createLinearGradient(0, wy, 0, H); g.addColorStop(0, '#0d3542'); g.addColorStop(1, '#061a22');
      ctx.fillStyle = g; ctx.fillRect(0, wy, W, H - wy);
      for (let k = 0; k < 40; k++) { const x = (H_(k) * W + t * 10 * (k % 3)) % W, y = wy + 4 + H_(k + 9) * (H - wy); ctx.fillStyle = 'rgba(255,207,106,' + 0.25 * H_(k + 3) + ')'; ctx.fillRect(x, y, 10 + H_(k + 5) * 20, 1.5); }
    }
  };
  K.searchBeam = (x0, y0, x1, y1, w, a = 1) => {
    const ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(255,250,210,' + 0.05 * a + ')'); g.addColorStop(1, 'rgba(255,250,210,' + 0.22 * a + ')');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(len, -w); ctx.lineTo(len, w); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  /* ---------- outfits (Gavyn's rule: one per level; Pip stays orange and Bo blue) ---------- */
  // st.spyLook[id] (if a level sets it) carries the messy states: { crooked, frizz, dust, drip, web }
  const look = id => (typeof G !== 'undefined' && G.mst && G.mst.spyLook && G.mst.spyLook[id]) || {};
  K.look = look;
  defineOutfitPart('spyHarness', { draw(c, o, k) {
    const g = c.g, col = k(o.col || '#2a2e34', c), bk = k(o.buckle || '#d8a640', c);
    g.save(); ofBodyClip(g); g.fillStyle = col;
    g.fillRect(-12, -6.5, 24, 3.2); ofPoly(g, [-8, -13, -5, -13, 2, -3.3, -1, -3.3]); g.fill(); ofPoly(g, [8, -13, 5, -13, -2, -3.3, 1, -3.3]); g.fill();
    g.fillRect(-7, -3.4, 3, 4); g.fillRect(4, -3.4, 3, 4);
    g.fillStyle = bk; g.fillRect(-2, -7, 4, 4.2); g.fillStyle = col; g.fillRect(-1, -6, 2, 2.2);
    g.restore();
    // the rope clip at the belt
    g.strokeStyle = bk; g.lineWidth = 1.2; g.beginPath(); g.arc(c.face >= 0 ? -9 : 9, -4.5, 1.8, 0, Math.PI * 2); g.stroke();
  } });
  defineOutfitPart('spyChalk', { draw(c, o, k) {
    const g = c.g, b = c.face >= 0 ? -1 : 1;
    ofRR(g, b * 9 - 3, -6, 6, 6.5, 2); ofFillStroke(g, k(o.col || '#ffd23f', c), OF_INK, 0.9);
    g.fillStyle = '#ffffff'; g.fillRect(b * 9 - 2.2, -6.2, 4.4, 1.2);
  } });
  defineOutfitPart('spyPads', { draw(c, o, k) {
    const g = c.g, col = k(o.col || '#2a9a9a', c);
    g.save(); ofBodyClip(g); g.fillStyle = col; ofRR(g, -9, -3.4, 6, 3.6, 1.4); g.fill(); ofRR(g, 3, -3.4, 6, 3.6, 1.4); g.fill();
    if (o.elbows) { ofRR(g, -12, -10, 3.4, 4, 1.2); g.fill(); ofRR(g, 8.6, -10, 3.4, 4, 1.2); g.fill(); }
    g.restore();
  } });
  defineOutfitPart('spyKnit', { layer: 'head', lift: 5, draw(c, o, k) {
    // a rolled-up knit cap (the sprout comes out of the top); crooked for a few seconds after a slip
    const g = c.g, col = k(o.col || '#33373e', c), cr = look(c.id).crooked ? 0.32 : 0;
    g.save(); g.translate(0, -24); g.rotate(cr * (c.face >= 0 ? 1 : -1)); g.translate(0, 24);
    g.beginPath(); g.moveTo(-10, -24.5); g.bezierCurveTo(-10, -31.5, 10, -31.5, 10, -24.5); g.closePath(); ofFillStroke(g, col, OF_INK, 1.3);
    ofRR(g, -11, -26.6, 22, 4.4, 2); ofFillStroke(g, k(o.band || '#454a52', c), OF_INK, 1.2);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.8; for (let x = -7; x <= 7; x += 3.5) { g.beginPath(); g.moveTo(x, -26); g.lineTo(x, -22.8); g.stroke(); }
    g.restore();
  } });
  defineOutfitPart('spyHeadlamp', { layer: 'body', hat: true, draw(c, o, k) {
    // a slim headband between the ears with a small headlamp (switched off) at the front
    const g = c.g, cr = look(c.id).crooked ? 1.6 : 0;
    g.save(); ofBodyClip(g); g.fillStyle = k(o.col || '#2a2e34', c); g.fillRect(-12, -24.4 + cr * 0.5, 24, 2.6); g.restore();
    const lx = c.look * 0.8;
    ofRR(g, lx - 3.2, -26.4 + cr, 6.4, 4.4, 1.4); ofFillStroke(g, '#c8ccd2', OF_INK, 0.9);
    g.fillStyle = '#6a7680'; ofCircle(g, lx, -24.2 + cr, 1.4); g.fill();
  } });
  defineOutfitPart('spyCups', { layer: 'front', draw(c, o, k) {
    // big round suction cups on the hands, flattened when clamped
    const g = c.g, fl = look(c.id).clamp ? 0.55 : 1;
    for (const x of [-12.5, 12.5]) { g.beginPath(); g.ellipse(x, -9, 3.6 * fl + 1, 3.6, 0, 0, Math.PI * 2); ofFillStroke(g, '#f4f4f0', OF_INK, 0.9); g.fillStyle = 'rgba(0,0,0,0.12)'; ofCircle(g, x, -9, 1.6); g.fill(); }
  } });
  defineOutfitPart('spyMask', { layer: 'body', draw(c, o, k) {
    // a burglar's eye mask: rounded for Pip, with pointed corners for Bo (the eyes draw on top, clear inside it)
    const g = c.g, lx = c.look, col = k(o.col || '#16181c', c);
    g.fillStyle = col; g.beginPath();
    if (o.pointed) { g.moveTo(-12 + lx, -20.5); g.lineTo(-5 + lx, -20); g.lineTo(0 + lx, -18.6); g.lineTo(5 + lx, -20); g.lineTo(12 + lx, -20.5); g.lineTo(9.4 + lx, -13.2); g.lineTo(0 + lx, -14.6); g.lineTo(-9.4 + lx, -13.2); }
    else { g.moveTo(-10.6 + lx, -18); g.quadraticCurveTo(-5 + lx, -21.6, 0 + lx, -18.6); g.quadraticCurveTo(5 + lx, -21.6, 10.6 + lx, -18); g.quadraticCurveTo(9.6 + lx, -12.4, 5 + lx, -12.8); g.quadraticCurveTo(1.6 + lx, -13.2, 0 + lx, -15); g.quadraticCurveTo(-1.6 + lx, -13.2, -5 + lx, -12.8); g.quadraticCurveTo(-9.6 + lx, -12.4, -10.6 + lx, -18); }
    g.closePath(); g.fill();
  } });
  defineOutfitPart('spyCollar', { draw(c, o, k) {
    // a black turtleneck: a high collar band and the cuffs at the sides
    const g = c.g, col = k(o.col || '#16181c', c);
    g.save(); ofBodyClip(g); g.fillStyle = col; g.fillRect(-12, -9.2, 24, 3.6); g.fillRect(-12, -6, 3.4, 6.5); g.fillRect(8.6, -6, 3.4, 6.5);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(-12, -8.4, 24, 0.8); g.restore();
  } });
  defineOutfitPart('spySlippers', { draw(c, o, k) {
    const g = c.g; g.fillStyle = k(o.col || '#a8acb4', c);
    ofRR(g, -10, -1.6, 8, 2.6, 1.2); g.fill(); ofRR(g, 2, -1.6, 8, 2.6, 1.2); g.fill();
  } });
  defineOutfitPart('spyGloves', { layer: 'front', draw(c, o, k) {
    const g = c.g, col = k(o.col || '#ffffff', c);
    for (const x of [-12, 12]) { ofCircle(g, x, -7.5, 2.8); ofFillStroke(g, col, OF_INK, 0.9); }
  } });
  defineOutfitPart('spyFrizz', { layer: 'head', draw(c, o, k) {
    // after a zap: frizzed hair or sprout and a little smoke
    const f = look(c.id).frizz || 0;
    if (f <= 0) return;
    const g = c.g; g.globalAlpha = Math.min(1, f);
    g.strokeStyle = c.id === 0 ? '#3a8a2a' : '#2a3a7a'; g.lineWidth = 1.1;
    for (let i = 0; i < 7; i++) { const x = -9 + i * 3; g.beginPath(); g.moveTo(x, -25); g.lineTo(x + Math.sin(c.t * 30 + i) * 2, -31 - (i % 2) * 2); g.stroke(); }
    g.fillStyle = 'rgba(200,200,200,0.6)'; ofCircle(g, Math.sin(c.t * 2) * 3, -35 - (c.t * 8) % 6, 2.4); g.fill();
  } });
  defineOutfitPart('spyNV', { layer: 'front', draw(c, o, k) {
    // night-vision goggles pushed up on the forehead (never over the eyes)
    const g = c.g, b = c.face >= 0 ? 1 : -1;
    g.fillStyle = '#2a2e34'; g.fillRect(-11.6, -27.2, 23.2, 2.2);
    for (const ex of [-4.6, 4.6]) { ofRR(g, ex - 3.2 + b, -30.2, 6.4, 5.6, 1.6); ofFillStroke(g, '#3a4048', OF_INK, 0.9); g.fillStyle = '#5dff9a'; ofCircle(g, ex + b, -27.4, 1.6); g.fill(); }
  } });
  defineOutfitPart('spyEarpiece', { layer: 'front', draw(c, o, k) {
    const g = c.g, b = c.face >= 0 ? -1 : 1;
    g.fillStyle = '#f4f4f4'; ofCircle(g, b * 10.4, -16, 1.8); g.fill(); g.strokeStyle = OF_INK; g.lineWidth = 0.6; g.stroke();
    g.strokeStyle = '#d8dce0'; g.lineWidth = 1; g.beginPath(); g.moveTo(b * 10.4, -17.6); g.lineTo(b * 12.6, -24); g.stroke(); g.fillStyle = '#ff6060'; ofCircle(g, b * 12.6, -24.4, 0.8); g.fill();
  } });
  defineOutfitPart('spyVest', { draw(c, o, k) {
    const g = c.g, col = k(o.col || '#2a8a8a', c);
    g.save(); ofBodyClip(g); g.fillStyle = col;
    ofPoly(g, [-12, -12, -3.6, -9.5, -3, 1, -12, 1]); g.fill(); ofPoly(g, [12, -12, 3.6, -9.5, 3, 1, 12, 1]); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(-10, -6, 5, 3.4); g.fillRect(5, -6, 5, 3.4); g.fillRect(-10, -2, 5, 2.4); g.fillRect(5, -2, 5, 2.4);
    g.restore();
  } });
  defineOutfitPart('spyDust', { layer: 'front', draw(c, o, k) {
    // dust smudges that build up through 38-3, and cobwebs on whoever went first through a webbed duct
    const L = look(c.id), d = L.dust || 0, g = c.g;
    if (d > 0) { g.fillStyle = 'rgba(70,64,56,' + Math.min(0.5, d * 0.5) + ')'; for (let i = 0; i < Math.ceil(d * 6); i++) { g.beginPath(); g.ellipse(-8 + K.hash(i) * 16, -22 + K.hash(i + 4) * 20, 2.2, 1.2, i, 0, Math.PI * 2); g.fill(); } }
    if (L.web > 0) { g.strokeStyle = 'rgba(240,240,240,' + Math.min(0.8, L.web) + ')'; g.lineWidth = 0.6; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-11 + i * 1.5, -26); g.lineTo(-4 + i * 2, -18 + i); g.stroke(); } g.beginPath(); g.arc(-8, -24, 4, 0, Math.PI * 2); g.stroke(); }
  } });
  defineOutfitPart('spyTux', { draw(c, o, k) {
    // a dinner-jacket front over the body: lapels and a shirt front (white jacket for Pip, black for Bo)
    const g = c.g, jk = k(o.jacket || '#f4f2ea', c), sh = k(o.shirt || '#ffffff', c), fl = Math.sin(c.t * 18) * Math.min(1, Math.abs(c.vx) / 200 + (o.flutter || 0)) * 1.2;
    g.save(); ofBodyClip(g);
    g.fillStyle = jk; ofPoly(g, [-12, -11, -3, -10, -2.2, 1, -12, 1]); g.fill(); ofPoly(g, [12, -11, 3, -10, 2.2, 1, 12, 1]); g.fill();
    g.fillStyle = sh; ofPoly(g, [-3, -10, 3, -10, 2.2, 1, -2.2, 1]); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; ofPoly(g, [-3, -10, -6.5, -10, -2.6, -2]); g.fill(); ofPoly(g, [3, -10, 6.5, -10, 2.6, -2]); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.35)'; ofCircle(g, 0, -4, 0.6); g.fill(); ofCircle(g, 0, -1.6, 0.6); g.fill();
    g.restore();
    // the jacket's tail flutters behind at speed
    if (fl) { const b = c.face >= 0 ? -1 : 1; g.fillStyle = jk; ofPoly(g, [b * 11, -6, b * (14 + Math.abs(fl) * 2), -3 + fl, b * 11, -1]); g.fill(); }
    if (look(c.id).drip > 0) { g.fillStyle = 'rgba(150,210,255,0.8)'; for (let i = 0; i < 4; i++) { const y = -24 + ((c.t * 30 + i * 7) % 24); ofCircle(g, -8 + i * 5, y, 0.9); g.fill(); } }
  } });
  defineOutfitPart('spyBow', { draw(c, o, k) {
    // a bow tie that flaps with speed
    const g = c.g, col = k(o.col || '#16181c', c), fl = 1 + 0.25 * Math.sin(c.t * 22) * Math.min(1, Math.abs(c.vx) / 150 + (o.flutter || 0));
    g.save(); g.translate(0, -9.6); g.scale(1, fl); g.translate(0, 9.6);
    ofPoly(g, [0, -9.6, -4.4, -12, -4.4, -7.2]); ofFillStroke(g, col, OF_INK, 0.8);
    ofPoly(g, [0, -9.6, 4.4, -12, 4.4, -7.2]); ofFillStroke(g, col, OF_INK, 0.8);
    g.restore(); ofCircle(g, 0, -9.6, 1.1); ofFillStroke(g, col, OF_INK, 0.6);
  } });
  defineOutfitPart('spyVestOpen', { draw(c, o, k) {
    // a life vest worn open over the jacket
    const g = c.g, col = k(o.col || '#ffd23f', c);
    g.save(); ofBodyClip(g); g.fillStyle = col;
    ofRR(g, -12.4, -11, 6, 11.6, 2); g.fill(); ofRR(g, 6.4, -11, 6, 11.6, 2); g.fill();
    g.strokeStyle = OF_INK; g.lineWidth = 0.8; ofRR(g, -12.4, -11, 6, 11.6, 2); g.stroke(); ofRR(g, 6.4, -11, 6, 11.6, 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(-12, -5, 5.4, 1.2); g.fillRect(6.8, -5, 5.4, 1.2);
    g.restore();
  } });
  defineOutfitPart('spyAviators', { layer: 'head', hat: true, draw(c, o, k) {
    // aviator sunglasses pushed up between the ears (it is night: they never come down)
    const g = c.g;
    for (const ex of [-3.6, 3.6]) { g.beginPath(); g.ellipse(ex, -26.6, 3.4, 2.6, 0, 0, Math.PI * 2); ofFillStroke(g, '#2a3a40', '#c8ccd2', 0.9); }
    g.strokeStyle = '#c8ccd2'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-0.6, -27.4); g.lineTo(0.6, -27.4); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-5.6, -28, 1.6, 0.8); g.fillRect(1.6, -28, 1.6, 0.8);
  } });
  defineOutfitPart('spyQuiff', { layer: 'head', lift: 2, draw(c, o, k) {
    // Pip's slicked-back tuxedo hair band (a thin dark band, so Pip's head isn't bare next to Bo's aviators)
    const g = c.g; g.save(); ofBodyClip(g); g.fillStyle = 'rgba(28,24,20,0.55)'; g.fillRect(-12, -26, 24, 2.4); g.restore();
  } });
  // 38-1 night climbers, 38-2 cat burglars, 38-3 gadget crawlers, 38-4 the tuxedo getaway
  defineOutfit('spyclimb', {
    pip: [['spyHarness', { buckle: '#d8a640' }], ['spyChalk', { col: '#ffd23f' }], ['spyKnit', {}], ['spyCups', {}]],
    bo: [['spyHarness', { buckle: '#d8dce0' }], ['spyPads', { col: '#2a9a9a' }], ['spyHeadlamp', {}], ['spyCups', {}]],
  });
  defineOutfit('spyvault', {
    pip: [['spyCollar', {}], ['spySlippers', {}], ['spyMask', {}], ['spyFrizz', {}]],
    bo: [['spyCollar', {}], ['spyMask', { pointed: true }], ['beret', { col: '#16181c' }], ['spyGloves', {}], ['spyFrizz', {}]],
  });
  defineOutfit('spyvents', {
    pip: [['spyPads', { col: '#3a3f46', elbows: true }], ['spyNV', {}], ['spyDust', {}]],
    bo: [['spyVest', { col: '#2a8a8a' }], ['spyPads', { col: '#8a9096', elbows: true }], ['spyEarpiece', {}], ['spyDust', {}]],
  });
  defineOutfit('spyboat', {
    pip: [['spyTux', { jacket: '#f4f2ea' }], ['spyVestOpen', { col: '#ffd23f' }], ['spyBow', { col: '#16181c' }], ['spyQuiff', {}]],
    bo: [['spyTux', { jacket: '#1c1e22', shirt: '#f4f4f4' }], ['spyVestOpen', { col: '#c8ccd2' }], ['spyBow', { col: '#ffffff' }], ['spyAviators', {}]],
  });
  OUTFIT_BY_WORLD[37] = 'spyclimb';

  /* ---------- music and ambience (registered here so World 38 never touches the lines of music-tracks.js) ---------- */
  // a tiptoe spy theme: walking upright bass, finger snaps on 2 and 4, a four-note vibes hook that answers itself,
  // a soft brushed hat and now and then one sly muted-brass "wah". Sparse, with rests, so the level sounds come through.
  SONGS.spysneak = {
    bpm: 104, vol: 0.54, root: 52, scale: 'minor', swing: 0.22, form: ['A', 'A', 'B', 'A'],
    inst: { lead: 'vibes', lead2: 'brass', bass: 'upright' }, oct: { lead: 1 },
    bass: '0 2 3 2',
    drums: { c: '..x...x.', h: 'o.oo.oo.' },
    sec: {
      A: { ch: [0, 0, 5, 4],
        lead: ['. . 0 1 2 . 1 .', '. . . . . . . .', '. . 0 1 2 . 4 .', '2 - 1 - . . . .'],
        lead2: ['. . . .', '. . . .', '. . . .', '. . . -1'] },
      B: { ch: [3, 3, 5, 4],
        lead: ['. . 3 4 5 . 4 .', '. . . . 3 - . .', '. . 5 4 3 . 1 .', '4 - - - . . . .'],
        lead2: ['. . . .', '. . . .', '. . . .', '. . 4 -'] },
    },
  };
  // 38-3: the same song, slower and darker: bass, snaps and a low drone, no hook
  SONGS.spysneakLow = {
    bpm: 88, vol: 0.47, root: 48, scale: 'minor', swing: 0.22, form: ['A', 'A', 'B', 'A'],
    inst: { pad: 'softpad', bass: 'upright', lead: 'vibes' }, oct: { lead: 0 },
    bass: '0 . 2 . 3 . 2 .',
    drums: { c: '..x...x.', z: 'o...o...' },
    sec: {
      A: { ch: [0, 0, 5, 4], lead: ['. . . .', '. . . .', '. . . .', '. . 0 -'] },
      B: { ch: [3, 3, 5, 4], lead: ['. . . .', '. . . .', '. . . .', '. . -1 -'] },
    },
  };
  // the chase: the same four-note hook fast and loud on brass stabs over a driving surf bass, bongos and a full kit
  SONGS.spychase = {
    bpm: 164, vol: 0.39, root: 52, scale: 'minor', form: ['A', 'A', 'B', 'A'],
    inst: { lead: 'brass', lead2: 'pluck', bass: 'sawbass', comp: 'pluck' }, oct: { lead: 1, lead2: 1 },
    bass: '0 0 2 0 3 0 2 0', comp: '. x . x',
    drums: { k: 'x...x...', s: '..x...x.', h: 'xxxxxxxx', D: 'x..x..x.', e: '..x..x.x' },
    sec: {
      A: { ch: [0, 0, 5, 4],
        lead: ['0 . 1 . 2 . 1 .', '0 - - - . . 4 .', '0 . 1 . 2 . 4 .', '2 - 1 - 0 - . .'],
        lead2: ['. . . . . . . .', '7 6 5 4 . . . .', '. . . . . . . .', '. . . . 7 . 7 .'] },
      B: { ch: [3, 3, 5, 4],
        lead: ['3 . 4 . 5 . 4 .', '3 - - - . . 5 .', '5 . 4 . 3 . 1 .', '4 - - - 4 . 4 .'] },
    },
  };
  SONGS.spychaseUp = Object.assign({}, SONGS.spychase, { root: 54, vol: 0.38 });
  MUSIC_BY_WORLD[37] = 'spysneak';
  const SIREN = (A, t, v) => { for (let i = 0; i < 2; i++) { A.chirp(t + i * 0.7, 620, 900, 0.35, v, 'triangle'); A.chirp(t + i * 0.7 + 0.35, 900, 620, 0.35, v, 'triangle'); } };
  Object.assign(AMBIENCE, {
    // 38-1: high thin wind, the city hum far below, a distant siren, flag ropes tapping
    spyHeights: { beds: [{ noise: 'bandpass', f: 1400, q: 1.6, vol: 0.012, lfo: [0.11, 0.7], sweep: [0.06, 500] }, { noise: 'lowpass', f: 240, vol: 0.016, lfo: [0.07, 0.3] }],
      events: [{ every: [12, 24], fn(A, t) { SIREN(A, t, 0.0035); } },
        { every: [2, 5], fn(A, t) { A.chirp(t, 1100, 900, 0.03, 0.006, 'square'); A.chirp(t + 0.12, 1000, 850, 0.03, 0.004, 'square'); } }] },
    // 38-2: a low electric hum, the faint buzz of beams, a ticking clock, the air conditioning
    spyVaultHum: { beds: [{ hum: 'sawtooth', f: 60, lp: 160, vol: 0.016 }, { noise: 'bandpass', f: 3200, q: 3, vol: 0.003, lfo: [0.4, 0.5] }, { noise: 'lowpass', f: 400, vol: 0.01 }],
      events: [{ every: [1, 1], fn(A, t) { A.chirp(t, 2400, 2400, 0.012, 0.006, 'square'); } }] },
    // 38-3: hollow metal rumble, drips, the muffled alarm siren, footsteps and voices below
    spyDucts: { beds: [{ noise: 'lowpass', f: 150, vol: 0.03, lfo: [0.15, 0.4] }, { hum: 'sine', f: 52, vol: 0.012 }],
      events: [{ every: [2, 6], fn(A, t) { A.chirp(t, 1500, 900, 0.05, 0.016); A.chirp(t + 0.16, 1300, 800, 0.04, 0.006); } },
        { every: [6, 12], fn(A, t) { SIREN(A, t, 0.0022); } },
        { every: [3, 7], fn(A, t) { for (let i = 0; i < 4; i++) A.puff(t + i * 0.32, 'lowpass', 300, 0.8, 0.01, 0.06); } }] },
    // 38-4: waves and spray, the engine's drone, gulls, a ship's horn far off
    spyHarbour: { beds: [{ noise: 'lowpass', f: 600, vol: 0.03, lfo: [0.3, 0.6] }, { noise: 'highpass', f: 3600, vol: 0.006, lfo: [0.25, 0.8] }, { hum: 'sawtooth', f: 74, lp: 260, vol: 0.012, lfo: [7, 0.2] }],
      events: [{ every: [6, 14], fn(A, t) { A.chirp(t, 1500, 1000, 0.22, 0.01); A.chirp(t + 0.3, 1450, 950, 0.25, 0.01); } },
        { every: [14, 26], fn(A, t) { A.chirp(t, 110, 108, 1.4, 0.012, 'sawtooth'); A.chirp(t, 138, 136, 1.4, 0.008, 'sawtooth'); } }] },
  });
  Object.assign(AMB_BY_LEVEL, { 'Skyscraper Window Climb': 'spyHeights', 'Laser Vault Heist': 'spyVaultHum', 'Air Vent Crawl': 'spyDucts', 'Speedboat Getaway': 'spyHarbour' });

  /* ---------- shared sounds ---------- */
  Sfx.extra.spyRadio = function () { this.noise(0.08, { type: 'highpass', f: 3000, vol: 0.02 }); this.tone(1320, 0.05, 'square', 0.02); this.tone(1760, 0.07, 'square', 0.018, null, 0.07); };
  Sfx.extra.spyIntel = function () { [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.035, null, i * 0.05)); };
  Sfx.extra.spyHelp = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.04, null, i * 0.08)); };
  Sfx.extra.spyAlarm = function () { for (let i = 0; i < 3; i++) { this.tone(700, 0.25, 'sawtooth', 0.03, 1000, i * 0.5); this.tone(1000, 0.25, 'sawtooth', 0.03, 700, i * 0.5 + 0.25); } };
  Sfx.extra.spyHey = function () { this.tone(330, 0.1, 'sawtooth', 0.04, 420); this.tone(420, 0.16, 'sawtooth', 0.035, 300, 0.1); };
  Sfx.extra.spyGrumble = function () { this.tone(140, 0.3, 'sawtooth', 0.03, 110); this.tone(120, 0.25, 'sawtooth', 0.025, 90, 0.2); };
  Sfx.extra.spySting = function () { [0, 2, 3, 2].forEach((s, i) => { const f = 330 * Math.pow(2, [0, 2, 3, 2][i] / 12); this.tone(f, 0.16, 'sine', 0.05, null, i * 0.13); this.tone(f * 2, 0.16, 'triangle', 0.02, null, i * 0.13); }); this.tone(247, 0.5, 'sawtooth', 0.02, null, 0.52); };
  Sfx.extra.spyCheer = function () { this.fanfare([523, 659, 784, 1047], 0.1, 0.5); };
  Sfx.extra.spyThud = function () { this.tone(90, 0.2, 'sine', 0.06, 50); };
  return K;
})();
