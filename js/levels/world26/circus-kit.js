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
  K.bigTop = (t, o = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1838'); g.addColorStop(0.45, '#5a2440'); g.addColorStop(1, '#7a3040');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // canvas stripes fanning up to the king pole
    for (let i = -8; i <= 8; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(232,68,58,0.42)' : 'rgba(255,244,230,0.13)';
      ctx.beginPath(); ctx.moveTo(W / 2 + i * 14, -10); ctx.lineTo(W / 2 + i * 150 - 60, H * 0.7); ctx.lineTo(W / 2 + i * 150 + 90, H * 0.7); ctx.lineTo(W / 2 + i * 14 + 14, -10); ctx.closePath(); ctx.fill();
    }
    // seams between the canvas panels
    ctx.strokeStyle = 'rgba(40,10,30,0.28)'; ctx.lineWidth = 1.5;
    for (let i = -8; i <= 9; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 14, -10); ctx.lineTo(W / 2 + i * 150 - 60, H * 0.7); ctx.stroke(); }
    // the king pole far behind, and the tiers of seats fading into the dark at the back of the tent
    ctx.fillStyle = 'rgba(30,14,30,0.35)'; ctx.fillRect(W / 2 - 7, 0, 14, H * 0.7);
    ctx.fillStyle = 'rgba(255,230,200,0.08)'; ctx.fillRect(W / 2 - 7, 0, 4, H * 0.7);
    const sy = H * 0.68;
    ctx.fillStyle = '#3a1830'; ctx.fillRect(0, sy, W, H - sy);
    for (let r = 0; r < 5; r++) {
      const ry = sy + 6 + r * 22;
      ctx.fillStyle = r % 2 ? '#4a2038' : '#45203a'; ctx.fillRect(0, ry + 12, W, 10);
      ctx.fillStyle = 'rgba(255,220,180,0.07)'; ctx.fillRect(0, ry + 12, W, 1.5);
      for (let x = (r % 2) * 9; x < W; x += 18) {
        const hh = hash(x, r * 31);
        if (hh % 5 === 0) continue;
        const bob = o.cheer ? Math.max(0, Math.sin(t * 10 + hh)) * 3 * o.cheer : 0;
        ctx.fillStyle = ['#5a2a48', '#4e2a50', '#6a3040', '#583050'][hh % 4];
        ctx.beginPath(); ctx.arc(x, ry + 12 - bob, 6.5, Math.PI, 0); ctx.fill();
        ctx.fillStyle = ['#7a4a50', '#6a4048', '#8a5a58'][hh % 3]; circle(x, ry + 3 - bob, 4.2); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(20,8,20,0.25)'; ctx.fillRect(0, sy, W, 5);
    // the scalloped valance round the top of the tent, with a gold trim
    ctx.fillStyle = '#9a2a30'; ctx.fillRect(0, 0, W, 16);
    for (let x = 0; x < W + 30; x += 30) {
      ctx.fillStyle = (x / 30) % 2 ? '#c8383a' : '#f0e2d0'; ctx.beginPath(); ctx.arc(x + 15, 16, 15, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(20,10,30,0.18)'; ctx.beginPath(); ctx.arc(x + 15, 16, 15, 0, Math.PI * 0.5); ctx.lineTo(x + 15, 16); ctx.fill();
    }
    ctx.fillStyle = C.gold; ctx.fillRect(0, 14, W, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 14, W, 1);
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
  K.tent = (x, y, w, h, cols) => {
    cols = cols || STRIPE;
    const n = 6, ry = y - h * 0.45, top = y - h, wl = x - w / 2, sw = w / n;
    const dk = cols.map(c => mixCol(c, '#3a1c40', 0.2)), ink = shade(cols[0], 0.62);
    ctx.fillStyle = 'rgba(20,20,40,0.18)'; ctx.beginPath(); ctx.ellipse(x, y + 2, w * 0.58, 9, 0, 0, Math.PI * 2); ctx.fill();
    // wall stripes (right half in shade)
    for (let i = 0; i < n; i++) { ctx.fillStyle = (i >= n / 2 ? dk : cols)[i % 2]; ctx.fillRect(wl + i * sw, ry, sw + 0.5, y - ry); }
    ctx.fillStyle = 'rgba(20,20,40,0.16)'; ctx.fillRect(wl, ry, w, 10);
    // roof stripes fanning from the peak
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = (i >= n / 2 ? dk : cols)[i % 2];
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(wl + i * sw, ry); ctx.lineTo(wl + (i + 1) * sw + 0.5, ry); ctx.closePath(); ctx.fill();
    }
    // lit edge down the left of the roof
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 2, top + 3); ctx.lineTo(wl + 3, ry - 1); ctx.stroke();
    // scalloped valance under the roof edge
    for (let i = 0; i < n * 2; i++) {
      const sx = wl + (i + 0.5) * sw / 2;
      ctx.fillStyle = ((i >> 1) >= n / 2 ? dk : cols)[(i >> 1) % 2];
      ctx.beginPath(); ctx.arc(sx, ry, sw / 4, 0, Math.PI); ctx.fill();
    }
    ctx.fillStyle = C.gold; ctx.fillRect(wl, ry - 2, w, 3);
    // the doorway, flaps tied back
    const dw = w * 0.11, dh = h * 0.32;
    ctx.fillStyle = '#2a1424'; ctx.beginPath(); ctx.moveTo(x - dw, y); ctx.lineTo(x, y - dh); ctx.lineTo(x + dw, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,140,0.22)'; ctx.beginPath(); ctx.moveTo(x - dw * 0.6, y); ctx.lineTo(x, y - dh * 0.75); ctx.lineTo(x + dw * 0.6, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dk[1]; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y - dh); ctx.quadraticCurveTo(x + sd * dw * 0.4, y - dh * 0.4, x + sd * dw * 1.25, y); ctx.lineTo(x + sd * dw * 1.45, y); ctx.lineTo(x + sd * dw * 0.15, y - dh); ctx.closePath(); ctx.fill(); }
    // outline
    ctx.strokeStyle = ink; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(wl, ry); ctx.lineTo(wl, y); ctx.lineTo(wl + w, y); ctx.lineTo(wl + w, ry); ctx.closePath(); ctx.stroke();
    // pole and pennant
    ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - 20); ctx.stroke();
    ctx.fillStyle = '#ffd36b'; circle(x, top - 21, 2.5); ctx.fill();
    const wv = reduceMotion ? 0 : Math.sin(G.clock * 6 + x * 0.05) * 3;
    ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.moveTo(x, top - 19); ctx.quadraticCurveTo(x + 8, top - 18 + wv, x + 16, top - 14 + wv); ctx.quadraticCurveTo(x + 8, top - 11 - wv, x, top - 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c98a1a'; ctx.lineWidth = 1; ctx.stroke();
  };
  // a string of triangle flags between two points, sagging (the flags sway a little and have a shaded half)
  K.bunting = (x0, y0, x1, y1, sag, n) => {
    ctx.strokeStyle = 'rgba(60,40,50,0.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
    const cols = ['#ff5f6d', '#ffc53d', '#5b95ff', '#8fe3b0', '#ff9fd0'];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = K.lerp(x0, x1, u), y = K.lerp(y0, y1, u) + sag * 4 * u * (1 - u);
      const sw = reduceMotion ? 0 : Math.sin(G.clock * 2.4 + i * 0.9) * 1.8, c = cols[i % cols.length];
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.lineTo(x + sw, y + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(c, 0.22); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7, y); ctx.lineTo(x + sw, y + 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(c, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + sw, y + 14); ctx.lineTo(x + 7, y); ctx.stroke();
    }
  };
  return K;
})();
