/* Pip & Bo - World 26 Circus Big Top: small shared helpers for the four circus levels (loads before them). */
'use strict';

/* The only global here is CIRCUS. Every World 26 level uses it for the same little jobs: each player's key names,
   short pops and particles, hint bubbles and prompts over the players, HUD chips, the per-player action words on the
   touch buttons, and some circus scenery (the striped big top, bunting, the crowd, a tent on the midway).
   Nothing here touches the rules of a level, and nothing here keeps state between levels (state lives in G.mst). */
const CIRCUS = (() => {
  const K = {};
  const FONT = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  K.FONT = FONT;
  K.lerp = (a, b, u) => a + (b - a) * u;
  K.smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  // 1-player mode: the computer plays this character (no key reminders for it)
  K.quiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
  // each player's own key names (a player with a controller sees its buttons, touch shows the arrows)
  K.key = (id, what) => {
    const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
    if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
    if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
    if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
    if (what === 'up') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
    if (what === 'down') return pad || touch ? '▼' : id === 0 ? 'S' : '↓';
    if (what === 'lr') return pad ? 'stick' : touch ? '◀▶' : id === 0 ? 'A D' : '← →';
    return '';
  };
  // who pressed anything this tick (st.inT per seat; st.personT for a person)
  K.track = st => {
    for (const q of [0, 1]) {
      const p = G.players[q], i = p.input;
      const any = i.left || i.right || i.jump || i.down || i.up || i.act || p.pendingJump || p.pendingAct;
      if (any) st.inT[q] = G.time;
      if (any && !cpuOn(q)) st.personT = G.time;
    }
  };
  // both seats are playing (a person who pressed something lately, or the computer)
  K.both = (st, win = 12) => [0, 1].every(q => cpuOn(q) || G.time - st.inT[q] < win);
  // nobody (no person) has pressed anything for `wait` s: the level takes a break and the clock stops
  K.idle = (st, dt, wait = 12) => {
    const people = [0, 1].filter(q => !cpuOn(q));
    const w = G.introT <= 0 && people.length > 0 && G.time - st.personT > wait;
    if (w) G.time -= dt;
    return w;
  };
  K.fx = st => { st.parts = []; st.pops = []; st.hints = [null, null]; st.msg = null; st.hinted = {}; };
  K.pop = (st, x, y, s, col, size) => { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); };
  K.part = (st, x, y, vx, vy, life, col, size, grav, kind) => {
    if (st.parts.length > 300) st.parts.shift();
    st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
  };
  K.spark = (st, x, y, n, cols) => {
    cols = cols || [C.gold, '#ffffff'];
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 140; K.part(st, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.6, cols[i % cols.length], 3 + Math.random() * 2, 0, 'star'); }
  };
  K.confetti = (st, x, y, n) => {
    const cols = ['#ffd36b', '#ffffff', '#ff9fb5', '#9fe8ff', '#8fe3b0', '#ff8a5a'];
    for (let i = 0; i < n; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()), sp = 140 + Math.random() * 220; K.part(st, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 1.6, cols[i % cols.length], 4, 260, 'conf'); }
  };
  K.dust = (st, x, y, col, n = 6) => { for (let i = 0; i < n; i++) K.part(st, x + (Math.random() - 0.5) * 24, y, (Math.random() - 0.5) * 90, -30 - Math.random() * 50, 0.6, col || 'rgba(230,210,170,0.8)', 4, 60, 'dust'); };
  K.hint = (st, id, text, life) => { if (K.quiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; };
  K.hintOnce = (st, name, id, text, life) => { if (st.hinted[name]) return; st.hinted[name] = true; K.hint(st, id, text, life); };
  K.msg = (st, text, col, life) => { st.msg = { text, col: col || '#ffffff', t: 0, life: life || 3.5 }; };
  // ages the pops, particles, hints and the message line
  K.tickFx = (st, dt) => {
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const q = st.parts[i];
      if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
      q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
      if (q.kind === 'dust' || q.kind === 'smoke') q.vx *= 1 - dt * 2;
      if (q.kind === 'smoke') q.size += dt * 6;
    }
    for (const q of st.pops) q.t += dt;
    st.pops = st.pops.filter(q => q.t < 1.3);
    for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
    if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  };
  K.star = (x, y, ro, ri, rot) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  };
  // particles in world px (call inside the camera transform); cx culls off-screen ones
  K.drawParts = (st, cx = 0) => {
    for (const q of st.parts) {
      if (q.x < cx - 40 || q.x > cx + W + 40) continue;
      const a = clamp(q.life / q.max, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = q.col;
      if (q.kind === 'star') { K.star(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
      else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
      else if (q.kind === 'note') text('♪', q.x, q.y, 14 + q.size, q.col, 'center', 'body');
      else if (q.kind === 'smoke') { ctx.globalAlpha = a * 0.7; circle(q.x, q.y, q.size); ctx.fill(); }
      else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  };
  // the pops, in screen px (cx is the camera x)
  K.drawPops = (st, cx = 0, cy = 0) => {
    const big = hudBig();
    for (const q of st.pops) {
      const x = clamp(q.x - cx, 120, W - 120), y = clamp(q.y - cy - q.t * 30, 96, H - 110);
      ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
      bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
      ctx.globalAlpha = 1;
    }
  };
  // a HUD chip: gold and blinking when it is the thing to press now, green while held
  K.chip = (x, y, w, h, str, lit, held, z) => {
    ctx.fillStyle = lit ? (Math.sin(G.clock * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(143,227,176,0.85)' : 'rgba(255,255,255,0.12)';
    rr(x, y, w, h, h / 2); ctx.fill();
    let fs = 12 * z;
    ctx.font = FONT(fs);
    while (fs > 8 && ctx.measureText(str).width > w - 8) { fs -= 0.5; ctx.font = FONT(fs); }
    text(str, x + w / 2, y + h / 2 + 0.5, fs, lit || held ? C.ink : '#ffffff', 'center', 'body');
  };
  // a player's panel at the bottom corner: name and job; returns the box (contents are the level's)
  K.panel = (id, job, w, h, z) => {
    const pw = Math.round(w * z), ph = Math.round(h * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.84)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    text(NAMES[id] + ' · ' + job + (K.quiet(id) ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 13 * z, PCOL[id], 'left');
    return { x: px, y: py, w: pw, h: ph };
  };
  // the message line (gold help, taking a break): top middle when it fits, else under the level pill
  K.drawMsg = (st, m, rightX = W - 14) => {
    if (!m) return;
    const big = hudBig();
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26;
    ctx.font = FONT(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = rightX - 10;
    ctx.font = FONT(fs);
    let w = ctx.measureText(m.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = big ? 96 : 80;
      while (w > W - 40 && fs > 11) { fs--; ctx.font = FONT(fs); w = ctx.measureText(m.text).width + 30; }
    }
    ctx.globalAlpha = clamp((m.life - m.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(m.text, cx, y + h / 2 + 0.5, fs, m.col, 'center', 'body'); ctx.globalAlpha = 1;
  };
  // prompts over the players: say(id, str, x, y, col, pulse) with screen px; a hint bubble replaces the prompt
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
        ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
        text(str, 0, 0.5, fs, col, 'center', 'body');
        ctx.restore();
      },
    };
  };
  // the touch buttons and the legend name each player's own action (roles swap between rooms)
  let labelEls = null;
  K.actLabels = (words, both) => {
    // (review, 2026-11-16) the cards read the level's action words too (js/ui.js setActWords), so they follow a swap
    if (words && words[0] && words[1] && typeof setActWords === 'function') setActWords(words);
    try {
      if (!labelEls || !labelEls.every(o => document.contains(o.el))) labelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
        return { el, id };
      });
      let changed = false;
      for (const o of labelEls) {
        const want = o.id < 0 ? both : words[o.id];
        if (want && o.el.textContent !== want) { o.el.textContent = want; changed = true; }
      }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* the labels stay as the framework set them */ }
  };
  // draws a player (engine look) with feet at (x, y), rotated by rot around the middle of the body; o: face, sx, sy, s, stun
  K.hero = (id, x, y, o = {}) => {
    const p = G.players[id], save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive };
    ctx.save(); ctx.translate(x, y - PH / 2); ctx.rotate(o.rot || 0); if (o.s) ctx.scale(o.s, o.s);
    p.x = -PW / 2; p.y = -PH / 2; p.alive = true; p.vy = o.vy || 0;
    p.face = o.face || 1; p.stun = o.stun ? 0.5 : 0;
    if (o.sy) { p.sy = o.sy; p.sx = o.sx || 2 - o.sy; }
    drawPlayer(p);
    ctx.restore();
    Object.assign(p, save);
  };
  // the engine bodies stay hidden while a level draws Pip and Bo itself; their x / y follow for name tags and bubbles
  K.hide = st => { st.hid = G.players.map(p => p.alive); for (const p of G.players) p.alive = false; };
  K.unhide = st => { if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; } };
  K.place = (id, sx, sy) => { const p = G.players[id]; p.x = sx - PW / 2; p.y = sy - PH; p.alive = true; p.grounded = true; p.vy = 0; p.stun = 0; };

  /* ---------- scenery ---------- */
  const STRIPE = ['#e8443a', '#fff4e6'];
  // inside the big top: striped canvas walls fading into the dark peak, spotlights, the ring and the crowd
  // the tent's canvas, seat tiers and valance never change, so they are drawn once into pictures; the seated crowd is
  // two pictures (every other person) that bob in turn when the crowd cheers
  let _bt = { sc: 0 };
  const bigTopLayers = () => {
    const sc = Math.max(1, Math.min(3, canvas.width / W));
    if (_bt.sc === sc) return _bt;
    const mk = () => { const cv = document.createElement('canvas'); cv.width = Math.ceil(W * sc); cv.height = Math.ceil(H * sc); const c = cv.getContext('2d'); c.scale(sc, sc); return [cv, c]; };
    const [base, c] = mk(), crowd = [mk(), mk()];
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1838'); g.addColorStop(0.45, '#5a2440'); g.addColorStop(1, '#7a3040');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // canvas stripes fanning up to the king pole
    for (let i = -8; i <= 8; i++) {
      c.fillStyle = i % 2 ? 'rgba(232,68,58,0.42)' : 'rgba(255,244,230,0.13)';
      c.beginPath(); c.moveTo(W / 2 + i * 14, -10); c.lineTo(W / 2 + i * 150 - 60, H * 0.7); c.lineTo(W / 2 + i * 150 + 90, H * 0.7); c.lineTo(W / 2 + i * 14 + 14, -10); c.closePath(); c.fill();
    }
    // seams between the canvas panels
    c.strokeStyle = 'rgba(40,10,30,0.28)'; c.lineWidth = 1.5;
    for (let i = -8; i <= 9; i++) { c.beginPath(); c.moveTo(W / 2 + i * 14, -10); c.lineTo(W / 2 + i * 150 - 60, H * 0.7); c.stroke(); }
    // the king pole far behind, and the tiers of seats fading into the dark at the back of the tent
    c.fillStyle = 'rgba(30,14,30,0.35)'; c.fillRect(W / 2 - 7, 0, 14, H * 0.7);
    c.fillStyle = 'rgba(255,230,200,0.08)'; c.fillRect(W / 2 - 7, 0, 4, H * 0.7);
    const sy = H * 0.68;
    c.fillStyle = '#3a1830'; c.fillRect(0, sy, W, H - sy);
    for (let r = 0; r < 5; r++) {
      const ry = sy + 6 + r * 22;
      c.fillStyle = r % 2 ? '#4a2038' : '#45203a'; c.fillRect(0, ry + 12, W, 10);
      c.fillStyle = 'rgba(255,220,180,0.07)'; c.fillRect(0, ry + 12, W, 1.5);
    }
    // the scalloped valance round the top of the tent, with a gold trim
    c.fillStyle = '#9a2a30'; c.fillRect(0, 0, W, 16);
    for (let x = 0; x < W + 30; x += 30) {
      c.fillStyle = (x / 30) % 2 ? '#c8383a' : '#f0e2d0'; c.beginPath(); c.arc(x + 15, 16, 15, 0, Math.PI); c.fill();
      c.fillStyle = 'rgba(20,10,30,0.18)'; c.beginPath(); c.arc(x + 15, 16, 15, 0, Math.PI * 0.5); c.lineTo(x + 15, 16); c.fill();
    }
    c.fillStyle = C.gold; c.fillRect(0, 14, W, 3);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 14, W, 1);
    for (let r = 0; r < 5; r++) {
      const ry = sy + 6 + r * 22;
      for (let x = (r % 2) * 9; x < W; x += 18) {
        const hh = hash(x, r * 31);
        if (hh % 5 === 0) continue;
        const c = crowd[hh % 2][1];
        c.fillStyle = ['#5a2a48', '#4e2a50', '#6a3040', '#583050'][hh % 4];
        c.beginPath(); c.arc(x, ry + 12, 6.5, Math.PI, 0); c.fill();
        c.fillStyle = ['#7a4a50', '#6a4048', '#8a5a58'][hh % 3]; circleOn(c, x, ry + 3, 4.2); c.fill();
      }
    }
    _bt = { sc, base, crowd: crowd.map(k => k[0]) };
    return _bt;
  };
  K.bigTop = (t, o = {}) => {
    const L = bigTopLayers(), sy = H * 0.68;
    ctx.drawImage(L.base, 0, 0, W, H);
    for (let k = 0; k < 2; k++) {
      const bob = o.cheer && !reduceMotion ? Math.max(0, Math.sin(t * 10 + k * 2.6)) * 3 * o.cheer : 0;
      const y0 = Math.floor(sy);
      ctx.drawImage(L.crowd[k], 0, Math.round(y0 * L.sc), L.base.width, L.base.height - Math.round(y0 * L.sc), 0, y0 - bob, W, H - y0);
    }
    ctx.fillStyle = 'rgba(20,8,20,0.25)'; ctx.fillRect(0, sy, W, 5);
    // strings of little lights (each bulb with a soft glow)
    for (let s = 0; s < 2; s++) {
      ctx.strokeStyle = 'rgba(30,14,30,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24; ctx.lineTo(u * W, 40 + s * 46 + Math.sin(u * Math.PI) * 36 - 3); } ctx.stroke();
      for (let i = 0; i <= 24; i++) {
        const u = i / 24, x = u * W, y = 40 + s * 46 + Math.sin(u * Math.PI) * 36, on = (i + s + Math.floor(t * 3)) % 3 === 0;
        const c = on ? '#fff2b0' : ['#ffcf5a', '#ff8fb0', '#8fd8ff'][(i + s) % 3];
        if (on) { ctx.fillStyle = 'rgba(255,240,180,0.18)'; circle(x, y, 8); ctx.fill(); }
        ctx.fillStyle = c; circle(x, y, 2.8); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(x - 0.8, y - 0.9, 1); ctx.fill();
      }
    }
    // spotlights
    if (!o.noSpots) for (let k = 0; k < 2; k++) {
      const sx = k ? W - 120 : 120, tx = W / 2 + Math.sin(t * 0.5 + k * 2) * 260;
      ctx.fillStyle = 'rgba(255,245,200,0.07)';
      ctx.beginPath(); ctx.moveTo(sx - 10, 0); ctx.lineTo(sx + 10, 0); ctx.lineTo(tx + 90, H); ctx.lineTo(tx - 90, H); ctx.closePath(); ctx.fill();
    }
  };
  // rows of a cheering crowd along the bottom (cheer 0..1 makes them jump and wave)
  K.crowd = (y, cheer, t, x0 = 0, x1 = W) => {
    ctx.fillStyle = '#3a1c30'; ctx.fillRect(x0, y, x1 - x0, H - y);
    ctx.fillStyle = '#4a2438'; for (let r = 0; r < 2; r++) ctx.fillRect(x0, y + 20 + r * 16, x1 - x0, 5);
    const cols = ['#ffb38a', '#e8a07a', '#c98a6a', '#8a5a4a', '#f2c8a0'], shirts = ['#5b95ff', '#ff6b8a', '#8fe3b0', '#ffc53d', '#b28dff', '#ff8a5a'];
    const hair = ['#3a2418', '#6a3a1a', '#e8c070', '#1a1a24', '#9a4a2a'];
    for (let row = 0; row < 2; row++) for (let x = x0 + 10 + row * 13; x < x1; x += 26) {
      const n = Math.floor(x * 7 + row * 13), jump = cheer > 0 ? Math.max(0, Math.sin(t * 12 + n)) * 6 * cheer : 0;
      const by = y + 14 + row * 16 - jump, sc = shirts[n % shirts.length], sk = cols[n % cols.length];
      ctx.fillStyle = sc; rr(x - 8, by + 6, 16, 16, 6); ctx.fill();
      ctx.fillStyle = shade(sc, 0.25); rr(x + 1, by + 7, 7, 15, 4); ctx.fill();
      ctx.fillStyle = sk; circle(x, by, 7); ctx.fill();
      ctx.fillStyle = shade(sk, 0.2); ctx.beginPath(); ctx.arc(x, by, 7, -Math.PI * 0.35, Math.PI * 0.65); ctx.fill();
      ctx.fillStyle = hair[n % hair.length]; ctx.beginPath(); ctx.arc(x, by - 1, 7.3, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      ctx.fillStyle = '#2a1a24'; circle(x - 2.4, by + 1, 0.9); ctx.fill(); circle(x + 2.4, by + 1, 0.9); ctx.fill();
      if (cheer > 0.3 && n % 3 === 0) { ctx.strokeStyle = sk; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 6, by + 8); ctx.lineTo(x - 11, by - 6 - jump); ctx.moveTo(x + 6, by + 8); ctx.lineTo(x + 11, by - 6 - jump); ctx.stroke(); }
    }
  };
  // a striped circus tent (bottom middle at x, y): shaded cone roof, scalloped valance, striped wall with its right
  // side in shade, an open doorway with tied-back flaps, a soft ground shadow and a waving pennant
  // a tent: its body is drawn once per size and colours into a picture (it never changes); the pennant waves live
  const tentPics = {};
  // copy a picture drawn at the screen's scale onto whole device pixels (a scaled copy is several times slower on a
  // CPU-drawn canvas); falls back to a plain scaled copy under a rotation
  K.blit = (pic, x, y, w, h) => {
    const m = ctx.getTransform();
    if (m.b || m.c || Math.abs(m.a * w - pic.width) > 2 || Math.abs(m.d * h - pic.height) > 2) { ctx.drawImage(pic, x, y, w, h); return; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(pic, Math.round(m.a * x + m.e), Math.round(m.d * y + m.f));
    ctx.restore();
  };
  const tentBody = (c, x, y, w, h, cols) => {
    const n = 6, ry = y - h * 0.45, top = y - h, wl = x - w / 2, sw = w / n;
    const dk = cols.map(k => mixCol(k, '#3a1c40', 0.2)), ink = shade(cols[0], 0.62);
    c.fillStyle = 'rgba(20,20,40,0.18)'; c.beginPath(); c.ellipse(x, y + 2, w * 0.58, 9, 0, 0, Math.PI * 2); c.fill();
    // wall stripes (right half in shade)
    for (let i = 0; i < n; i++) { c.fillStyle = (i >= n / 2 ? dk : cols)[i % 2]; c.fillRect(wl + i * sw, ry, sw + 0.5, y - ry); }
    c.fillStyle = 'rgba(20,20,40,0.16)'; c.fillRect(wl, ry, w, 10);
    // roof stripes fanning from the peak
    for (let i = 0; i < n; i++) {
      c.fillStyle = (i >= n / 2 ? dk : cols)[i % 2];
      c.beginPath(); c.moveTo(x, top); c.lineTo(wl + i * sw, ry); c.lineTo(wl + (i + 1) * sw + 0.5, ry); c.closePath(); c.fill();
    }
    // lit edge down the left of the roof
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 2, top + 3); c.lineTo(wl + 3, ry - 1); c.stroke();
    // scalloped valance under the roof edge
    for (let i = 0; i < n * 2; i++) {
      const sx = wl + (i + 0.5) * sw / 2;
      c.fillStyle = ((i >> 1) >= n / 2 ? dk : cols)[(i >> 1) % 2];
      c.beginPath(); c.arc(sx, ry, sw / 4, 0, Math.PI); c.fill();
    }
    c.fillStyle = C.gold; c.fillRect(wl, ry - 2, w, 3);
    // the doorway, flaps tied back
    const dw = w * 0.11, dh = h * 0.32;
    c.fillStyle = '#2a1424'; c.beginPath(); c.moveTo(x - dw, y); c.lineTo(x, y - dh); c.lineTo(x + dw, y); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,214,140,0.22)'; c.beginPath(); c.moveTo(x - dw * 0.6, y); c.lineTo(x, y - dh * 0.75); c.lineTo(x + dw * 0.6, y); c.closePath(); c.fill();
    c.fillStyle = dk[1]; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(x, y - dh); c.quadraticCurveTo(x + sd * dw * 0.4, y - dh * 0.4, x + sd * dw * 1.25, y); c.lineTo(x + sd * dw * 1.45, y); c.lineTo(x + sd * dw * 0.15, y - dh); c.closePath(); c.fill(); }
    // outline
    c.strokeStyle = ink; c.lineWidth = 1.8; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x, top); c.lineTo(wl, ry); c.lineTo(wl, y); c.lineTo(wl + w, y); c.lineTo(wl + w, ry); c.closePath(); c.stroke();
    // pole
    c.strokeStyle = '#7a3a2a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, top); c.lineTo(x, top - 20); c.stroke();
    c.fillStyle = '#ffd36b'; circleOn(c, x, top - 21, 2.5); c.fill();
  };
  K.tent = (x, y, w, h, cols) => {
    cols = cols || STRIPE;
    const top = y - h, sc = Math.max(1, Math.min(3, canvas.width / W)), key = [w, h, cols.join(), sc].join('|');
    // the picture spans the shadow's width and from 26 px above the peak to 12 px under the base
    const pw = Math.ceil(w * 1.2) + 4, ph = h + 38;
    let pic = tentPics[key];
    if (!pic) {
      pic = document.createElement('canvas'); pic.width = Math.ceil(pw * sc); pic.height = Math.ceil(ph * sc);
      const c = pic.getContext('2d'); c.scale(sc, sc); tentBody(c, pw / 2, h + 26, w, h, cols); tentPics[key] = pic;
    }
    K.blit(pic, x - pw / 2, top - 26, pw, ph);
    const wv = reduceMotion ? 0 : Math.sin(G.clock * 6 + x * 0.05) * 3;
    ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.moveTo(x, top - 19); ctx.quadraticCurveTo(x + 8, top - 18 + wv, x + 16, top - 14 + wv); ctx.quadraticCurveTo(x + 8, top - 11 - wv, x, top - 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c98a1a'; ctx.lineWidth = 1; ctx.stroke();
  };
  const BUNT = ['#ff5f6d', '#ffc53d', '#5b95ff', '#8fe3b0', '#ff9fd0']; let BUNT_SH = null;
  K.bunting = (x0, y0, x1, y1, sag, n) => {
    ctx.strokeStyle = 'rgba(60,40,50,0.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
    const cols = BUNT, sh = BUNT_SH || (BUNT_SH = BUNT.map(c => [shade(c, 0.22), shade(c, 0.5)]));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = K.lerp(x0, x1, u), y = K.lerp(y0, y1, u) + sag * 4 * u * (1 - u);
      const sw = reduceMotion ? 0 : Math.sin(G.clock * 2.4 + i * 0.9) * 1.8, c = cols[i % cols.length], cs = sh[i % cols.length];
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.lineTo(x + sw, y + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cs[0]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7, y); ctx.lineTo(x + sw, y + 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = cs[1]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + sw, y + 14); ctx.lineTo(x + 7, y); ctx.stroke();
    }
  };
  /* ---------- rich props and ground (Nov 2026 "richer props" pass) ----------
     Still art is painted once into a picture at the screen's scale (K.pic, keyed) and copied onto whole pixels.
     Ground strips repeat every `w` px (everything on them is placed with hash() and wrapped round the tile's ends),
     so a scrolling road is a couple of picture copies a frame (K.strip). */
  const pics = {};
  K.scale = () => Math.max(1, Math.min(3, canvas.width / W));
  K.pic = (key, w, h, paint) => {
    const sc = K.scale(), k = key + '|' + sc;
    let p = pics[k];
    if (!p) { p = document.createElement('canvas'); p.width = Math.ceil(w * sc); p.height = Math.ceil(h * sc); const c = p.getContext('2d'); c.scale(sc, sc); paint(c, w, h); pics[k] = p; }
    return p;
  };
  // copy a repeating strip (picture `pic` painted w x h) scrolled by `off` world px, its top at y, over x0..x1
  K.strip = (pic, w, h, off, y, x0 = 0, x1 = W) => {
    const m = ctx.getTransform(), o = ((off % w) + w) % w;
    if (m.b || m.c) { for (let x = x0 - o; x < x1; x += w) ctx.drawImage(pic, x, y, w, h); return; }
    const pw = m.a * w, end = m.a * x1 + m.e, dy = Math.round(m.d * y + m.f);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let dx = m.a * (x0 - o) + m.e; dx < end; dx += pw) ctx.drawImage(pic, Math.round(dx), dy, Math.round(dx + pw) - Math.round(dx), pic.height);
    ctx.restore();
  };
  // draw fn(x) at x and again one tile over when it pokes past either end (so a tile repeats with no seam)
  const wrapX = (w, x, r, fn) => { fn(x); if (x - r < 0) fn(x + w); if (x + r > w) fn(x - w); };
  K.wrapX = wrapX;
  const hx = c => { const m = /^#([0-9a-f]{6})$/i.exec(c); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  // mix two '#rrggbb' colours into '#rrggbb' (so the result can be shaded again)
  K.mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  K.dk = (c, t) => K.mix(c, '#2a1424', t);
  K.lt = (c, t) => K.mix(c, '#ffffff', t);
  // a little shaded pebble: soft shadow, body, darker lower-right, lit top-left, outline in its own dark shade
  K.pebble = (c, x, y, r, col, sq = 0.72) => {
    c.fillStyle = 'rgba(40,20,20,0.22)'; c.beginPath(); c.ellipse(x + r * 0.35, y + r * 0.55, r * 1.05, r * sq * 0.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r, r * sq, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = K.dk(col, 0.25); c.beginPath(); c.ellipse(x, y, r, r * sq, 0, -0.2, Math.PI * 0.85); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * sq * 0.4, r * 0.38, r * sq * 0.26, -0.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = K.dk(col, 0.5); c.lineWidth = 0.8; c.beginPath(); c.ellipse(x, y, r, r * sq, 0, 0, Math.PI * 2); c.stroke();
  };
  // a popped kernel of popcorn trodden into the dirt
  K.kernel = (c, x, y, s = 1) => {
    c.fillStyle = 'rgba(60,30,20,0.18)'; c.beginPath(); c.ellipse(x + 1, y + 2.2 * s, 3.4 * s, 1.3 * s, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff6dc'; for (const [dx, dy, r] of [[-1.4, 0, 1.9], [1.3, -0.4, 1.7], [0, -1.6, 1.6], [0.2, 0.9, 1.5]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#e8c060'; c.beginPath(); c.arc(x + 0.6 * s, y + 0.8 * s, 0.9 * s, 0, Math.PI * 2); c.fill();
  };
  // packed sawdust-and-dirt ground for a w-wide tile from y0 to y1: soft raked bands, wheel ruts, pebbles, sawdust
  // flecks, straw, popcorn, the odd dropped ticket and footprints (all fixed with hash, seeded by `seed`)
  K.dirtTile = (c, w, y0, y1, o) => {
    const base = o.base, seed = o.seed || 1, h = y1 - y0;
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, K.lt(base, 0.08)); g.addColorStop(0.4, base); g.addColorStop(1, K.dk(base, 0.14));
    c.fillStyle = g; c.fillRect(0, y0, w, h);
    // soft patches of darker packed earth and paler loose sawdust
    for (let i = 0; i < Math.round(w * h / 2600); i++) {
      const hh = hash(i + seed * 97, 41), x = hh % w, y = y0 + 6 + (hh >>> 9) % Math.max(1, h - 10), rx = 14 + (hh >>> 4) % 26;
      c.fillStyle = hh % 3 ? 'rgba(90,50,20,0.07)' : 'rgba(255,248,220,0.13)';
      wrapX(w, x, rx, xx => { c.beginPath(); c.ellipse(xx, y, rx, 3 + (hh >>> 13) % 5, 0, 0, Math.PI * 2); c.fill(); });
    }
    // wheel ruts / rake lines: long wavy grooves with a lit lower lip
    for (const ry of (o.ruts || [])) {
      for (const [col, dy] of [['rgba(80,44,20,0.20)', 0], ['rgba(255,250,225,0.28)', 1.6]]) {
        c.strokeStyle = col; c.lineWidth = dy ? 1 : 2.2; c.beginPath();
        for (let x = 0; x <= w; x += 8) { const yy = y0 + ry + dy + Math.sin(x / w * Math.PI * 4 + ry) * 1.2; x ? c.lineTo(x, yy) : c.moveTo(x, yy); }
        c.stroke();
      }
    }
    // sawdust flecks (tiny pale and dark dashes)
    for (let i = 0; i < Math.round(w * h / 90); i++) {
      const hh = hash(i + seed * 131, 43), x = hh % w, y = y0 + 2 + (hh >>> 9) % Math.max(1, h - 4), a = ((hh >>> 3) % 314) / 100;
      c.strokeStyle = hh % 3 === 0 ? 'rgba(255,246,214,0.55)' : hh % 3 === 1 ? 'rgba(110,64,28,0.35)' : 'rgba(200,150,80,0.6)';
      c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 2.4, y + Math.sin(a) * 1.2); c.stroke();
    }
    // straw bits
    for (let i = 0; i < Math.round(w * h / 1600); i++) {
      const hh = hash(i + seed * 17, 47), x = hh % w, y = y0 + 4 + (hh >>> 9) % Math.max(1, h - 8), a = ((hh >>> 3) % 100) / 100 - 0.5, L = 5 + hh % 6;
      wrapX(w, x, L, xx => { c.strokeStyle = '#c8962e'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(xx, y); c.lineTo(xx + Math.cos(a) * L, y + Math.sin(a) * L * 0.4); c.stroke(); c.strokeStyle = '#f2d27a'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(xx, y - 0.4); c.lineTo(xx + Math.cos(a) * L, y - 0.4 + Math.sin(a) * L * 0.4); c.stroke(); });
    }
    // footprints (little paired ovals) along a trodden line
    if (o.steps) for (let i = 0; i < Math.round(w / 70); i++) {
      const hh = hash(i + seed * 7, 53), x = (i * 70 + hh % 20) % w, y = y0 + o.steps + (i % 2) * 7;
      wrapX(w, x, 6, xx => { c.fillStyle = 'rgba(90,50,24,0.16)'; c.beginPath(); c.ellipse(xx, y, 4.6, 2.2, 0.15, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(xx + 6.5, y + 0.4, 2.2, 1.9, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,250,230,0.18)'; c.fillRect(xx - 4, y + 2, 8, 0.8); });
    }
    // pebbles in a few sizes and colours
    const pc = o.pebbles || [K.dk(base, 0.3), K.mix(base, '#a8a0a0', 0.55), K.mix(base, '#c8b8a8', 0.5), K.dk(base, 0.45)];
    for (let i = 0; i < Math.round(w * h / (o.pebbleEvery || 900)); i++) {
      const hh = hash(i + seed * 59, 61), x = hh % w, y = y0 + 6 + (hh >>> 9) % Math.max(1, h - 10), r = 1.6 + (hh >>> 5) % 3 * 0.9 + (hh % 11 === 0 ? 2 : 0);
      wrapX(w, x, r + 2, xx => K.pebble(c, xx, y, r, pc[hh % pc.length]));
    }
    // popcorn and a dropped ticket now and then
    if (o.popcorn !== false) for (let i = 0; i < Math.round(w * h / (o.popEvery || 3200)); i++) {
      const hh = hash(i + seed * 23, 67), x = hh % w, y = y0 + 6 + (hh >>> 9) % Math.max(1, h - 10);
      wrapX(w, x, 5, xx => K.kernel(c, xx, y, 0.9 + (hh % 3) * 0.15));
    }
    if (o.tickets) for (let i = 0; i < Math.round(w / 260); i++) {
      const hh = hash(i + seed * 29, 71), x = hh % w, y = y0 + 10 + (hh >>> 9) % Math.max(1, h - 20), a = ((hh >>> 4) % 100) / 100 - 0.5, tc = ['#ff6b8a', '#ffc53d', '#5bb8ff'][hh % 3];
      wrapX(w, x, 10, xx => { c.save(); c.translate(xx, y); c.rotate(a); c.fillStyle = 'rgba(60,30,20,0.18)'; c.fillRect(-6, -2, 13, 7); c.fillStyle = tc; c.fillRect(-7, -4, 13, 7); c.fillStyle = K.dk(tc, 0.3); c.fillRect(2, -4, 0.8, 7); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(-5, -2, 5, 1); c.fillRect(-5, 0, 4, 1); c.restore(); });
    }
  };
  // a row of painted wooden kerb boards (w-wide tile, top at y, h tall): each board its own shade, grain, a lit top,
  // a darker underside, nail heads and an outline
  K.kerbTile = (c, w, y, h, col, seed = 3, bw = 60) => {
    const cols = Array.isArray(col) ? col : [col];
    for (let x = 0; x < w; x += bw) {
      const hh = hash(x + seed, 77), bc = K.mix(cols[Math.round(x / bw) % cols.length], hh % 2 ? '#ffffff' : '#2a1424', (hh % 5) * 0.025);
      c.fillStyle = bc; c.fillRect(x, y, bw, h);
      c.fillStyle = K.dk(bc, 0.22); c.fillRect(x, y + h * 0.62, bw, h * 0.38);
      c.strokeStyle = K.dk(bc, 0.3); c.lineWidth = 0.7;
      for (let k = 0; k < 2; k++) { const gy = y + 2 + k * (h * 0.3) + (hh >>> (k + 3)) % 2; c.beginPath(); c.moveTo(x + 4, gy); c.bezierCurveTo(x + bw * 0.3, gy + 1, x + bw * 0.6, gy - 1, x + bw - 4, gy + 0.5); c.stroke(); }
      if (hh % 3 === 0) { const kx = x + 14 + hh % (bw - 28); c.fillStyle = K.dk(bc, 0.35); c.beginPath(); c.ellipse(kx, y + h * 0.45, 2.6, 1.3, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.32)'; c.fillRect(x, y, bw, 1.3);
      for (const nx of [x + 5, x + bw - 5]) { c.fillStyle = '#5a4a4a'; c.beginPath(); c.arc(nx, y + h * 0.4, 1.3, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(nx - 0.8, y + h * 0.4 - 1, 0.8, 0.8); }
      c.strokeStyle = K.dk(bc, 0.5); c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, bw - 1, h - 1);
    }
  };
  // a grassy verge tile: layered blade clumps in three greens, clover, little flowers on stems, a lit lip
  K.vergeTile = (c, w, y0, h, col, seed = 5) => {
    const g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, K.lt(col, 0.12)); g.addColorStop(1, K.dk(col, 0.18));
    c.fillStyle = g; c.fillRect(0, y0, w, h);
    c.fillStyle = K.lt(col, 0.35); c.fillRect(0, y0, w, 2);
    for (let i = 0; i < Math.round(w / 9); i++) {
      const hh = hash(i + seed * 13, 81), x = hh % w, y = y0 + 6 + (hh >>> 9) % Math.max(1, h - 6), n = 3 + hh % 3;
      wrapX(w, x, 8, xx => {
        for (let k = 0; k < n; k++) {
          const bx = xx + (k - n / 2) * 2.2, L = 5 + ((hh >>> (k + 2)) % 6), lean = ((hh >>> (k + 5)) % 5 - 2) * 0.9;
          c.strokeStyle = k % 3 === 0 ? K.dk(col, 0.28) : k % 3 === 1 ? K.dk(col, 0.12) : K.lt(col, 0.2); c.lineWidth = 1.4; c.lineCap = 'round';
          c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx + lean * 0.3, y - L * 0.6, bx + lean, y - L); c.stroke();
        }
      });
    }
    for (let i = 0; i < Math.round(w / 60); i++) {
      const hh = hash(i + seed * 31, 83), x = hh % w, y = y0 + 8 + (hh >>> 9) % Math.max(1, h - 10);
      wrapX(w, x, 8, xx => {
        if (hh % 3 === 0) { c.fillStyle = K.dk(col, 0.22); for (const a of [0, 2.1, 4.2]) { c.beginPath(); c.arc(xx + Math.cos(a) * 2, y + Math.sin(a) * 1.4, 1.8, 0, Math.PI * 2); c.fill(); } return; }
        const fc = ['#ffffff', '#ffd36b', '#ff9fb5', '#9fd0ff'][hh % 4];
        c.strokeStyle = K.dk(col, 0.3); c.lineWidth = 1; c.beginPath(); c.moveTo(xx, y + 3); c.lineTo(xx + 0.5, y - 5); c.stroke();
        c.fillStyle = fc; for (let p = 0; p < 5; p++) { const a = p * 1.256; c.beginPath(); c.arc(xx + 0.5 + Math.cos(a) * 1.8, y - 6 + Math.sin(a) * 1.8, 1.4, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#e8a020'; c.beginPath(); c.arc(xx + 0.5, y - 6, 1, 0, Math.PI * 2); c.fill();
      });
    }
  };
  // a wooden post or pole (x, top y, width, height) with rounded shading, grain, a lit left edge and an outline
  K.post = (x, y, w, h, col = '#c9a27a') => {
    ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = K.dk(col, 0.25); ctx.fillRect(x + w * 0.62, y, w * 0.38, h);
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fillRect(x + w * 0.15, y, Math.max(1, w * 0.18), h);
    ctx.strokeStyle = K.dk(col, 0.32); ctx.lineWidth = 0.8; ctx.beginPath();
    for (let k = 0; k < Math.floor(h / 26); k++) { const gy = y + 8 + k * 26 + hash(x | 0, k) % 9; ctx.moveTo(x + w * 0.35, gy); ctx.lineTo(x + w * 0.35, gy + 9); }
    ctx.stroke();
    ctx.strokeStyle = K.dk(col, 0.55); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };
  return K;
})();
