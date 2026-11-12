/* Pip & Bo - World 33 Storm Chasers: shared helpers for the four storm levels (loads before them). */
'use strict';

/* The only global here is STORMCHASE. Pip and Bo are storm chasers with a dented weather van (a satellite dish and a
   spinning wind gauge on the roof). In every level the weather is the villain: it chases, rises or blinds, and never
   stops. Nobody gets hurt on screen: a failure is a rescue, a spin-out or a checkpoint restart.
   The players-and-keys, effects and HUD helpers are World 31's SHRUNK kit (same names, same arguments: its header is
   the manual for those), so this file loads after js/levels/world31/shrunk-kit.js. What is new here is the storm look
   (rain jackets and goggles), the storm sky, rain / snow / wind, the funnel cloud, flying debris, the van and the
   storm sounds.
   Nothing here touches the rules of a level and nothing keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = STORMCHASE; ... STORMCHASE.defs.<mode> = {...}; })();

   From SHRUNK (see js/levels/world31/shrunk-kit.js): K.FONT, K.lerp, K.smooth, K.hash, K.mmss, K.stubMap, K.BREAK,
     K.quiet, K.key, K.track, K.both, K.idle, K.actLabels, K.hide, K.unhide, K.place, K.fx, K.pop, K.part, K.spark,
     K.confetti, K.dust, K.poof, K.hint, K.hintOnce, K.msg, K.tickFx, K.star, K.drawParts, K.drawPops, K.chip, K.panel,
     K.meter, K.medal, K.helpLine, K.drawMsg, K.prompter, K.hero.
   K.goldHelp(st, text, life)       the gold-help banner (plays stormHelp, counts st.stats.helps).
   Storm chasers
     K.chaser(id, x, y, o)           Pip (yellow rain jacket) or Bo (orange), goggles pushed up, feet at x, y.
                                     o: face, rot, s, sy, sx, vy, stun, hood (hood up, for snow), lit (0..1: how much
                                     light falls on them, for dark levels), arms ('up' | 'bat' with o.armA, the arm angle)
   Weather (no transform unless it says so)
     K.bolts(st, dt, every)          ticks st.bolt: a lightning strike every `every` = [min, max] s (thunder follows).
                                     K.flashA(st) is how bright the flash is now (0..1, 2-3 frames of white).
     K.sky(cx, t, o)                 full screen storm sky: o.mood 'storm' (green-grey supercell), 'flood' (brown-grey),
                                     'snow' (white-grey), 'clear' (after the storm). o.dark 0..1, o.flash (K.flashA),
                                     o.boltX (where the bolt is drawn, screen px), o.bolt (st.bolt). Cloud banks move at
                                     three speeds with cx.
     K.rain(t, o)                    a sheet of rain streaks leaning with o.wind (px/s sideways), o.n, o.a (alpha).
     K.snow(t, o)                    blowing snow flakes: o.wind, o.n, o.a, o.big.
     K.windStreaks(t, o)             white wind lines: o.n, o.a, o.dir (1 = blowing right), o.y0, o.y1.
     K.funnel(x, y, h, t, o)         a tornado: base (touching ground) at x, y, h tall. o: w (top width), foot (bottom width), lean, col, alpha,
                                     debris (true: a ring of junk), dust (a dust skirt), s.
     K.debris(kind, x, y, rot, s)    a piece of flying junk centred at x, y: 'hay', 'post', 'mailbox', 'sign', 'tyre',
                                     'cow', 'roof', 'scarecrow', 'tractor', 'shed', 'fence'.
   Farm and road (inside your camera transform or with your own scroll)
     K.farm(cx, t, o)                no transform: far fields, fences, barns and silos scrolling at three speeds,
                                     o.horizon (y), o.dark.
     K.van(x, y, o)                  the storm van, wheels on y, centred on x. o: s, dents (0..n), dish ('on' | 'off'),
                                     t, hatch (true: the roof hatch is open), lean, bounce, bar (gold bull-bar), duck.
   Sounds (Sfx.play('stormPop')): stormPop (a collectable), stormHelp (played by K.goldHelp), stormCheer, stormThunder,
     stormWind (p = how hard), stormSiren, stormThud, stormWhoosh, stormBoing, stormMoo, stormSplash, stormCrack.
     Levels add their own as Sfx.extra.<mode>Name.
   Colours: K.COL = { jacket: [Pip, Bo], jacketDark, cloud, cloudDark, field, fieldDark, road, roadLine, mud, water,
     waterDark, foam, snow, snowDark, ice, iceDark, rock, rockDark, wood, woodDark, flare, gold }. */
const STORMCHASE = (() => {
  const S = SHRUNK, K = { defs: {} };
  for (const k of ['FONT', 'lerp', 'smooth', 'hash', 'mmss', 'stubMap', 'BREAK', 'quiet', 'key', 'track', 'both', 'idle', 'actLabels',
    'hide', 'unhide', 'place', 'fx', 'pop', 'part', 'spark', 'confetti', 'dust', 'poof', 'hint', 'hintOnce', 'msg', 'tickFx', 'star',
    'drawParts', 'drawPops', 'chip', 'panel', 'meter', 'medal', 'helpLine', 'drawMsg', 'prompter', 'hero']) K[k] = S[k];
  const TAU = Math.PI * 2, H_ = K.hash;
  const COL = K.COL = {
    jacket: ['#ffd23a', '#ff8a2a'], jacketDark: ['#c89a10', '#c45a10'], cloud: '#4a5560', cloudDark: '#262e36',
    field: '#7a9a4a', fieldDark: '#4e6a2e', road: '#4a4a52', roadLine: '#f2e2a0', mud: '#7a5a3a', water: '#8a6a44',
    waterDark: '#5a4228', foam: '#efe6d0', snow: '#f4f8fc', snowDark: '#c8d4e2', ice: '#bfe6f4', iceDark: '#7ab4d0',
    rock: '#8a7a6a', rockDark: '#5a4e44', wood: '#9a6a3a', woodDark: '#5e3e20', flare: '#ff7a2a', gold: '#ffc53d',
  };
  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('stormHelp');
  };

  /* ---------- storm chasers ---------- */
  K.chaser = (id, x, y, o = {}) => {
    const s = o.s || 1, face = o.face || 1;
    K.hero(id, x, y, { face, rot: o.rot, s: o.s, sy: o.sy, sx: o.sx, vy: o.vy, stun: o.stun });
    const sy = o.sy || 1, h = PH * sy * s, w = PW * (o.sx || (o.sy ? 2 - o.sy : 1)) * s;
    ctx.save(); ctx.translate(x, y - PH * s / 2); ctx.rotate(o.rot || 0); ctx.translate(0, PH * s / 2);
    const jc = COL.jacket[id], jd = COL.jacketDark[id];
    // the hood, behind the head (up in the snow)
    if (o.hood) {
      ctx.fillStyle = jc; ctx.strokeStyle = jd; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -h * 0.3); ctx.quadraticCurveTo(-w / 2 - 4, -h - 6 * s, 0, -h - 6 * s); ctx.quadraticCurveTo(w / 2 + 4, -h - 6 * s, w / 2 + 2, -h * 0.3);
      ctx.lineTo(w / 2 - 3, -h * 0.3); ctx.quadraticCurveTo(w / 2 - 1, -h + 2 * s, 0, -h + 1 * s); ctx.quadraticCurveTo(-w / 2 + 1, -h + 2 * s, -w / 2 + 3, -h * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      // the hood hangs down the back
      ctx.fillStyle = jd; ctx.beginPath(); ctx.ellipse(-face * (w / 2 - 1), -h * 0.42, 4 * s, 6 * s, 0, 0, TAU); ctx.fill();
    }
    // the jacket over the lower body
    const jt = -h * 0.36;
    ctx.fillStyle = jc; ctx.strokeStyle = jd; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w / 2 - 1.5, jt + 3); ctx.quadraticCurveTo(-w / 2 - 1.5, jt, -w / 2 + 3, jt); ctx.lineTo(w / 2 - 3, jt);
    ctx.quadraticCurveTo(w / 2 + 1.5, jt, w / 2 + 1.5, jt + 3); ctx.lineTo(w / 2 + 1.5, -2); ctx.quadraticCurveTo(w / 2 + 1.5, 1, w / 2 - 3, 1);
    ctx.lineTo(-w / 2 + 3, 1); ctx.quadraticCurveTo(-w / 2 - 1.5, 1, -w / 2 - 1.5, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    // collar, zip, pocket and a reflective stripe
    ctx.fillStyle = jd; ctx.beginPath(); ctx.moveTo(-6 * s, jt); ctx.lineTo(0, jt + 4 * s); ctx.lineTo(6 * s, jt); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = jd; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(face * 1.5 * s, jt + 4 * s); ctx.lineTo(face * 1.5 * s, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-w / 2 - 1, jt + h * 0.2, w + 2, 2 * s);
    ctx.strokeStyle = jd; ctx.strokeRect(face * 3 * s, jt + h * 0.24, 5 * s, 4 * s);
    // goggles pushed up on the forehead
    const gy = -h * 0.86 + 2;
    ctx.fillStyle = '#2a2a34'; ctx.fillRect(-w / 2 - 1, gy - 1.5 * s, w + 2, 3 * s);
    for (const ex of [-4.5, 4.5]) {
      ctx.fillStyle = '#3a3e48'; circle(ex * s + face * 1.5 * s, gy, 4 * s); ctx.fill();
      ctx.fillStyle = id === 0 ? '#8fdcff' : '#b8f0d0'; circle(ex * s + face * 1.5 * s, gy, 2.8 * s); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ex * s + face * 1.5 * s - 1, gy - 1, 0.9 * s); ctx.fill();
    }
    // arms
    if (o.arms === 'up' || o.arms === 'bat') {
      const a = o.arms === 'up' ? -Math.PI / 2 : o.armA, sx0 = face * (w / 2 - 2), sy0 = jt + 4 * s;
      const ex = sx0 + Math.cos(a) * 16 * s, ey = sy0 + Math.sin(a) * 16 * s;
      ctx.strokeStyle = jd; ctx.lineWidth = 5.5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = jc; ctx.lineWidth = 3.5 * s; ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.restore();
    if (o.lit !== undefined && o.lit < 1) {
      ctx.save(); ctx.globalAlpha = (1 - o.lit) * 0.75; ctx.fillStyle = '#dfe6ee';
      ctx.beginPath(); ctx.ellipse(x, y - PH * s / 2, w * 0.8, h * 0.75, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  };

  /* ---------- lightning ---------- */
  K.bolts = (st, dt, every = [6, 9]) => {
    if (!st.bolt) st.bolt = { next: every[0] * 0.5, t: 9, x: 0.5, seed: 1, thunder: 0 };
    const b = st.bolt;
    b.t += dt; b.next -= dt;
    if (b.thunder > 0) { b.thunder -= dt; if (b.thunder <= 0) Sfx.play('stormThunder'); }
    if (b.next <= 0) { b.next = every[0] + Math.random() * (every[1] - every[0]); b.t = 0; b.x = 0.1 + Math.random() * 0.8; b.seed = Math.floor(Math.random() * 1000); b.thunder = 0.25 + Math.random() * 0.5; }
  };
  K.flashA = st => { const b = st.bolt; if (!b) return 0; return b.t < 0.05 ? 1 : b.t < 0.09 ? 0.3 : b.t < 0.14 ? 0.8 : b.t < 0.3 ? (0.3 - b.t) * 2 : 0; };
  function bolt(x0, seed, len, a) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(200,210,255,0.6)'; ctx.lineWidth = 7; ctx.lineJoin = 'round';
    const pts = [[x0, 0]];
    let x = x0, y = 0;
    for (let i = 0; i < 9; i++) { x += (H_(seed + i) - 0.5) * 70; y += len / 9; pts.push([x, y]); }
    for (const lw of [7, 2.5]) {
      ctx.lineWidth = lw; ctx.strokeStyle = lw > 3 ? 'rgba(180,190,255,0.45)' : '#ffffff';
      ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      // a fork
      const f = pts[4]; ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.lineTo(f[0] + 40 * (H_(seed + 20) - 0.3), f[1] + 60); ctx.lineTo(f[0] + 70 * (H_(seed + 21) - 0.2), f[1] + 90); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- the sky ---------- */
  const MOODS = {
    storm: ['#1c2620', '#3e4e44', '#6a7a64', '#3a463e', '#56645a'],
    flood: ['#2a2420', '#5a4a3c', '#8a7a64', '#4a3e34', '#6a5c4c'],
    snow: ['#9aa8b8', '#c8d2de', '#e8eef4', '#b4c0ce', '#d4dce6'],
    clear: ['#4a7ab0', '#8ab4d8', '#e8d4a8', '#9aa8b8', '#c4ccd6'],
  };
  K.sky = (cx, t, o = {}) => {
    const M = MOODS[o.mood || 'storm'], g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, M[0]); g.addColorStop(0.55, M[1]); g.addColorStop(1, M[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // three banks of cloud: far ones slow, near ones fast and low
    for (let layer = 0; layer < 3; layer++) {
      const par = [0.04, 0.1, 0.2][layer], y0 = [70, 40, 10][layer], sc = [0.8, 1.1, 1.5][layer];
      ctx.fillStyle = layer === 2 ? M[3] : M[4];
      ctx.globalAlpha = [0.55, 0.75, 0.95][layer];
      const span = 260 * sc, off = ((cx * par + t * (6 + layer * 5)) % span + span) % span;
      for (let x = -off - span; x < W + span; x += span) {
        const k = Math.round((x + off) / span) + layer * 31, yy = y0 + H_(k) * 30;
        for (let j = 0; j < 5; j++) { circle(x + j * 52 * sc, yy + Math.sin(j * 1.7 + k) * 10 * sc, (36 + H_(k + j) * 24) * sc); ctx.fill(); }
        ctx.fillRect(x - 20, yy - 10, 260 * sc, 40 * sc);
      }
      // a bright rim under the near bank
      if (layer === 2) { ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffffff'; for (let x = -off - span; x < W + span; x += span) ctx.fillRect(x, 66 + H_(Math.round((x + off) / span) + 62) * 30, 220 * sc, 3); }
    }
    ctx.globalAlpha = 1;
    const fl = o.flash || 0;
    if (fl > 0 && o.bolt) bolt(o.boltX === undefined ? o.bolt.x * W : o.boltX, o.bolt.seed, o.boltLen || 360, Math.min(1, fl * 1.4));
    if (o.dark) { ctx.fillStyle = 'rgba(8,10,14,' + clamp(o.dark, 0, 1) * 0.6 + ')'; ctx.fillRect(0, 0, W, H); }
  };
  // a full-screen white flash on top of everything (call last)
  K.flashTop = a => { if (a > 0) { ctx.fillStyle = 'rgba(240,244,255,' + a * 0.55 + ')'; ctx.fillRect(0, 0, W, H); } };

  /* ---------- rain, snow, wind ---------- */
  K.rain = (t, o = {}) => {
    const n = o.n || 140, wind = o.wind || 120, a = o.a === undefined ? 0.45 : o.a, sp = o.speed || 900;
    const lean = wind / sp;
    ctx.strokeStyle = o.col || 'rgba(200,214,230,1)'; ctx.lineWidth = 1.3; ctx.globalAlpha = a;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const len = 14 + H_(i + 3) * 14, ph = (t * sp / (H + 60) + H_(i)) % 1, y = ph * (H + 60) - 30;
      const x = ((H_(i + 7) * (W + 200) + y * lean + t * wind * 0.2) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.moveTo(x, y); ctx.lineTo(x - lean * len, y - len);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
    if (o.splash) {
      ctx.fillStyle = 'rgba(220,230,240,0.5)';
      for (let i = 0; i < 18; i++) { const u = (t * 3 + H_(i + 40)) % 1, x = H_(i + 50) * W; ctx.globalAlpha = 0.5 * (1 - u); ctx.beginPath(); ctx.ellipse(x, o.splash, 2 + u * 7, 1 + u * 2, 0, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  };
  K.snow = (t, o = {}) => {
    const n = o.n || 160, wind = o.wind || 260, a = o.a === undefined ? 0.85 : o.a;
    ctx.fillStyle = o.col || '#ffffff';
    for (let i = 0; i < n; i++) {
      const fall = 60 + H_(i + 2) * 90, r = (o.big ? 2.2 : 1.2) + H_(i + 5) * (o.big ? 3 : 2);
      const y = ((H_(i) * (H + 40) + t * fall) % (H + 40)) - 20;
      const x = (((H_(i + 9) * (W + 300) + t * wind * (0.7 + H_(i + 4) * 0.6) + Math.sin(t * 2 + i) * 14) % (W + 300)) + W + 300) % (W + 300) - 150;
      ctx.globalAlpha = a * (0.5 + 0.5 * H_(i + 11)); circle(x, y, r); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  K.windStreaks = (t, o = {}) => {
    const n = o.n || 10, dir = o.dir || 1, y0 = o.y0 === undefined ? 40 : o.y0, y1 = o.y1 === undefined ? H - 40 : o.y1;
    ctx.strokeStyle = o.col || '#ffffff'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const u = (t * (0.8 + H_(i) * 0.6) + H_(i + 5)) % 1, y = y0 + H_(i + 9) * (y1 - y0), len = 60 + H_(i + 2) * 120;
      const x = dir > 0 ? -len + u * (W + len * 2) : W + len - u * (W + len * 2);
      ctx.globalAlpha = (o.a === undefined ? 0.35 : o.a) * Math.sin(u * Math.PI); ctx.lineWidth = 1.5 + H_(i + 3) * 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + dir * len * 0.5, y - 6, x + dir * len, y + 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  };

  /* ---------- the funnel cloud ---------- */
  K.funnel = (x, y, h, t, o = {}) => {
    const s = o.s || 1, wTop = (o.w || 260) * s, lean = (o.lean || 0) * s, col = o.col || '#5a6258';
    const n = 26;
    // the body: stacked bands from the narrow foot up to the wide wall cloud, swaying
    for (let i = n; i >= 0; i--) {
      const u = i / n, yy = y - u * h, sway = Math.sin(t * 1.8 + u * 4) * 14 * s * (1 - u) + lean * u * u;
      const ww = K.lerp((o.foot || 16) * s, wTop, Math.pow(u, 1.7)), hh = 12 * s + u * 20 * s;
      const shade = 0.75 + 0.25 * Math.sin(u * 20 - t * 9);
      ctx.fillStyle = col; ctx.globalAlpha = o.alpha || 0.92;
      ctx.beginPath(); ctx.ellipse(x + sway, yy, ww / 2, hh / 2, 0, 0, TAU); ctx.fill();
      // spinning streaks
      ctx.globalAlpha = 0.35 * shade; ctx.strokeStyle = '#2c3230'; ctx.lineWidth = 2 * s;
      const a0 = (t * 6 + u * 9) % TAU;
      ctx.beginPath(); ctx.ellipse(x + sway, yy, ww / 2 * 0.85, hh / 2 * 0.6, 0, a0, a0 + 1.6); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,210,200,0.5)'; ctx.lineWidth = 1.2 * s;
      ctx.beginPath(); ctx.ellipse(x + sway, yy, ww / 2 * 0.95, hh / 2 * 0.7, 0, a0 + 2.6, a0 + 3.4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (o.dust !== false) {
      // a dust skirt churning at the foot
      for (let k = 0; k < 14; k++) {
        const a = t * 5 + k * 0.45, r = (30 + (k % 4) * 14) * s;
        ctx.fillStyle = k % 2 ? 'rgba(150,130,100,0.5)' : 'rgba(120,104,84,0.55)';
        circle(x + Math.cos(a) * r, y - 6 * s + Math.sin(a) * 6 * s - (k % 3) * 6 * s, (12 + (k % 3) * 6) * s); ctx.fill();
      }
    }
    if (o.debris !== false) {
      // a ring of junk going round (in front when its sine is positive)
      const kinds = ['post', 'hay', 'sign', 'tyre', 'mailbox', 'post', 'roof'];
      for (let k = 0; k < kinds.length; k++) {
        const a = t * (2.2 + (k % 3) * 0.3) + k * TAU / kinds.length, u = 0.25 + (k % 4) * 0.15;
        const ww = K.lerp((o.foot || 16) * s, wTop, Math.pow(u, 1.7)) * 0.62, yy = y - u * h + Math.sin(a) * 8 * s;
        const sway = Math.sin(t * 1.8 + u * 4) * 14 * s * (1 - u) + lean * u * u;
        ctx.globalAlpha = Math.sin(a) > 0 ? 1 : 0.55;
        K.debris(kinds[k], x + sway + Math.cos(a) * ww, yy, a * 2, 0.45 * s);
      }
      ctx.globalAlpha = 1;
    }
  };

  /* ---------- debris ---------- */
  K.debris = (kind, x, y, rot, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    ctx.lineWidth = 2;
    if (kind === 'hay') {
      ctx.fillStyle = '#e8c45a'; ctx.strokeStyle = '#a8842a'; rr(-24, -16, 48, 32, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(168,132,42,0.7)'; ctx.lineWidth = 1.2;
      for (let k = -18; k <= 18; k += 6) { ctx.beginPath(); ctx.moveTo(k, -14); ctx.lineTo(k + 3, 14); ctx.stroke(); }
      ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(-10, 16); ctx.moveTo(10, -16); ctx.lineTo(10, 16); ctx.stroke();
    } else if (kind === 'post') {
      ctx.fillStyle = '#a07a4a'; ctx.strokeStyle = '#5e3e20'; ctx.fillRect(-4, -24, 8, 48); ctx.strokeRect(-4, -24, 8, 48);
      ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-16, -14, 32, 5); ctx.fillRect(-16, 6, 32, 5);
    } else if (kind === 'fence') {
      ctx.fillStyle = '#c8a878'; ctx.strokeStyle = '#7a5a34';
      for (const k of [-20, 0, 20]) { ctx.fillRect(k - 3, -16, 6, 32); ctx.strokeRect(k - 3, -16, 6, 32); }
      ctx.fillRect(-26, -10, 52, 5); ctx.fillRect(-26, 5, 52, 5);
    } else if (kind === 'mailbox') {
      ctx.fillStyle = '#5a5e6a'; ctx.fillRect(-2, 0, 4, 20);
      ctx.fillStyle = '#3a6ad0'; ctx.strokeStyle = '#1e3a7a'; ctx.beginPath(); ctx.moveTo(-14, 2); ctx.lineTo(-14, -8); ctx.arc(0, -8, 14, Math.PI, 0); ctx.lineTo(14, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8322a'; ctx.fillRect(10, -16, 3, 10); ctx.fillRect(10, -16, 7, 4);
    } else if (kind === 'sign') {
      ctx.fillStyle = '#5a5e6a'; ctx.fillRect(-2, 0, 4, 26);
      ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#1c1a20'; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(18, -2); ctx.lineTo(0, 18); ctx.lineTo(-18, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1c1a20'; ctx.fillRect(-1.5, -12, 3, 10); circle(0, 4, 2); ctx.fill();
    } else if (kind === 'tyre') {
      ctx.fillStyle = '#1e1e24'; circle(0, 0, 18); ctx.fill();
      ctx.fillStyle = '#5a5e6a'; circle(0, 0, 8); ctx.fill();
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 2; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.stroke(); }
    } else if (kind === 'cow') {
      ctx.fillStyle = '#f4f2ee'; ctx.strokeStyle = '#2a2624'; rr(-26, -14, 46, 26, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a2624'; ctx.beginPath(); ctx.ellipse(-10, -4, 8, 6, 0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(8, 4, 6, 5, -0.3, 0, TAU); ctx.fill();
      for (const lx of [-20, -10, 6, 14]) { ctx.fillStyle = '#f4f2ee'; ctx.fillRect(lx, 10, 5, 12); ctx.strokeRect(lx, 10, 5, 12); ctx.fillStyle = '#2a2624'; ctx.fillRect(lx, 19, 5, 3); }
      ctx.fillStyle = '#f4f2ee'; rr(16, -22, 18, 16, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2a8b0'; rr(26, -14, 10, 8, 3); ctx.fill();
      ctx.fillStyle = '#2a2624'; circle(22, -17, 1.6); ctx.fill(); circle(30, -17, 1.6); ctx.fill();
      ctx.fillStyle = '#d8c8a0'; ctx.beginPath(); ctx.moveTo(18, -22); ctx.lineTo(15, -28); ctx.lineTo(21, -23); ctx.fill(); ctx.beginPath(); ctx.moveTo(30, -22); ctx.lineTo(33, -28); ctx.lineTo(28, -23); ctx.fill();
      ctx.strokeStyle = '#2a2624'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-26, -8); ctx.quadraticCurveTo(-34, -4, -32, 6); ctx.stroke();
    } else if (kind === 'roof') {
      ctx.fillStyle = '#8a3a2a'; ctx.strokeStyle = '#4a1a12'; ctx.beginPath(); ctx.moveTo(-40, 10); ctx.lineTo(-30, -12); ctx.lineTo(36, -12); ctx.lineTo(42, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,10,6,0.5)'; ctx.lineWidth = 1.5; for (let k = -28; k < 40; k += 9) { ctx.beginPath(); ctx.moveTo(k, -12); ctx.lineTo(k - 3, 10); ctx.stroke(); }
      ctx.fillStyle = '#c8c0b0'; ctx.fillRect(-40, 8, 82, 4);
    } else if (kind === 'scarecrow') {
      ctx.fillStyle = '#7a5a34'; ctx.fillRect(-2, -10, 4, 34); ctx.fillRect(-20, -6, 40, 4);
      ctx.fillStyle = '#4a7ad0'; rr(-10, -8, 20, 20, 3); ctx.fill();
      ctx.fillStyle = '#f0d890'; circle(0, -16, 8); ctx.fill();
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-12, -24, 24, 4); rr(-7, -32, 14, 9, 3); ctx.fill();
      ctx.fillStyle = '#2a2420'; circle(-3, -16, 1.4); ctx.fill(); circle(3, -16, 1.4); ctx.fill();
      ctx.fillStyle = '#e8c45a'; for (const k of [-20, 20]) { ctx.beginPath(); ctx.moveTo(k, -4); ctx.lineTo(k + Math.sign(k) * 6, -8); ctx.lineTo(k + Math.sign(k) * 6, 0); ctx.fill(); }
    } else if (kind === 'tractor') {
      ctx.fillStyle = '#d83a2a'; ctx.strokeStyle = '#7a1a12'; rr(-30, -18, 42, 20, 4); ctx.fill(); ctx.stroke();
      rr(-4, -36, 22, 20, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe6ff'; ctx.fillRect(0, -32, 14, 10);
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(-24, -30, 4, 12);
      ctx.fillStyle = '#1e1e24'; circle(10, 6, 16); ctx.fill(); circle(-22, 10, 10); ctx.fill();
      ctx.fillStyle = '#ffd23a'; circle(10, 6, 7); ctx.fill(); circle(-22, 10, 4); ctx.fill();
    } else if (kind === 'shed') {
      ctx.fillStyle = '#b84a3a'; ctx.strokeStyle = '#6a2418'; ctx.fillRect(-34, -26, 68, 46); ctx.strokeRect(-34, -26, 68, 46);
      ctx.fillStyle = '#5a3a2a'; ctx.beginPath(); ctx.moveTo(-40, -24); ctx.lineTo(0, -48); ctx.lineTo(40, -24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f2e8d8'; ctx.fillRect(-12, -10, 24, 30); ctx.strokeStyle = '#f2e8d8'; ctx.lineWidth = 2; ctx.strokeRect(-30, -22, 60, 40);
      ctx.strokeStyle = '#b84a3a'; ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(12, 20); ctx.moveTo(12, -10); ctx.lineTo(-12, 20); ctx.stroke();
    } else { ctx.fillStyle = '#8a8a90'; rr(-12, -12, 24, 24, 4); ctx.fill(); }
    ctx.restore();
  };

  /* ---------- the farm far away ---------- */
  K.farm = (cx, t, o = {}) => {
    const hy = o.horizon === undefined ? 300 : o.horizon;
    // far fields
    ctx.fillStyle = '#5e7448'; ctx.fillRect(0, hy, W, H - hy);
    for (let layer = 0; layer < 3; layer++) {
      const par = [0.08, 0.2, 0.45][layer], y = hy + [0, 14, 34][layer], step = [230, 300, 380][layer];
      const sx = cx * par, i0 = Math.floor(sx / step) - 1, i1 = Math.ceil((sx + W) / step) + 1;
      ctx.fillStyle = ['#6e8452', '#7a9256', '#86a05c'][layer]; ctx.fillRect(0, y, W, H - y);
      for (let i = i0; i <= i1; i++) {
        const x = i * step - sx + H_(i * 3 + layer) * step * 0.4, kind = Math.floor(H_(i * 7 + layer * 13) * 6);
        const sc = [0.45, 0.7, 1][layer];
        if (kind === 0) { // a barn
          ctx.fillStyle = layer === 0 ? '#6a3a34' : '#8a3a30'; ctx.fillRect(x, y - 40 * sc, 60 * sc, 40 * sc);
          ctx.beginPath(); ctx.moveTo(x - 6 * sc, y - 40 * sc); ctx.lineTo(x + 30 * sc, y - 64 * sc); ctx.lineTo(x + 66 * sc, y - 40 * sc); ctx.fill();
          ctx.strokeStyle = 'rgba(240,230,210,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 20 * sc, y - 26 * sc, 20 * sc, 26 * sc);
        } else if (kind === 1) { // a silo
          ctx.fillStyle = '#9aa0a6'; ctx.fillRect(x, y - 70 * sc, 22 * sc, 70 * sc);
          ctx.beginPath(); ctx.arc(x + 11 * sc, y - 70 * sc, 11 * sc, Math.PI, 0); ctx.fill();
        } else if (kind === 2) { // a tree bending in the wind
          ctx.strokeStyle = '#3a3026'; ctx.lineWidth = 4 * sc; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4 * sc, y - 30 * sc, x + 12 * sc, y - 46 * sc); ctx.stroke();
          ctx.fillStyle = layer === 2 ? '#3e5a2e' : '#4a6238';
          const b = Math.sin(t * 3 + i) * 4 * sc;
          circle(x + 14 * sc + b, y - 52 * sc, 18 * sc); ctx.fill(); circle(x + 28 * sc + b, y - 46 * sc, 14 * sc); ctx.fill();
        } else if (kind === 3) { // a windmill pump
          ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 2 * sc; ctx.beginPath(); ctx.moveTo(x - 10 * sc, y); ctx.lineTo(x, y - 60 * sc); ctx.lineTo(x + 10 * sc, y); ctx.stroke();
          for (let k = 0; k < 8; k++) { const a = t * 8 + k * TAU / 8; ctx.beginPath(); ctx.moveTo(x, y - 60 * sc); ctx.lineTo(x + Math.cos(a) * 16 * sc, y - 60 * sc + Math.sin(a) * 16 * sc); ctx.stroke(); }
        } else { // a fence run
          ctx.strokeStyle = 'rgba(70,56,40,0.7)'; ctx.lineWidth = 1.5;
          for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + k * 18 * sc, y); ctx.lineTo(x + k * 18 * sc, y - 12 * sc); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(x, y - 8 * sc); ctx.lineTo(x + 90 * sc, y - 8 * sc); ctx.stroke();
        }
      }
    }
    if (o.dark) { ctx.fillStyle = 'rgba(10,14,12,' + o.dark * 0.5 + ')'; ctx.fillRect(0, hy - 80, W, H - hy + 80); }
  };

  /* ---------- the van ---------- */
  K.van = (x, y, o = {}) => {
    const s = o.s || 1, t = o.t || 0, dents = o.dents || 0;
    ctx.save(); ctx.translate(x, y - (o.bounce || 0)); ctx.rotate(o.lean || 0); ctx.scale(s, s);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 2, 92, 8, 0, 0, TAU); ctx.fill();
    // body: a boxy white van with a blue stripe
    const g = ctx.createLinearGradient(0, -86, 0, -10);
    g.addColorStop(0, '#f4f4ee'); g.addColorStop(1, '#c4c6c0');
    ctx.fillStyle = g; ctx.strokeStyle = '#4a4c52'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-86, -14); ctx.lineTo(-86, -80); ctx.quadraticCurveTo(-86, -86, -80, -86); ctx.lineTo(42, -86);
    ctx.quadraticCurveTo(56, -86, 62, -70); ctx.lineTo(76, -46); ctx.quadraticCurveTo(88, -44, 88, -30); ctx.lineTo(88, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a6ad0'; ctx.fillRect(-86, -40, 174, 8);
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(-86, -32, 174, 3);
    // lettering
    ctx.font = 'bold 11px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2a6ad0'; ctx.fillText('STORM CHASERS', -76, -52);
    // windows
    ctx.fillStyle = '#2a3446'; ctx.beginPath(); ctx.moveTo(44, -80); ctx.lineTo(56, -80); ctx.lineTo(70, -50); ctx.lineTo(44, -50); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(160,200,240,0.45)'; ctx.beginPath(); ctx.moveTo(48, -77); ctx.lineTo(54, -77); ctx.lineTo(60, -64); ctx.lineTo(48, -64); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a3446'; rr(10, -80, 28, 22, 3); ctx.fill();
    ctx.fillStyle = 'rgba(160,200,240,0.4)'; ctx.fillRect(13, -77, 8, 16);
    // door line and handle
    ctx.strokeStyle = '#8a8c90'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(40, -84); ctx.lineTo(40, -16); ctx.moveTo(-6, -84); ctx.lineTo(-6, -16); ctx.stroke();
    ctx.fillStyle = '#4a4c52'; ctx.fillRect(30, -46, 8, 3);
    // dents and a flapping door when battered
    for (let k = 0; k < Math.min(dents, 6); k++) {
      const dx = -70 + H_(k * 5 + 1) * 140, dy = -76 + H_(k * 5 + 2) * 50;
      ctx.fillStyle = 'rgba(60,62,70,0.35)'; ctx.beginPath(); ctx.ellipse(dx, dy, 9, 5, H_(k) * 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(dx, dy, 8, 3.6, 5.2); ctx.stroke();
    }
    if (dents >= 4) { ctx.fillStyle = '#d8d8d2'; ctx.strokeStyle = '#4a4c52'; ctx.save(); ctx.translate(-6, -84); ctx.rotate(-0.25 - Math.abs(Math.sin(t * 9)) * 0.25); ctx.fillRect(0, 0, 44, 66); ctx.strokeRect(0, 0, 44, 66); ctx.restore(); }
    // the bumper, the headlight and the gold bull-bar
    ctx.fillStyle = '#5a5c62'; rr(-90, -18, 182, 8, 3); ctx.fill();
    ctx.fillStyle = '#fff6c0'; rr(80, -42, 8, 10, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,200,0.18)'; ctx.beginPath(); ctx.moveTo(88, -40); ctx.lineTo(220, -64); ctx.lineTo(220, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8322a'; rr(-90, -46, 6, 10, 2); ctx.fill();
    if (o.bar) {
      ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(86, -48); ctx.quadraticCurveTo(104, -40, 100, -14); ctx.moveTo(86, -30); ctx.lineTo(100, -28); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // wheels
    for (const wx of [-52, 54]) {
      ctx.fillStyle = '#1a1a20'; circle(wx, -10, 15); ctx.fill();
      const lost = wx < 0 && dents >= 2;
      ctx.fillStyle = lost ? '#3a3a40' : '#b8bcc4'; circle(wx, -10, lost ? 5 : 8); ctx.fill();
      ctx.strokeStyle = '#5a5e66'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) { const a = -t * 14 + k * TAU / 4; ctx.beginPath(); ctx.moveTo(wx, -10); ctx.lineTo(wx + Math.cos(a) * 7, -10 + Math.sin(a) * 7); ctx.stroke(); }
    }
    // roof: a rack, the satellite dish and the spinning wind gauge
    ctx.fillStyle = '#5a5c62'; ctx.fillRect(-80, -92, 120, 6);
    for (const rx of [-76, -40, -4, 32]) ctx.fillRect(rx, -92, 3, 6);
    if (o.dish !== 'off') {
      ctx.save(); ctx.translate(-58, -92);
      ctx.fillStyle = '#4a4c52'; ctx.fillRect(-2, -12, 4, 12);
      ctx.rotate(-0.5 + Math.sin(t * 2) * 0.05);
      ctx.fillStyle = '#e8eaee'; ctx.strokeStyle = '#6a6c72'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, -16, 16, 7, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#6a6c72'; ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(0, -30); ctx.lineTo(10, -18); ctx.stroke();
      ctx.fillStyle = '#e8322a'; circle(0, -30, 2.2); ctx.fill();
      ctx.restore();
    } else { ctx.fillStyle = '#4a4c52'; ctx.fillRect(-60, -100, 4, 8); }
    // wind gauge: a pole with three spinning cups
    ctx.fillStyle = '#4a4c52'; ctx.fillRect(22, -118, 3, 26);
    for (let k = 0; k < 3; k++) {
      const a = t * 18 + k * TAU / 3, cxp = 23.5 + Math.cos(a) * 12, cyp = -118 + Math.sin(a) * 3;
      ctx.strokeStyle = '#4a4c52'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(23.5, -118); ctx.lineTo(cxp, cyp); ctx.stroke();
      ctx.fillStyle = k === 0 ? '#e8322a' : '#e8eaee'; circle(cxp, cyp, 3.2); ctx.fill();
    }
    // the roof hatch
    if (o.hatch) { ctx.fillStyle = '#3a3c42'; rr(-30, -94, 36, 8, 3); ctx.fill(); ctx.fillStyle = '#9a9ca2'; ctx.save(); ctx.translate(6, -94); ctx.rotate(0.9); ctx.fillRect(0, -3, 30, 5); ctx.restore(); }
    ctx.restore();
  };

  /* ---------- shared sounds ---------- */
  Sfx.extra.stormPop = function (p) { p = p || 1; this.tone(880 * p, 0.05, 'triangle', 0.035, 1320 * p); this.tone(1320 * p, 0.08, 'sine', 0.025, null, 0.04); };
  Sfx.extra.stormHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.stormCheer = function () { [392, 523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.03, null, i * 0.08)); };
  Sfx.extra.stormThunder = function () { this.tone(70, 0.9, 'sawtooth', 0.04, 40); this.tone(110, 0.5, 'square', 0.02, 50, 0.05); this.tone(55, 1.2, 'sine', 0.06, 35, 0.15); };
  Sfx.extra.stormWind = function (p) { p = clamp(p || 0.5, 0.1, 1.5); this.tone(180 + 200 * p, 0.5, 'sawtooth', 0.006 + 0.01 * p, 260 + 300 * p); };
  Sfx.extra.stormSiren = function () { [0, 0.45].forEach(d => { this.tone(520, 0.4, 'square', 0.025, 880, d); }); };
  Sfx.extra.stormThud = function () { this.tone(110, 0.14, 'sine', 0.07, 55); this.tone(240, 0.05, 'triangle', 0.02, 160, 0.01); };
  Sfx.extra.stormWhoosh = function (p) { p = p || 1; this.tone(260 * p, 0.18, 'sawtooth', 0.016, 1000 * p); };
  Sfx.extra.stormBoing = function (p) { p = p || 1; this.tone(150 * p, 0.3, 'sine', 0.06, 480 * p); };
  Sfx.extra.stormMoo = function () { this.tone(150, 0.55, 'sawtooth', 0.03, 120); this.tone(160, 0.45, 'triangle', 0.03, 110, 0.05); };
  Sfx.extra.stormSplash = function () { this.tone(500, 0.2, 'sawtooth', 0.015, 120); this.tone(300, 0.25, 'triangle', 0.02, 90, 0.04); };
  Sfx.extra.stormCrack = function () { this.tone(1800, 0.04, 'square', 0.02, 900); this.tone(600, 0.1, 'triangle', 0.02, 200, 0.03); };
  return K;
})();
