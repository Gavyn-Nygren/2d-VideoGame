/* Pip & Bo - World 31 Shrunk in the Backyard: shared helpers for the four bug-sized levels (loads before them). */
'use strict';

/* The only global here is SHRUNK. Pip and Bo have been shrunk to the size of a beetle: a blade of grass is a tree, a
   pebble is a boulder, an ant is as big as a pony and a robin is a monster. The four World 31 levels use this kit for
   the same little jobs, so they look and feel like one world. It is World 29's NINJA kit (same names, same arguments,
   so the World 29 level files are a working example) with daylight garden scenery instead of the night town.
   World 6 Backyard Bash is the backyard at normal size; this world is the same kind of place seen from the grass roots.
   Nothing here touches the rules of a level and nothing keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = SHRUNK; ... SHRUNK.defs.<mode> = {...}; })();

   THE MANUAL. "st" is always the level's G.mst. Unless it says "screen px", x / y are in whatever space the canvas is in
   when you call (so call props inside your camera transform; the parallax painters want NO transform).

   Registering
     SHRUNK.defs                     {} : each level file ends with SHRUNK.defs.<mode> = { name, world: 30, ... }.
     K.stubMap()                     the 18-row spawn-only map every World 31 def uses (map: K.stubMap()).
   Small maths: K.FONT(n), K.lerp(a, b, u), K.smooth(u), K.hash(n) (a steady 0..1 from n; never Math.random in draw),
     K.mmss(sec) "2:07".
   Players and keys (exactly as NINJA): K.quiet(id), K.key(id, what), K.track(st), K.both(st, win), K.idle(st, dt, wait),
     K.actLabels(words, both), K.hide(st) / K.unhide(st), K.place(id, sx, sy).
   Effects (K.fx(st) in setup; K.tickFx(st, dt) every tick): K.pop, K.part (kinds 'dot' 'star' 'conf' 'note' 'smoke'
     'dust' 'leaf'), K.spark, K.confetti, K.dust, K.poof, K.drawParts(st, camX), K.drawPops(st, camX, camY), K.star.
   Messages and prompts: K.msg, K.BREAK, K.goldHelp(st, text, life) (THE gold-help banner: plays shrunkHelp and counts
     st.stats.helps), K.drawMsg, K.hint, K.hintOnce, K.prompter(st) then P.say(id, str, x, y, col, pulse).
   HUD: K.chip, K.panel, K.meter, K.medal(gold, silver) (old; kits of later worlds copy it), K.helpLine(n).
   Pip and Bo: K.hero(id, x, y, o) the plain engine look, feet at x, y (o: face, rot, s, sy, sx, vy, stun).
   Garden scenery (bug's-eye view, daytime)
     K.sky(camX, t, o)               full screen, no transform: blue sky, a big soft sun, drifting clouds and the far-off
                                     giant fence and house. o: sunX = 780, sunY = 90, dim 0..1 (shade), noFence.
     K.farGrass(camX, o)             no transform: a wall of huge blurry grass blades and flower stalks far behind.
                                     o: y = 460 (where their roots are), par = 0.3, n (blades per 1000 px) = 26, flowers = true.
     K.blade(x, y, h, lean, o)       one giant grass blade, root at x, y. o: w = 16, col, dark, t (sway clock), seed.
     K.soil(x0, x1, y, o)            a ground strip with its top at y: dark soil, grass roots, little stones.
                                     o: bottom = H + 10, grass = true (a fringe of short blades on top), col.
     K.pebble(x, y, w, h, o)         a big rounded stone, bottom middle at x, y. o: col, seed.
     K.twig(x, y, w, h)              a fallen stick lying on the ground, bottom left at x, y, w long, h thick.
     K.clover(x, y, s, t)            a clover plant, root at x, y (s scale).
     K.dandelion(x, y, h, t, o)      a dandelion on its stalk; o.puff for the white seed ball.
     K.daisy(x, y, h, t, o)          a daisy on its stalk. o: col (petals), mid.
     K.mushroom(x, y, s, o)          a toadstool, root at x, y. o: col.
     K.leaf(x, y, w, rot, o)         a fallen leaf lying flat, middle at x, y. o: col, curl.
     K.dew(x, y, r, t)               a sparkling dewdrop (the usual collectable).
     K.seed(x, y, r, rot)            a sunflower seed.
   Sounds (Sfx.play('shrunkPop')): shrunkPop (a collectable), shrunkHelp (played by K.goldHelp), shrunkCheer, shrunkBoing,
     shrunkThud, shrunkWhoosh, shrunkSquee (a scare), shrunkChirp (a small bird call). Levels add their own as
     Sfx.extra.<mode>Name.
   Colours: K.COL = { soil, soilDark, soilHi, grass, grassDark, grassHi, stone, stoneDark, stoneHi, bark, barkDark, dew,
     petal, sun }. Gold (C.gold) is kept for help and "press now". */
const SHRUNK = (() => {
  const K = { defs: {} };
  const FONT = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const TAU = Math.PI * 2;
  K.FONT = FONT;
  K.lerp = (a, b, u) => a + (b - a) * u;
  K.smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  K.hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  K.mmss = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  K.stubMap = () => [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)];
  K.BREAK = 'Taking a break... press anything to go on';
  const COL = K.COL = {
    soil: '#6b4a32', soilDark: '#4a3122', soilHi: '#8a6446', grass: '#5fb84a', grassDark: '#3c8a36', grassHi: '#9be07a',
    stone: '#9a968c', stoneDark: '#6c695f', stoneHi: '#c8c4b8', bark: '#8a6040', barkDark: '#5a3c26', dew: '#bfeaff',
    petal: '#ffffff', sun: '#ffe680',
  };

  /* ---------- players and keys ---------- */
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
  // the engine bodies stay hidden while a level draws Pip and Bo itself; their x / y follow for name tags and bubbles
  K.hide = st => { st.hid = G.players.map(p => p.alive); for (const p of G.players) p.alive = false; };
  K.unhide = st => { if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; } };
  K.place = (id, sx, sy) => { const p = G.players[id]; p.x = sx - PW / 2; p.y = sy - PH; p.alive = true; p.grounded = true; p.vy = 0; p.stun = 0; };

  /* ---------- effects ---------- */
  K.fx = st => { st.parts = []; st.pops = []; st.hints = [null, null]; st.msg = null; st.hinted = {}; };
  K.pop = (st, x, y, s, col, size) => { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); };
  K.part = (st, x, y, vx, vy, life, col, size, grav, kind) => {
    if (st.parts.length > 300) st.parts.shift();
    st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
  };
  K.spark = (st, x, y, n, cols) => {
    cols = cols || [C.gold, '#ffffff'];
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 60 + Math.random() * 140; K.part(st, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.6, cols[i % cols.length], 3 + Math.random() * 2, 0, 'star'); }
  };
  K.confetti = (st, x, y, n) => {
    const cols = ['#ffd36b', '#ffffff', '#ff9fb5', '#9fe8ff', '#8fe3b0', '#ff8a5a'];
    for (let i = 0; i < n; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()), sp = 140 + Math.random() * 220; K.part(st, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 1.6, cols[i % cols.length], 4, 260, 'conf'); }
  };
  K.dust = (st, x, y, col, n = 6) => { for (let i = 0; i < n; i++) K.part(st, x + (Math.random() - 0.5) * 24, y, (Math.random() - 0.5) * 90, -30 - Math.random() * 50, 0.6, col || 'rgba(200,196,230,0.7)', 4, 60, 'dust'); };
  // a puff of dust or smoke
  K.poof = (st, x, y, n = 10) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 20 + Math.random() * 70; K.part(st, x + Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 20, 0.7 + Math.random() * 0.3, i % 3 ? 'rgba(214,208,240,0.85)' : 'rgba(255,255,255,0.9)', 7 + Math.random() * 5, -20, 'smoke'); } };
  K.hint = (st, id, text, life) => { if (K.quiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; };
  K.hintOnce = (st, name, id, text, life) => { if (st.hinted[name]) return; st.hinted[name] = true; K.hint(st, id, text, life); };
  K.msg = (st, text, col, life) => { st.msg = { text, col: col || '#ffffff', t: 0, life: life || 3.5 }; };
  // catch-up help is gold and announced, never hidden, and counted for the results card
  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('shrunkHelp');
  };
  // ages the pops, particles, hints and the message line
  K.tickFx = (st, dt) => {
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const q = st.parts[i];
      if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
      q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
      if (q.kind === 'dust' || q.kind === 'smoke' || q.kind === 'leaf') q.vx *= 1 - dt * 2;
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
      else if (q.kind === 'leaf') { ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * 1.6, q.size * 0.6, q.r, 0, TAU); ctx.fill(); }
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

  /* ---------- HUD ---------- */
  // a HUD chip: gold and blinking when it is the thing to press now, green while held
  K.chip = (x, y, w, h, str, lit, held, z) => {
    ctx.fillStyle = lit ? (Math.sin(G.clock * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(143,227,176,0.85)' : 'rgba(255,255,255,0.12)';
    rr(x, y, w, h, h / 2); ctx.fill();
    let fs = 12 * (z || 1);
    ctx.font = FONT(fs);
    while (fs > 8 && ctx.measureText(str).width > w - 8) { fs -= 0.5; ctx.font = FONT(fs); }
    text(str, x + w / 2, y + h / 2 + 0.5, fs, lit || held ? C.ink : '#ffffff', 'center', 'body');
  };
  // a player's panel at the bottom corner: name and job; returns the box (contents are the level's)
  K.panel = (id, job, w, h, z) => {
    z = z || 1;
    const pw = Math.round(w * z), ph = Math.round(h * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(20,22,52,0.86)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    text(NAMES[id] + ' · ' + job + (K.quiet(id) ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 13 * z, PCOL[id], 'left');
    return { x: px, y: py, w: pw, h: ph };
  };
  K.meter = (x, y, w, h, frac, col, mark) => {
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(x, y, w, h, h / 2); ctx.fill();
    const fw = Math.max(h, w * clamp(frac, 0, 1));
    if (frac > 0) { ctx.fillStyle = col || '#ffffff'; rr(x, y, fw, h, h / 2); ctx.fill(); }
    if (mark !== undefined) { ctx.fillStyle = C.gold; ctx.fillRect(x + w * clamp(mark, 0, 1) - 1.5, y - 3, 3, h + 6); }
  };
  K.medal = (gold, silver) => (gold ? 'Gold' : silver ? 'Silver' : 'Bronze');
  K.helpLine = n => (n ? 'Gold help: ' + n + (n === 1 ? ' time' : ' times') + '. Next time, try it without!' : '');
  // the message line (gold help, taking a break): top middle when it fits, else under the level pill
  K.drawMsg = (st, m, rightX = W - 14) => {
    if (!m) return;
    const big = hudBig();
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, str = m.gold ? '★ ' + m.text : m.text;
    ctx.font = FONT(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = rightX - 10;
    ctx.font = FONT(fs);
    let w = ctx.measureText(str).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = big ? 96 : 80;
      while (w > W - 40 && fs > 11) { fs--; ctx.font = FONT(fs); w = ctx.measureText(str).width + 30; }
    }
    ctx.globalAlpha = clamp((m.life - m.t) / 0.3, 0, 1);
    const px = pill(cx, y, w, h, 'center');
    if (m.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, y, w, h, h / 2); ctx.stroke(); }
    text(str, cx, y + h / 2 + 0.5, fs, m.col, 'center', 'body'); ctx.globalAlpha = 1;
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
        ctx.fillStyle = 'rgba(20,22,52,0.9)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
        text(str, 0, 0.5, fs, col, 'center', 'body');
        ctx.restore();
      },
    };
  };

  /* ---------- Pip and Bo ---------- */
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

  /* ---------- garden scenery ---------- */
  // the sky: full screen, no transform
  K.sky = (cx, t, o = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#6ec0f0'); g.addColorStop(0.65, '#bfe6f6'); g.addColorStop(1, '#e8f6dc');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sx = o.sunX === undefined ? 780 : o.sunX, sy = o.sunY === undefined ? 90 : o.sunY;
    ctx.fillStyle = 'rgba(255,240,170,0.35)'; circle(sx, sy, 82); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,190,0.6)'; circle(sx, sy, 58); ctx.fill();
    ctx.fillStyle = '#fff6c8'; circle(sx, sy, 40); ctx.fill();
    // clouds drift slowly and scroll a little with the camera
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 5; i++) {
      const span = W + 360, x = ((i * 271 - cx * 0.03 + t * (6 + i * 2)) % span + span) % span - 180, y = 50 + (i * 53) % 120, s = 0.8 + (i % 3) * 0.35;
      circle(x, y, 22 * s); ctx.fill(); circle(x + 26 * s, y - 10 * s, 28 * s); ctx.fill(); circle(x + 56 * s, y, 20 * s); ctx.fill(); ctx.fillRect(x, y, 56 * s, 18 * s);
    }
    if (!o.noFence) {
      // the giant wooden fence far away: solid boards, softened by the haze
      const fx = -((cx * 0.06) % 120);
      ctx.fillStyle = '#b89c78'; ctx.fillRect(0, 186, W, 18); ctx.fillRect(0, 254, W, 18);
      for (let x = fx - 120; x < W + 120; x += 120) {
        ctx.fillStyle = '#dcc6a2';
        ctx.beginPath(); ctx.moveTo(x + 6, 330); ctx.lineTo(x + 6, 150); ctx.lineTo(x + 60, 118); ctx.lineTo(x + 114, 150); ctx.lineTo(x + 114, 330); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c8ae88'; ctx.beginPath(); ctx.moveTo(x + 92, 330); ctx.lineTo(x + 92, 137); ctx.lineTo(x + 114, 150); ctx.lineTo(x + 114, 330); ctx.closePath(); ctx.fill();
        // wood grain and a knot
        ctx.strokeStyle = 'rgba(150,120,86,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 30, 150); ctx.lineTo(x + 30, 330); ctx.moveTo(x + 64, 140); ctx.lineTo(x + 64, 330); ctx.stroke();
        ctx.fillStyle = 'rgba(150,120,86,0.4)'; ctx.beginPath(); ctx.ellipse(x + 46, 214 + (Math.abs(Math.round(x / 120)) % 3) * 30, 5, 8, 0, 0, TAU); ctx.fill();
      }
      // haze in front of the fence, so it sits far back
      const hz = ctx.createLinearGradient(0, 120, 0, 340);
      hz.addColorStop(0, 'rgba(200,232,246,0.35)'); hz.addColorStop(1, 'rgba(214,238,226,0.75)');
      ctx.fillStyle = hz; ctx.fillRect(0, 110, W, 240);
    }
    if (o.dim) { ctx.fillStyle = 'rgba(20,40,30,' + clamp(o.dim, 0, 1) * 0.5 + ')'; ctx.fillRect(0, 0, W, H); }
  };
  // one giant grass blade, root at (x, y), leaning by `lean` px at the tip
  K.blade = (x, y, h, lean, o = {}) => {
    const w = o.w || 16, sway = o.t === undefined ? 0 : Math.sin(o.t * 1.3 + (o.seed || 0)) * h * 0.025;
    const tx = x + lean + sway, ty = y - h;
    ctx.fillStyle = o.col || COL.grass;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x - w / 2 + lean * 0.35, y - h * 0.55, tx, ty);
    ctx.quadraticCurveTo(x + w / 2 + lean * 0.35, y - h * 0.55, x + w / 2, y);
    ctx.closePath(); ctx.fill();
    if (o.dark !== false) {
      ctx.strokeStyle = o.dark || 'rgba(30,80,30,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.35, y - h * 0.55, tx, ty + 6); ctx.stroke();
    }
  };
  // a wall of huge blurry blades and flower stalks far behind: no transform
  K.farGrass = (cx, o = {}) => {
    const y = o.y === undefined ? 460 : o.y, par = o.par === undefined ? 0.3 : o.par, step = 1000 / (o.n || 26);
    const sx = cx * par, i0 = Math.floor(sx / step) - 2, i1 = Math.ceil((sx + W) / step) + 2;
    for (let i = i0; i <= i1; i++) {
      const x = i * step - sx + (K.hash(i) - 0.5) * step * 0.8, h = 260 + K.hash(i + 7) * 260, lean = (K.hash(i + 3) - 0.5) * 120;
      K.blade(x, y + 40, h, lean, { w: 30 + K.hash(i + 9) * 20, col: i % 3 ? '#9ccd88' : '#acd696', dark: false });
      if (o.flowers !== false && K.hash(i + 21) < 0.16) {
        const fx = x + lean * 0.6, fy = y + 40 - h * 0.92;
        ctx.strokeStyle = '#8cbf78'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.quadraticCurveTo(x + lean * 0.2, fy + 80, fx, fy); ctx.stroke();
        ctx.fillStyle = K.hash(i + 5) < 0.5 ? '#fbe68a' : '#f6faf0';
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 22, fy + Math.sin(a) * 22, 16, 8, a, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#f0b448'; circle(fx, fy, 13); ctx.fill();
      }
    }
  };
  // the ground strip: soil with roots and little stones, a fringe of short grass on top
  K.soil = (x0, x1, y, o = {}) => {
    const bottom = o.bottom === undefined ? H + 10 : o.bottom;
    ctx.fillStyle = o.col || COL.soil; ctx.fillRect(x0, y, x1 - x0, bottom - y);
    ctx.fillStyle = COL.soilDark; ctx.fillRect(x0, y + 26, x1 - x0, bottom - y - 26);
    const i0 = Math.floor(x0 / 46), i1 = Math.ceil(x1 / 46);
    for (let i = i0; i <= i1; i++) {
      const x = i * 46 + K.hash(i) * 30;
      ctx.fillStyle = K.hash(i + 2) < 0.5 ? COL.soilHi : '#7a5a40';
      ctx.beginPath(); ctx.ellipse(x, y + 14 + K.hash(i + 4) * 30, 5 + K.hash(i + 6) * 7, 3 + K.hash(i + 8) * 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(210,190,150,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 10, y + 2); ctx.quadraticCurveTo(x + 18, y + 30, x + 6, y + 52 + K.hash(i + 1) * 20); ctx.stroke();
    }
    if (o.grass !== false) {
      ctx.fillStyle = COL.grassDark; ctx.fillRect(x0, y - 3, x1 - x0, 6);
      const j0 = Math.floor(x0 / 9), j1 = Math.ceil(x1 / 9);
      ctx.fillStyle = COL.grass;
      ctx.beginPath();
      for (let j = j0; j <= j1; j++) { const x = j * 9, h = 8 + K.hash(j) * 12, l = (K.hash(j + 1) - 0.5) * 8; ctx.moveTo(x - 3, y + 2); ctx.lineTo(x + l, y - h); ctx.lineTo(x + 3, y + 2); }
      ctx.fill();
    }
  };
  // a big rounded stone, bottom middle at (x, y)
  K.pebble = (x, y, w, h, o = {}) => {
    const s = o.seed || 0;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.55, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = o.col || COL.stone;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.bezierCurveTo(x - w / 2 - 4, y - h * 0.7, x - w * 0.25, y - h - 2, x + (K.hash(s) - 0.5) * w * 0.2, y - h);
    ctx.bezierCurveTo(x + w * 0.3, y - h - 2, x + w / 2 + 4, y - h * 0.6, x + w / 2, y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = COL.stoneDark; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = COL.stoneHi; ctx.beginPath(); ctx.ellipse(x - w * 0.18, y - h * 0.72, w * 0.16, h * 0.1, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(80,76,68,0.35)';
    for (let k = 0; k < 3; k++) { circle(x + (K.hash(s + k) - 0.5) * w * 0.6, y - h * (0.2 + K.hash(s + k + 5) * 0.5), 2 + K.hash(s + k + 9) * 3); ctx.fill(); }
  };
  // a fallen stick, bottom left at (x, y)
  K.twig = (x, y, w, h) => {
    ctx.fillStyle = COL.bark; ctx.strokeStyle = COL.barkDark; ctx.lineWidth = 2;
    rr(x, y - h, w, h, h / 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,36,20,0.45)'; ctx.lineWidth = 1.5;
    for (let k = 1; k < 5; k++) { const lx = x + w * k / 5; ctx.beginPath(); ctx.moveTo(lx - 10, y - h * 0.65); ctx.lineTo(lx + 12, y - h * 0.6); ctx.stroke(); }
    ctx.fillStyle = '#c89a6a'; ctx.beginPath(); ctx.ellipse(x + w - 3, y - h / 2, 4, h / 2 - 2, 0, 0, TAU); ctx.fill();
  };
  K.clover = (x, y, s = 1, t = 0) => {
    ctx.strokeStyle = '#3c8a36'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 6 * s, y - 40 * s, x, y - 70 * s); ctx.stroke();
    const sw = Math.sin(t * 1.4 + x * 0.01) * 0.05;
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 1.6 + sw;
      ctx.fillStyle = k === 1 ? '#5fb84a' : '#4fa63e';
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 20 * s, y - 70 * s + Math.sin(a) * 14 * s, 22 * s, 13 * s, a, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x, y - 70 * s, 12 * s, 0.3, 2.6); ctx.stroke();
  };
  K.dandelion = (x, y, h, t = 0, o = {}) => {
    const sw = Math.sin(t * 1.2 + x * 0.013) * 6, fx = x + sw, fy = y - h;
    ctx.strokeStyle = '#4c9a40'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.3, y - h * 0.5, fx, fy); ctx.stroke();
    if (o.puff) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * 30, fy + Math.sin(a) * 30); }
      ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; circle(fx + Math.cos(a) * 30, fy + Math.sin(a) * 30, 3); ctx.fill(); }
      return;
    }
    ctx.fillStyle = '#f2b81c';
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 17, fy + Math.sin(a) * 17, 13, 5, a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffd83a'; circle(fx, fy, 15); ctx.fill();
  };
  K.daisy = (x, y, h, t = 0, o = {}) => {
    const sw = Math.sin(t * 1.1 + x * 0.017) * 5, fx = x + sw, fy = y - h;
    ctx.strokeStyle = '#4c9a40'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - sw * 0.2, y - h * 0.5, fx, fy); ctx.stroke();
    ctx.fillStyle = o.col || COL.petal;
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 18, fy + Math.sin(a) * 18, 15, 6, a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = o.mid || '#ffc83a'; circle(fx, fy, 10); ctx.fill();
  };
  K.mushroom = (x, y, s = 1, o = {}) => {
    ctx.fillStyle = '#f2e8d0'; rr(x - 9 * s, y - 40 * s, 18 * s, 40 * s, 6 * s); ctx.fill();
    ctx.fillStyle = o.col || '#e0473a';
    ctx.beginPath(); ctx.moveTo(x - 38 * s, y - 36 * s); ctx.quadraticCurveTo(x, y - 92 * s, x + 38 * s, y - 36 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const [dx, dy, r] of [[-18, -52, 6], [4, -66, 7], [20, -46, 5], [-4, -44, 4]]) { circle(x + dx * s, y + dy * s, r * s); ctx.fill(); }
  };
  K.leaf = (x, y, w, rot = 0, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = o.col || '#8fbf4a';
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(0, -w * (o.curl || 0.32), w / 2, 0); ctx.quadraticCurveTo(0, w * 0.18, -w / 2, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(40,80,20,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, -2); ctx.stroke();
    ctx.restore();
  };
  K.dew = (x, y, r = 8, t = 0) => {
    const b = 1 + Math.sin(t * 4 + x * 0.05) * 0.06;
    ctx.fillStyle = 'rgba(160,220,255,0.75)'; ctx.beginPath(); ctx.ellipse(x, y, r * b, r * 1.1 / b, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(x - r * 0.35, y - r * 0.4, r * 0.28); ctx.fill();
    if (Math.sin(t * 3 + x) > 0.85) { ctx.fillStyle = '#ffffff'; K.star(x + r * 0.6, y - r * 0.9, 4, 1.5, 0); ctx.fill(); }
  };
  K.seed = (x, y, r = 7, rot = 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#3a3430'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1.2; for (const d of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.moveTo(-r * 0.8, d * r); ctx.lineTo(r * 0.8, d * r); ctx.stroke(); }
    ctx.restore();
  };

  /* ---------- shared sounds ---------- */
  Sfx.extra.shrunkPop = function (p) { p = p || 1; this.tone(880 * p, 0.06, 'triangle', 0.035, 1320 * p); this.tone(1320 * p, 0.08, 'sine', 0.025, null, 0.04); };
  Sfx.extra.shrunkHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.shrunkCheer = function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.08)); };
  Sfx.extra.shrunkBoing = function () { this.tone(160, 0.28, 'sine', 0.06, 460); };
  Sfx.extra.shrunkThud = function () { this.tone(120, 0.12, 'sine', 0.07, 60); this.tone(260, 0.05, 'triangle', 0.02, 180, 0.01); };
  Sfx.extra.shrunkWhoosh = function (p) { p = p || 1; this.tone(300 * p, 0.16, 'sawtooth', 0.016, 900 * p); };
  Sfx.extra.shrunkSquee = function () { this.tone(900, 0.1, 'square', 0.03, 1500); this.tone(1500, 0.14, 'square', 0.03, 700, 0.1); };
  Sfx.extra.shrunkChirp = function () { [2200, 2800, 2400].forEach((f, i) => this.tone(f, 0.05, 'sine', 0.03, f * 1.2, i * 0.07)); };
  return K;
})();
