/* Pip & Bo - World 32 Superhero City: shared helpers for the four superhero levels (loads before them). */
'use strict';

/* The only global here is HEROCITY. Pip and Bo are superheroes for a day in a big city: in every level each of them has
   a different power, and the two powers only work together (a speedster pulls the brakes while a strong hero holds up
   the falling beams, a stretchy hero becomes a bridge while a strong hero carries a bus over it...). Powers swap between
   stretches, so both players try both.
   The players-and-keys, effects and HUD helpers are World 31's SHRUNK kit (same names, same arguments: its header is
   the manual for those), so this file loads after js/levels/world31/shrunk-kit.js. What is new here is the city
   scenery, the superhero look (capes, masks, power glows) and the city sounds.
   Nothing here touches the rules of a level and nothing keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = HEROCITY; ... HEROCITY.defs.<mode> = {...}; })();

   From SHRUNK (see js/levels/world31/shrunk-kit.js): K.FONT, K.lerp, K.smooth, K.hash, K.mmss, K.stubMap, K.BREAK,
     K.quiet, K.key, K.track, K.both, K.idle, K.actLabels, K.hide, K.unhide, K.place, K.fx, K.pop, K.part, K.spark,
     K.confetti, K.dust, K.poof, K.hint, K.hintOnce, K.msg, K.tickFx, K.star, K.drawParts, K.drawPops, K.chip, K.panel,
     K.meter, K.medal, K.helpLine, K.drawMsg, K.prompter, K.hero.
   K.goldHelp(st, text, life)       the gold-help banner (plays cityHelp, counts st.stats.helps).
   Superheroes
     K.suit(id, x, y, o)             Pip or Bo in costume, feet at x, y: cape (behind), body (K.hero), mask, chest star.
                                     o: face, rot, s, sy, sx, vy, stun, alpha (see-through), capeV (how hard the cape
                                     flies: 0 still .. 1 flat out), arms ('up' holding something overhead), glow (a colour
                                     for a power aura).
     K.speedLines(x, y, dir, t, o)   streaks behind a fast hero. o: n, len, col.
     K.comic(x, y, str, s, rot, col) a comic-book burst ("POW!") centred at x, y.
   City scenery (call the sky painters with NO transform; props inside your camera transform)
     K.sky(cx, t, o)                 full screen: o.mode 'night' (deep blue, stars, a big moon) or 'dusk' (orange to
                                     purple), o.moonX, o.moonY, o.storm (dark clouds and lightning flashes, 0..1),
                                     o.beams (searchlights sweeping the sky).
     K.skyline(cx, t, o)             three layers of skyscrapers with lit windows and blinking antenna lights.
                                     o: base (y of the bottom of the near layer, default 460), dim 0..1, n (layers 1..3).
     K.facade(x, top, w, o)          a near building, roof at `top`, down past the screen bottom: brick or concrete,
                                     window rows (some lit, some with a plant or a cat), a cornice and a parapet.
                                     o: col, seed, fire (a fire escape), sign (a neon sign word).
     K.ac(x, y, w, h, t)             a rooftop air-conditioner box with a spinning fan, bottom left at x, y.
     K.waterTower(x, y, s)           a wooden water tank on legs, feet at y.
     K.antenna(x, y, h, t)           a radio mast with a blinking red light.
     K.vent(x, y, w, h)              a rooftop vent / chimney box, bottom left at x, y.
     K.billboard(x, y, w, h, str, t, o) a lit sign on legs, bottom left at x, y. o: col, bg.
   Sounds (Sfx.play('cityPop')): cityPop (a collectable), cityHelp, cityCheer, cityWhoosh, cityThud, cityBoing, cityAlarm,
     cityZap, cityPow, cityClang. Levels add their own as Sfx.extra.<mode>Name.
   Colours: K.COL = { night, nightHi, dusk, brick, brickDark, concrete, concreteDark, steel, steelDark, steelHi, lit,
     litWarm, dark, tar, tarHi, gold }. */
const HEROCITY = (() => {
  const S = SHRUNK, K = { defs: {} };
  for (const k of ['FONT', 'lerp', 'smooth', 'hash', 'mmss', 'stubMap', 'BREAK', 'quiet', 'key', 'track', 'both', 'idle', 'actLabels',
    'hide', 'unhide', 'place', 'fx', 'pop', 'part', 'spark', 'confetti', 'dust', 'poof', 'hint', 'hintOnce', 'msg', 'tickFx', 'star',
    'drawParts', 'drawPops', 'chip', 'panel', 'meter', 'medal', 'helpLine', 'drawMsg', 'prompter', 'hero']) K[k] = S[k];
  const TAU = Math.PI * 2, H_ = K.hash;
  const COL = K.COL = {
    night: '#141a3a', nightHi: '#2a3468', dusk: '#f08a4a', brick: '#8a4a3a', brickDark: '#5e2e24', concrete: '#7a7f92',
    concreteDark: '#4e5266', steel: '#6d7686', steelDark: '#3c4250', steelHi: '#a9b4c6', lit: '#ffe08a', litWarm: '#ffc46a',
    dark: '#232a48', tar: '#3a3a46', tarHi: '#565868', gold: '#ffc53d',
  };
  // catch-up help is gold and announced, never hidden, and counted for the results card
  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('cityHelp');
  };

  /* ---------- superheroes ---------- */
  const CAPE = [['#d8283a', '#8e1422'], ['#ffd23a', '#b88a10']]; // Pip's red cape, Bo's gold cape
  function cape(id, x, y, face, t, v, s) {
    const [c0, c1] = CAPE[id], sh = y - 22 * s, fl = clamp(v, 0, 1);
    const len = 22 * s, back = -face, wave = Math.sin(t * (8 + fl * 10) + id) * (2 + fl * 3) * s;
    const tipX = x + back * (6 + fl * 24) * s, tipY = sh + len - fl * 14 * s;
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.moveTo(x - 9 * s, sh); ctx.lineTo(x + 9 * s, sh);
    ctx.quadraticCurveTo(tipX + back * 8 * s, (sh + tipY) / 2 + wave, tipX + back * 10 * s + wave * 0.5, tipY + 4 * s);
    ctx.lineTo(tipX - back * 4 * s, tipY + 6 * s + wave * 0.6);
    ctx.quadraticCurveTo(x - back * 4 * s, sh + len * 0.6, x - 9 * s, sh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c0;
    ctx.beginPath(); ctx.moveTo(x - 7 * s, sh + 1); ctx.lineTo(x + 7 * s, sh + 1);
    ctx.quadraticCurveTo(tipX + back * 4 * s, (sh + tipY) / 2 + wave, tipX + back * 6 * s + wave * 0.5, tipY);
    ctx.quadraticCurveTo(x, sh + len * 0.5, x - 7 * s, sh + 1); ctx.closePath(); ctx.fill();
  }
  K.suit = (id, x, y, o = {}) => {
    const s = o.s || 1, face = o.face || 1, t = G.clock || 0;
    const a0 = ctx.globalAlpha;
    if (o.alpha !== undefined) ctx.globalAlpha = a0 * o.alpha;
    if (o.glow) {
      const g = ctx.createRadialGradient(x, y - 13 * s, 2, x, y - 13 * s, 34 * s);
      g.addColorStop(0, o.glow); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; circle(x, y - 13 * s, 34 * s); ctx.fill();
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.translate(-x, -y);
    cape(id, x, y, face, t, o.capeV || 0, s);
    ctx.restore();
    K.hero(id, x, y, { face, rot: o.rot, s: o.s, sy: o.sy, sx: o.sx, vy: o.vy, stun: o.stun });
    // the mask and the chest star, drawn in the body's own frame
    const sy = o.sy || 1, h = PH * sy * s, w = PW * (o.sx || (o.sy ? 2 - o.sy : 1)) * s;
    ctx.save(); ctx.translate(x, y - PH * s / 2); ctx.rotate(o.rot || 0); ctx.translate(0, PH * s / 2);
    const ey = -h * 0.6, look = face * 2.5 * s;
    if (!o.stun) {
      ctx.fillStyle = id === 0 ? '#2a1a3a' : '#1a2a4a';
      ctx.beginPath(); ctx.ellipse(-5 * s + look, ey, 6.2 * s, 5.4 * s, 0, 0, TAU); ctx.ellipse(5 * s + look, ey, 6.2 * s, 5.4 * s, 0, 0, TAU); ctx.fill();
      ctx.fillRect(-w / 2 + 1, ey - 2.5 * s, w - 2, 4 * s);
      // mask tails flutter behind
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(-face * w / 2, ey); ctx.quadraticCurveTo(-face * (w / 2 + 6 * s), ey + Math.sin(t * 9 + id) * 3, -face * (w / 2 + 10 * s), ey + 4 * s); ctx.stroke();
      for (const ex of [-5, 5]) {
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex * s + look, ey, 3.4 * s, 3.8 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = C.ink; circle(ex * s + look + face * 1.1 * s, ey + 0.6 * s, 1.8 * s); ctx.fill();
      }
    }
    // a gold star on the chest
    ctx.fillStyle = '#ffffff'; K.star(face * 2 * s, -h * 0.22, 5.2 * s, 2.3 * s, 0); ctx.fill();
    ctx.fillStyle = id === 0 ? '#ffd23a' : '#d8283a'; K.star(face * 2 * s, -h * 0.22, 3.8 * s, 1.6 * s, 0); ctx.fill();
    if (o.arms === 'up') {
      ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h * 0.55); ctx.lineTo(-w / 2 - 2 * s, -h - 12 * s); ctx.moveTo(w / 2 - 2, -h * 0.55); ctx.lineTo(w / 2 + 2 * s, -h - 12 * s); ctx.stroke();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h * 0.55); ctx.lineTo(-w / 2 - 2 * s, -h - 12 * s); ctx.moveTo(w / 2 - 2, -h * 0.55); ctx.lineTo(w / 2 + 2 * s, -h - 12 * s); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.restore();
    ctx.globalAlpha = a0;
  };
  K.speedLines = (x, y, dir, t, o = {}) => {
    const n = o.n || 6, len = o.len || 60;
    ctx.strokeStyle = o.col || 'rgba(255,255,255,0.7)'; ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const u = ((t * 6 + k * 0.37) % 1), yy = y - 4 - k * 4.2, l = len * (0.5 + 0.5 * H_(k + 3)) * (1 - u * 0.5);
      ctx.globalAlpha = (1 - u) * 0.8; ctx.lineWidth = 2.5 - k * 0.2;
      ctx.beginPath(); ctx.moveTo(x - dir * (10 + u * 30), yy); ctx.lineTo(x - dir * (10 + u * 30 + l), yy); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  };
  K.comic = (x, y, str, s = 1, rot = 0, col = '#ffe14a') => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = i % 2 ? 26 : 40 + (i % 4 === 0 ? 6 : 0); ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.font = '26px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#1c1a36'; ctx.strokeText(str, 0, 1);
    ctx.fillStyle = '#ff4a5a'; ctx.fillText(str, 0, 1);
    ctx.restore();
  };

  /* ---------- the sky and the skyline ---------- */
  K.sky = (cx, t, o = {}) => {
    const dusk = o.mode === 'dusk', g = ctx.createLinearGradient(0, 0, 0, H);
    if (dusk) { g.addColorStop(0, '#2c2458'); g.addColorStop(0.45, '#8a3e6a'); g.addColorStop(0.75, '#f07a4a'); g.addColorStop(1, '#ffc27a'); }
    else { g.addColorStop(0, '#070a24'); g.addColorStop(0.55, '#18205a'); g.addColorStop(1, '#3a3a7a'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // stars (fewer at dusk)
    for (let i = 0; i < (dusk ? 22 : 70); i++) {
      const x = ((H_(i) * 1400 - cx * 0.02) % 1000 + 1000) % 1000 - 20, y = H_(i + 50) * (dusk ? 160 : 300);
      ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * (0.8 + H_(i + 9)) + i));
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1.6 + H_(i + 3), 1.6 + H_(i + 3));
    }
    ctx.globalAlpha = 1;
    const mx = o.moonX === undefined ? 760 : o.moonX, my = o.moonY === undefined ? 96 : o.moonY;
    if (dusk) {
      // a big low sun going down
      const sg = ctx.createRadialGradient(mx, my + 260, 10, mx, my + 260, 200);
      sg.addColorStop(0, 'rgba(255,236,170,0.95)'); sg.addColorStop(0.3, 'rgba(255,190,110,0.6)'); sg.addColorStop(1, 'rgba(255,140,90,0)');
      ctx.fillStyle = sg; ctx.fillRect(mx - 220, my + 40, 440, 440);
      ctx.fillStyle = '#fff0c0'; circle(mx, my + 260, 56); ctx.fill();
    } else {
      const mg = ctx.createRadialGradient(mx, my, 20, mx, my, 120);
      mg.addColorStop(0, 'rgba(255,250,220,0.5)'); mg.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = mg; circle(mx, my, 120); ctx.fill();
      ctx.fillStyle = '#fbf6dc'; circle(mx, my, 46); ctx.fill();
      ctx.fillStyle = 'rgba(200,196,170,0.5)';
      for (const [dx, dy, r] of [[-14, -10, 9], [12, 8, 7], [-4, 18, 5], [18, -16, 4]]) { circle(mx + dx, my + dy, r); ctx.fill(); }
    }
    if (o.beams) {
      for (let k = 0; k < 2; k++) {
        const bx = 180 + k * 520 - (cx * 0.1) % 900, a = -Math.PI / 2 + Math.sin(t * 0.5 + k * 2) * 0.5;
        ctx.save(); ctx.translate(bx, H); ctx.rotate(a + Math.PI / 2);
        const bg = ctx.createLinearGradient(0, 0, 0, -700); bg.addColorStop(0, 'rgba(255,250,210,0.22)'); bg.addColorStop(1, 'rgba(255,250,210,0)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-90, -700); ctx.lineTo(90, -700); ctx.lineTo(8, 0); ctx.fill();
        ctx.restore();
      }
    }
    if (o.storm) {
      const fl = Math.max(0, Math.sin(t * 0.9) * Math.sin(t * 7.3)) > 0.93 ? 1 : 0;
      ctx.fillStyle = 'rgba(40,30,70,' + 0.5 * o.storm + ')';
      for (let i = 0; i < 7; i++) { const x = ((i * 190 - cx * 0.05 + t * 8) % 1300 + 1300) % 1300 - 160; circle(x, 40 + (i % 3) * 22, 70); ctx.fill(); circle(x + 80, 30 + (i % 2) * 20, 60); ctx.fill(); }
      if (fl) { ctx.fillStyle = 'rgba(230,230,255,' + 0.35 * o.storm + ')'; ctx.fillRect(0, 0, W, H); }
    }
  };
  // one layer of buildings: no transform. par = how fast it scrolls, base = bottom y, hMin/hMax heights, col tint
  function layer(cx, t, par, base, hMin, hMax, col, winA, seedK, step, dim) {
    const sx = cx * par, i0 = Math.floor(sx / step) - 2, i1 = Math.ceil((sx + W) / step) + 2;
    for (let i = i0; i <= i1; i++) {
      const seed = i * 13 + seedK, w = step * (0.7 + H_(seed) * 0.6), x = i * step - sx + (H_(seed + 1) - 0.5) * step * 0.3;
      const h = hMin + H_(seed + 2) * (hMax - hMin), top = base - h;
      ctx.fillStyle = col; ctx.fillRect(x, top, w, h + 4);
      // a stepped top or a spire now and then
      const kind = Math.floor(H_(seed + 3) * 5);
      if (kind === 0) { ctx.fillRect(x + w * 0.2, top - 18, w * 0.6, 18); ctx.fillRect(x + w * 0.35, top - 34, w * 0.3, 16); }
      else if (kind === 1) { ctx.beginPath(); ctx.moveTo(x + w * 0.3, top); ctx.lineTo(x + w * 0.5, top - 60); ctx.lineTo(x + w * 0.7, top); ctx.fill(); }
      else if (kind === 2) { ctx.fillRect(x + w * 0.46, top - 50, 3, 50); if (Math.sin(t * 3 + i) > 0.2) { ctx.fillStyle = '#ff3a3a'; circle(x + w * 0.46 + 1.5, top - 52, 2.5); ctx.fill(); ctx.fillStyle = col; } }
      // windows
      if (winA > 0) {
        const cols = Math.max(2, Math.floor(w / 14)), rows = Math.floor(h / 18), cw = w / cols;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const hv = H_(seed * 7 + r * 31 + c * 17);
          if (hv < 0.55) continue;
          ctx.fillStyle = hv > 0.93 ? 'rgba(140,220,255,' + winA + ')' : 'rgba(255,214,120,' + winA * (hv > 0.75 ? 1 : 0.55) + ')';
          ctx.fillRect(x + c * cw + cw * 0.3, top + 10 + r * 18, cw * 0.4, 8);
        }
      }
    }
    if (dim) { ctx.fillStyle = 'rgba(10,12,30,' + dim + ')'; ctx.fillRect(0, base - hMax - 70, W, hMax + 80); }
  }
  K.skyline = (cx, t, o = {}) => {
    const base = o.base === undefined ? 460 : o.base, n = o.n || 3, dusk = o.mode === 'dusk';
    if (n >= 3) layer(cx, t, 0.06, base - 40, 160, 330, dusk ? '#5a3a6a' : '#1e2552', 0.35, 1, 90, 0);
    if (n >= 2) layer(cx, t, 0.14, base - 20, 120, 280, dusk ? '#3e2a52' : '#171d44', 0.6, 2, 120, 0);
    layer(cx, t, 0.26, base, 90, 240, dusk ? '#2a1e3e' : '#10153a', 0.85, 3, 150, o.dim || 0);
    // haze at the foot of the city
    const hz = ctx.createLinearGradient(0, base - 120, 0, base + 10);
    hz.addColorStop(0, 'rgba(120,110,180,0)'); hz.addColorStop(1, dusk ? 'rgba(255,170,120,0.35)' : 'rgba(110,100,190,0.35)');
    ctx.fillStyle = hz; ctx.fillRect(0, base - 120, W, 140);
  };

  /* ---------- rooftop props (inside the camera transform) ---------- */
  K.facade = (x, top, w, o = {}) => {
    const seed = o.seed || Math.round(x), brick = o.col ? false : H_(seed) < 0.5;
    const body = o.col || (brick ? COL.brick : COL.concrete), dark = brick ? COL.brickDark : COL.concreteDark, bottom = o.bottom || H + 20;
    ctx.fillStyle = body; ctx.fillRect(x, top, w, bottom - top);
    // brick courses or concrete panels
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    if (brick) for (let y = top + 34; y < bottom; y += 9) ctx.fillRect(x, y, w, 1.5);
    else for (let xx = x + 60; xx < x + w; xx += 60) ctx.fillRect(xx, top + 30, 2, bottom - top);
    // windows
    const cols = Math.max(1, Math.floor((w - 20) / 46)), cw = (w - 20) / cols;
    for (let r = 0; ; r++) {
      const wy = top + 46 + r * 62;
      if (wy > bottom) break;
      for (let c = 0; c < cols; c++) {
        const wx = x + 10 + c * cw + cw / 2 - 14, hv = H_(seed + r * 11 + c * 7);
        ctx.fillStyle = dark; ctx.fillRect(wx - 3, wy - 3, 34, 42);
        ctx.fillStyle = hv > 0.45 ? (hv > 0.8 ? '#ffd27a' : '#ffe6a0') : '#2a3256';
        ctx.fillRect(wx, wy, 28, 36);
        if (hv > 0.45) {
          // curtains, a plant, a cat or a lamp in lit windows
          if (hv > 0.9) { ctx.fillStyle = '#2a2230'; circle(wx + 14, wy + 30, 6); ctx.fill(); ctx.beginPath(); ctx.moveTo(wx + 9, wy + 26); ctx.lineTo(wx + 10, wy + 20); ctx.lineTo(wx + 13, wy + 25); ctx.moveTo(wx + 15, wy + 25); ctx.lineTo(wx + 18, wy + 20); ctx.lineTo(wx + 19, wy + 26); ctx.fill(); }
          else if (hv > 0.7) { ctx.fillStyle = '#4a8a3a'; circle(wx + 8, wy + 28, 6); ctx.fill(); ctx.fillStyle = '#a8562a'; ctx.fillRect(wx + 4, wy + 30, 8, 6); }
          ctx.fillStyle = hv > 0.6 ? 'rgba(200,80,90,0.55)' : 'rgba(80,120,200,0.45)'; ctx.fillRect(wx, wy, 7, 36); ctx.fillRect(wx + 21, wy, 7, 36);
        } else { ctx.fillStyle = 'rgba(140,170,230,0.25)'; ctx.fillRect(wx + 3, wy + 3, 6, 30); }
        ctx.fillStyle = dark; ctx.fillRect(wx + 13, wy, 2, 36); ctx.fillRect(wx, wy + 17, 28, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(wx - 4, wy + 38, 36, 4);
      }
    }
    if (o.fire) {
      // a fire escape: landings and ladders
      const fx = x + w * 0.62;
      ctx.strokeStyle = '#1c1f2a'; ctx.lineWidth = 3;
      for (let y = top + 90; y < bottom; y += 124) {
        ctx.strokeRect(fx - 40, y, 80, 2);
        ctx.beginPath(); for (let k = 0; k <= 8; k++) { ctx.moveTo(fx - 40 + k * 10, y); ctx.lineTo(fx - 40 + k * 10, y - 18); } ctx.moveTo(fx - 40, y - 18); ctx.lineTo(fx + 40, y - 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fx + 20, y); ctx.lineTo(fx - 20, y + 124); ctx.moveTo(fx + 28, y); ctx.lineTo(fx - 12, y + 124); ctx.stroke();
      }
    }
    if (o.sign) {
      const t = G.clock || 0, on = Math.sin(t * 13 + seed) > -0.92;
      ctx.fillStyle = '#1c1a30'; rr(x + 16, top + 50, Math.min(w - 32, 150), 40, 8); ctx.fill();
      text(o.sign, x + 16 + Math.min(w - 32, 150) / 2, top + 71, 22, on ? '#ff6ad5' : '#5a2a50', 'center');
    }
    // cornice and parapet
    ctx.fillStyle = dark; ctx.fillRect(x - 6, top + 8, w + 12, 10);
    ctx.fillStyle = brick ? '#a8604c' : '#9aa0b4'; ctx.fillRect(x - 4, top, w + 8, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x - 4, top, w + 8, 2);
  };
  K.ac = (x, y, w, h, t = 0) => {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3, y - 3, w, 4);
    ctx.fillStyle = '#9aa2b2'; rr(x, y - h, w, h, 4); ctx.fill();
    ctx.strokeStyle = '#5c6474'; ctx.lineWidth = 2; rr(x, y - h, w, h, 4); ctx.stroke();
    ctx.fillStyle = '#7a8292'; for (let k = 0; k < 3; k++) ctx.fillRect(x + 4, y - h + 6 + k * 5, w * 0.4, 2);
    const fx = x + w * 0.7, fy = y - h / 2, fr = Math.min(h, w * 0.5) * 0.36;
    ctx.fillStyle = '#4a5262'; circle(fx, fy, fr); ctx.fill();
    ctx.strokeStyle = '#c8d0dc'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const a = t * 14 + k * TAU / 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * fr * 0.9, fy + Math.sin(a) * fr * 0.9); ctx.stroke(); }
  };
  K.waterTower = (x, y, s = 1) => {
    ctx.strokeStyle = '#3a2c24'; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(x - 26 * s, y); ctx.lineTo(x - 20 * s, y - 50 * s); ctx.moveTo(x + 26 * s, y); ctx.lineTo(x + 20 * s, y - 50 * s);
    ctx.moveTo(x - 24 * s, y - 16 * s); ctx.lineTo(x + 22 * s, y - 40 * s); ctx.moveTo(x + 24 * s, y - 16 * s); ctx.lineTo(x - 22 * s, y - 40 * s); ctx.stroke();
    ctx.fillStyle = '#8a5a3a'; ctx.fillRect(x - 30 * s, y - 120 * s, 60 * s, 72 * s);
    ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 1.5 * s;
    for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x - 30 * s + k * 10 * s, y - 120 * s); ctx.lineTo(x - 30 * s + k * 10 * s, y - 48 * s); ctx.stroke(); }
    ctx.fillStyle = '#2a2a34'; ctx.fillRect(x - 32 * s, y - 100 * s, 64 * s, 4 * s); ctx.fillRect(x - 32 * s, y - 70 * s, 64 * s, 4 * s);
    ctx.fillStyle = '#5a4034'; ctx.beginPath(); ctx.moveTo(x - 34 * s, y - 118 * s); ctx.lineTo(x, y - 150 * s); ctx.lineTo(x + 34 * s, y - 118 * s); ctx.closePath(); ctx.fill();
  };
  K.antenna = (x, y, h, t = 0) => {
    ctx.strokeStyle = '#2a2e3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.moveTo(x - 12, y); ctx.lineTo(x, y - h * 0.6); ctx.lineTo(x + 12, y); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, y - h * 0.75); ctx.lineTo(x + 10, y - h * 0.75); ctx.moveTo(x - 7, y - h * 0.88); ctx.lineTo(x + 7, y - h * 0.88); ctx.stroke();
    if (Math.sin(t * 3 + x) > 0) { ctx.fillStyle = 'rgba(255,60,60,0.35)'; circle(x, y - h, 8); ctx.fill(); ctx.fillStyle = '#ff4a4a'; circle(x, y - h, 3.5); ctx.fill(); }
  };
  K.vent = (x, y, w, h) => {
    ctx.fillStyle = '#6a6e7c'; ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = '#4e5260'; ctx.fillRect(x - 3, y - h - 6, w + 6, 7);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 6; k < h - 4; k += 7) ctx.fillRect(x + 4, y - h + k, w - 8, 2);
  };
  K.billboard = (x, y, w, h, str, t = 0, o = {}) => {
    ctx.strokeStyle = '#22252e'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + w * 0.2, y); ctx.lineTo(x + w * 0.2, y - 40); ctx.moveTo(x + w * 0.8, y); ctx.lineTo(x + w * 0.8, y - 40); ctx.stroke();
    ctx.fillStyle = '#22252e'; rr(x - 4, y - 44 - h, w + 8, h + 8, 6); ctx.fill();
    ctx.fillStyle = o.bg || '#2a1a4a'; rr(x, y - 40 - h, w, h, 4); ctx.fill();
    const on = Math.sin(t * 11 + x) > -0.9;
    text(str, x + w / 2, y - 40 - h / 2, Math.min(h * 0.6, 34), on ? (o.col || '#6af0ff') : 'rgba(100,140,160,0.5)', 'center');
    // little lamps along the top
    ctx.fillStyle = '#fff2b0'; for (let k = 0; k < 4; k++) { circle(x + w * (k + 0.5) / 4, y - 46 - h, 2.5); ctx.fill(); }
  };

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
