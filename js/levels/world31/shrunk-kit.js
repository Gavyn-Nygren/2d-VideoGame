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
     K.soil(x0, x1, y, o)            a ground strip with its top at y: layered soil, stones, roots, crumbs, burrows.
                                     o: bottom = H + 10, grass = true (a fringe of short blades on top), col.
     K.pebble(x, y, w, h, o)         a big rounded stone, bottom middle at x, y. o: col, seed.
     K.twig(x, y, w, h, o)           a fallen stick lying on the ground, bottom left at x, y, w long, h thick. o: seed.
     K.acornCap(x, y, w, h)          an acorn cap lying upside down, bottom left at x, y (a low hop-over).
     K.bottleCap(x, y, w, h, o)      a crown bottle cap, bottom left at x, y. o: col.
     K.stone(x, y, rx, ry, rot, col, seed)  a small irregular stone with a shadow, a lit top and an outline.
     K.picForget(prefix)             drops cached pictures whose key starts with prefix (a level's big chunks).
                                     (soil, pebble, twig and the caps are pictures: painted once per size / seed, copied)
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
  // K.pic(key, w, h, ox, oy, paint, x, y): a still part of the scenery drawn once into a picture and copied each frame
  // (art polish, Nov 2026: the extra detail drawn live cost up to 20 ms a frame on a slow phone). paint() draws with the
  // usual ctx and helpers (rr, circle, K.*) in the picture's own space, origin (ox, oy) from its top-left; the picture is
  // copied with that origin at (x, y). The key must change whenever what paint() draws would change.
  const PIC_SKIP = new Set(['constructor', 'canvas']), pics = new Map();
  let picScale = 0;
  let picPainting = false;
  K.pic = (key, w, h, ox, oy, paint, x, y, opaque) => {
    // inside another picture's paint, just draw it there
    if (picPainting) { ctx.save(); ctx.translate(x, y); paint(); ctx.restore(); return; }
    const sc = Math.max(1, Math.min(3, canvas.width / W));
    if (sc !== picScale) { pics.clear(); picScale = sc; }
    let sp = pics.get(key);
    if (sp) { pics.delete(key); pics.set(key, sp); } // the most recently used stay; the oldest go first
    else {
      if (pics.size >= 96) pics.delete(pics.keys().next().value);
      // the origin sits on a whole pixel, so a copy lands exactly on the screen's pixels; a picture with no see-through
      // parts (opaque) is copied without blending, which is several times quicker on a computer without a graphics chip
      const px = Math.ceil(ox * sc), py = Math.ceil(oy * sc);
      sp = document.createElement('canvas'); sp.width = Math.ceil(px + (w - ox) * sc); sp.height = Math.ceil(py + (h - oy) * sc);
      const c = sp.getContext('2d', { alpha: !opaque }); c.translate(px, py); c.scale(sc, sc);
      sp.px = px; sp.py = py;
      // while painting, every call and setting on the screen's ctx goes to the picture's context instead
      const proto = CanvasRenderingContext2D.prototype, own = [];
      for (const k of Object.getOwnPropertyNames(proto)) {
        if (PIC_SKIP.has(k)) continue;
        const d = Object.getOwnPropertyDescriptor(proto, k);
        if (typeof d.value === 'function') Object.defineProperty(ctx, k, { value: (...a) => c[k](...a), configurable: true, writable: true });
        else if (d.get) Object.defineProperty(ctx, k, { get: () => c[k], set: v => { c[k] = v; }, configurable: true });
        else continue;
        own.push(k);
      }
      picPainting = true;
      try { paint(); } finally { picPainting = false; for (const k of own) delete ctx[k]; }
      pics.set(key, sp);
    }
    const m = ctx.getTransform();
    if (m.b === 0 && m.c === 0 && Math.abs(m.a - sc) < 1e-6 && Math.abs(m.d - sc) < 1e-6) {
      const X = Math.round(m.a * x + m.e) - sp.px, Y = Math.round(m.d * y + m.f) - sp.py, sm = ctx.imageSmoothingEnabled;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sp, X, Y);
      ctx.setTransform(m); ctx.imageSmoothingEnabled = sm;
    } else ctx.drawImage(sp, x - sp.px / sc, y - sp.py / sc, sp.width / sc, sp.height / sc);
  };
  // forget the cached pictures whose key starts with prefix (big level chunks, when the level moves on to another room)
  K.picForget = prefix => { for (const k of [...pics.keys()]) if (k.startsWith(prefix)) pics.delete(k); };
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
    const sx = o.sunX === undefined ? 780 : o.sunX, sy = o.sunY === undefined ? 90 : o.sunY;
    // the gradient and the sun's glow never move on the screen: one solid picture (a full-screen gradient fill each
    // frame is one of the slowest things to draw on a phone)
    K.pic('shsky|' + sx + '|' + sy, W, H, 0, 0, () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#6ec0f0'); g.addColorStop(0.65, '#bfe6f6'); g.addColorStop(1, '#e8f6dc');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,240,170,0.35)'; circle(sx, sy, 82); ctx.fill();
      ctx.fillStyle = 'rgba(255,244,190,0.6)'; circle(sx, sy, 58); ctx.fill();
    }, 0, 0, true);
    // slow soft rays round the sun
    ctx.save(); ctx.translate(sx, sy); if (!reduceMotion) ctx.rotate(t * 0.04);
    ctx.fillStyle = 'rgba(255,244,190,0.28)';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = (i + 1) * Math.PI / 6, c = Math.cos(a), s2 = Math.sin(a), r2 = 100 + (i % 2) * 20; ctx.moveTo(-8 * c - 50 * s2, -8 * s2 + 50 * c); ctx.lineTo(8 * c - 50 * s2, 8 * s2 + 50 * c); ctx.lineTo(-r2 * s2, r2 * c); ctx.closePath(); }
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff6c8'; circle(sx, sy, 40); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(sx - 10, sy - 10, 20); ctx.fill();
    // clouds drift slowly and scroll a little with the camera: a blue-grey belly, white puffs, a bright top
    for (let i = 0; i < 5; i++) {
      const span = W + 360, x = ((i * 271 - cx * 0.03 + t * (6 + i * 2)) % span + span) % span - 180, y = 50 + (i * 53) % 120, s = 0.8 + (i % 3) * 0.35;
      ctx.fillStyle = 'rgba(170,196,222,0.5)';
      ctx.beginPath(); ctx.arc(x + 2, y + 5, 22 * s, 0, TAU); ctx.arc(x + 28 * s, y - 4 * s, 28 * s, 0, TAU); ctx.arc(x + 58 * s, y + 5, 20 * s, 0, TAU); ctx.rect(x + 2, y + 5, 56 * s, 18 * s); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath(); ctx.arc(x, y, 22 * s, 0, TAU); ctx.arc(x + 26 * s, y - 10 * s, 28 * s, 0, TAU); ctx.arc(x + 56 * s, y, 20 * s, 0, TAU); ctx.rect(x, y, 56 * s, 18 * s); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; circle(x + 20 * s, y - 20 * s, 12 * s); ctx.fill();
    }
    if (!o.noFence) {
      // the giant wooden fence far away: solid boards, softened by the haze. It repeats every three boards, so it is one
      // picture three boards wider than the screen, slid along
      K.pic('shfence', W + 360, 240, 0, 0, () => {
        ctx.translate(0, -110);
        ctx.fillStyle = '#b89c78'; ctx.fillRect(0, 186, W + 360, 18); ctx.fillRect(0, 254, W + 360, 18);
        for (let x = 0; x < W + 360; x += 120) {
          ctx.fillStyle = '#dcc6a2';
          ctx.beginPath(); ctx.moveTo(x + 6, 330); ctx.lineTo(x + 6, 150); ctx.lineTo(x + 60, 118); ctx.lineTo(x + 114, 150); ctx.lineTo(x + 114, 330); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#c8ae88'; ctx.beginPath(); ctx.moveTo(x + 92, 330); ctx.lineTo(x + 92, 137); ctx.lineTo(x + 114, 150); ctx.lineTo(x + 114, 330); ctx.closePath(); ctx.fill();
          // wood grain and a knot
          ctx.strokeStyle = 'rgba(150,120,86,0.35)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x + 30, 150); ctx.lineTo(x + 30, 330); ctx.moveTo(x + 64, 140); ctx.lineTo(x + 64, 330); ctx.stroke();
          ctx.fillStyle = 'rgba(150,120,86,0.4)'; ctx.beginPath(); ctx.ellipse(x + 46, 214 + ((x / 120) % 3) * 30, 5, 8, 0, 0, TAU); ctx.fill();
          // a lit left edge, a dark gap to the next board and two nail heads on each rail
          ctx.fillStyle = 'rgba(255,248,230,0.45)'; ctx.fillRect(x + 6, 150, 3, 180);
          ctx.fillStyle = 'rgba(120,96,70,0.45)'; ctx.fillRect(x + 114, 150, 6, 180);
          ctx.fillStyle = 'rgba(110,90,70,0.6)'; for (const ny of [195, 263]) { circle(x + 20, ny, 2); ctx.fill(); circle(x + 100, ny, 2); ctx.fill(); }
        }
        // the rails cast a soft shadow on the boards under them
        ctx.fillStyle = 'rgba(120,96,70,0.25)'; ctx.fillRect(0, 204, W + 360, 6); ctx.fillRect(0, 272, W + 360, 6);
        // haze in front of the fence, so it sits far back
        const hz = ctx.createLinearGradient(0, 120, 0, 340);
        hz.addColorStop(0, 'rgba(200,232,246,0.35)'); hz.addColorStop(1, 'rgba(214,238,226,0.75)');
        ctx.fillStyle = hz; ctx.fillRect(0, 110, W + 360, 240);
      }, -(((cx * 0.06) % 360) + 360) % 360, 110);
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
    // the right half a shade darker, so each blade reads as a folded leaf
    if (w >= 12 && !o.flat) {
      ctx.fillStyle = 'rgba(20,60,20,0.14)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.35, y - h * 0.55, tx, ty);
      ctx.quadraticCurveTo(x + w / 2 + lean * 0.35, y - h * 0.55, x + w / 2, y); ctx.closePath(); ctx.fill();
    }
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
      K.blade(x, y + 40, h, lean, { w: 30 + K.hash(i + 9) * 20, col: i % 3 ? '#9ccd88' : '#acd696', dark: 'rgba(255,255,255,0.25)' });
      if (o.flowers !== false && K.hash(i + 21) < 0.16) {
        const fx = x + lean * 0.6, fy = y + 40 - h * 0.92;
        ctx.strokeStyle = '#8cbf78'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.quadraticCurveTo(x + lean * 0.2, fy + 80, fx, fy); ctx.stroke();
        ctx.fillStyle = K.hash(i + 5) < 0.5 ? '#fbe68a' : '#f6faf0';
        ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, ex = fx + Math.cos(a) * 22, ey = fy + Math.sin(a) * 22; ctx.moveTo(ex + Math.cos(a) * 16, ey + Math.sin(a) * 16); ctx.ellipse(ex, ey, 16, 8, a, 0, TAU); } ctx.fill();
        ctx.fillStyle = '#f0b448'; circle(fx, fy, 13); ctx.fill();
      }
    }
    // a soft green haze where the far blades meet the ground, so they sit back
    if (o.haze !== false) {
      const hz = ctx.createLinearGradient(0, y - 60, 0, y + 40); hz.addColorStop(0, 'rgba(200,230,190,0)'); hz.addColorStop(1, 'rgba(200,230,190,0.5)');
      ctx.fillStyle = hz; ctx.fillRect(0, y - 60, W, 100);
    }
  };
  /* ---------- the ground and the props players stand on, jump over or dodge ----------
     (Gavyn, 2026-11-17: "these are the kind of things that I want to have way more detail"). Each one is painted once
     into a picture (K.pic) keyed by its size, seed and colour and copied each frame, so the extra detail costs nothing
     while playing. Shapes are the same as before, so they still match what you bump into. */
  const pr = (s, n) => K.hash(s * 0.6180339 + n * 1.7317 + 0.37);
  // a cubic bezier point (for putting moss and grass along a curved outline)
  const bez = (a, b, c, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
  // a little irregular stone, filled and shaded (centre x, y; rx, ry; rotation; colour)
  const stoneBit = (x, y, rx, ry, rot, col, s) => {
    const n = 7, pts = [];
    for (let k = 0; k < n; k++) { const a = rot + k / n * TAU, j = 0.78 + 0.3 * pr(s, k + 3); pts.push([x + Math.cos(a) * rx * j, y + Math.sin(a) * ry * j]); }
    const path = (dx, dy) => { ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy))); ctx.closePath(); };
    ctx.fillStyle = 'rgba(16,8,4,0.45)'; path(0.8, 1.4); ctx.fill();
    ctx.fillStyle = col; path(0, 0); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(20,10,4,0.28)'; ctx.beginPath(); ctx.ellipse(x + rx * 0.55, y + ry * 0.65, rx * 1.05, ry * 0.95, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,235,0.42)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.32, y - ry * 0.4, rx * 0.42, ry * 0.3, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = shade(col, 0.5); ctx.lineWidth = 0.9; path(0, 0); ctx.stroke();
  };

  K.stone = stoneBit;
  // the ground strip: layered soil (a grassy root mat, sandy and clay bands, darker damp subsoil) with stones of many
  // colours, roots, crumbs and the odd worm or beetle tunnel; a thick fringe of short grass on top. It repeats every
  // SOIL_P px (all its details wrap round), so it is one picture copied along.
  const SOIL_P = 1024;
  K.soil = (x0, x1, y, o = {}) => {
    const bottom = o.bottom === undefined ? H + 10 : o.bottom, hgt = Math.max(8, Math.ceil(bottom - y)), grass = o.grass !== false, col = o.col || COL.soil;
    const key = 'soil|' + hgt + '|' + (grass ? 1 : 0) + '|' + col;
    for (let i = Math.floor(x0 / SOIL_P); i * SOIL_P < x1; i++) K.pic(key, SOIL_P + 4, hgt + 30, 0, 30, () => paintSoil(hgt, grass, col), i * SOIL_P, y);
  };
  function paintSoil(h, grass, col) {
    // (the picture is 4 px wider than the repeat, so the copies overlap: no seam where they meet)
    const P = SOIL_P, PW = P + 4, R = n => K.hash(n * 1.37 + 0.5);
    const wrap = (x, r, f) => { f(x); if (x - r < 4) f(x + P); if (x + r > P) f(x - P); };
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, tint(col, 0.1)); g.addColorStop(0.2, col); g.addColorStop(0.55, shade(col, 0.25)); g.addColorStop(1, shade(col, 0.55));
    ctx.fillStyle = g; ctx.fillRect(0, 0, PW, h);
    // strata: wavy bands (whole waves per tile, so they join up)
    const wave = (base, a1, m1, p1, a2, m2) => x => base + a1 * Math.sin(x / P * TAU * m1 + p1) + a2 * Math.sin(x / P * TAU * m2 + p1 * 2.3);
    const lines = [wave(20, 3, 3, 0.4, 1.5, 11), wave(34, 4, 2, 1.7, 1.5, 9), wave(56, 5, 4, 2.9, 2, 13), wave(78, 4, 3, 4.1, 2, 7), wave(102, 5, 2, 5.3, 2, 10)];
    const band = (a, b, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0, a(0)); for (let x = 16; x <= P + 16; x += 16) ctx.lineTo(x, a(x)); for (let x = P + 16; x >= 0; x -= 16) ctx.lineTo(x, b(x)); ctx.closePath(); ctx.fill(); };
    const top0 = () => 0;
    band(top0, lines[0], 'rgba(40,22,10,0.22)'); // dark humus under the roots
    band(lines[1], lines[2], 'rgba(200,156,100,0.26)'); // a sandy band
    band(lines[2], lines[3], 'rgba(140,64,36,0.16)'); // reddish clay
    band(lines[3], lines[4], 'rgba(214,180,130,0.12)'); // a pale silty band
    for (const [k, f] of lines.entries()) {
      if (f(0) > h) continue;
      ctx.strokeStyle = 'rgba(24,12,6,' + (k === 1 ? 0.4 : 0.28) + ')'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, f(0)); for (let x = 16; x <= P + 16; x += 16) ctx.lineTo(x, f(x)); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,222,176,0.13)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, f(0) + 1.6); for (let x = 16; x <= P + 16; x += 16) ctx.lineTo(x, f(x) + 1.6); ctx.stroke();
    }
    // crumbs: hundreds of tiny dark and light grains (one path per colour)
    for (const [cs, n, r0, r1] of [['rgba(28,14,6,0.5)', 520, 0.7, 1.9], ['rgba(244,214,170,0.32)', 380, 0.6, 1.4], ['rgba(120,84,52,0.55)', 260, 1, 2.4]]) {
      ctx.fillStyle = cs; ctx.beginPath();
      for (let i = 0; i < n; i++) { const x0 = R(i * 3 + n) * P, y = 4 + R(i * 5 + n + 1) * (h - 4), r = r0 + R(i + n * 2) * (r1 - r0); wrap(x0, r, x => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }); }
      ctx.fill();
    }
    // a gravel seam along the sandy band
    ctx.fillStyle = 'rgba(150,140,124,0.75)'; ctx.beginPath();
    for (let i = 0; i < 120; i++) { const x0 = R(i + 900) * P, y = lines[1](x0) + 2 + R(i + 901) * 9, r = 1.2 + R(i + 902) * 1.8; wrap(x0, r, x => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }); }
    ctx.fill();
    // worm and beetle tunnels: a dark burrow with a lit lower lip; an earthworm in one, a little beetle in its chamber in the other
    for (let k = 0; k < 2; k++) {
      const bx = (0.22 + k * 0.5 + R(k + 40) * 0.12) * P, by = 50 + R(k + 41) * 30;
      if (by + 14 > h) continue;
      const pts = [bx - 80, by - 18, bx - 30, by + 16, bx + 20, by - 14, bx + 80, by + 8];
      const tube = () => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); };
      ctx.lineCap = 'round';
      tube(); ctx.strokeStyle = 'rgba(255,214,160,0.16)'; ctx.lineWidth = 12; ctx.stroke();
      tube(); ctx.strokeStyle = 'rgba(22,10,4,0.75)'; ctx.lineWidth = 9; ctx.stroke();
      tube(); ctx.strokeStyle = 'rgba(8,4,2,0.6)'; ctx.lineWidth = 4; ctx.stroke();
      if (k === 0) {
        // the worm: a pink length showing in the burrow, ringed, with a shine and its saddle band
        ctx.save(); tube(); ctx.setLineDash([60, 400]); ctx.lineDashOffset = -30;
        ctx.strokeStyle = '#c87a78'; ctx.lineWidth = 5.5; ctx.stroke();
        ctx.setLineDash([1.4, 3.2]); ctx.strokeStyle = 'rgba(110,40,40,0.55)'; ctx.lineWidth = 5.5; ctx.lineDashOffset = 0; ctx.stroke();
        ctx.restore();
        const ux = bez(pts[0], pts[2], pts[4], pts[6], 0.24), uy = bez(pts[1], pts[3], pts[5], pts[7], 0.24);
        ctx.fillStyle = '#e09a96'; ctx.beginPath(); ctx.ellipse(ux, uy, 4, 3, 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,230,0.6)'; circle(ux - 1, uy - 1.2, 1.1); ctx.fill();
      } else {
        const cx2 = pts[6] + 6, cy2 = pts[7] + 2;
        ctx.fillStyle = 'rgba(14,6,2,0.8)'; ctx.beginPath(); ctx.ellipse(cx2, cy2, 13, 8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,214,160,0.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx2, cy2, 13, 8, 0, 0.2, Math.PI - 0.2); ctx.stroke();
        // the beetle: a glossy shell with a split line, head and legs
        ctx.strokeStyle = '#1a1414'; ctx.lineWidth = 1;
        ctx.beginPath(); for (let j = 0; j < 3; j++) { ctx.moveTo(cx2 - 3 + j * 3, cy2 + 1); ctx.lineTo(cx2 - 5 + j * 3, cy2 + 5); ctx.moveTo(cx2 - 3 + j * 3, cy2 - 1); ctx.lineTo(cx2 - 5 + j * 3, cy2 - 4); } ctx.stroke();
        ctx.fillStyle = '#2a4a3a'; ctx.beginPath(); ctx.ellipse(cx2 - 1, cy2, 6, 3.8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; circle(cx2 + 6, cy2, 2.2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(cx2 - 7, cy2); ctx.lineTo(cx2 + 4, cy2); ctx.stroke();
        ctx.fillStyle = 'rgba(190,255,220,0.6)'; ctx.beginPath(); ctx.ellipse(cx2 - 3, cy2 - 1.6, 2.4, 1, 0, 0, TAU); ctx.fill();
      }
      ctx.lineCap = 'butt';
    }
    // roots: a few thick ones running down and sideways, and many fine hair roots under the turf
    for (let k = 0; k < 5; k++) {
      const rx = R(k + 60) * P, len = 50 + R(k + 61) * 60, dx = (R(k + 62) - 0.5) * 120;
      wrap(rx, 90, x => {
        const path = () => { ctx.beginPath(); ctx.moveTo(x, -2); ctx.bezierCurveTo(x + dx * 0.2, len * 0.4, x + dx * 0.8, len * 0.5, x + dx, len); };
        ctx.lineCap = 'round';
        path(); ctx.strokeStyle = 'rgba(40,22,10,0.6)'; ctx.lineWidth = 5; ctx.stroke();
        path(); ctx.strokeStyle = '#b89470'; ctx.lineWidth = 3; ctx.stroke();
        path(); ctx.strokeStyle = 'rgba(255,240,210,0.4)'; ctx.lineWidth = 1; ctx.stroke();
        // side rootlets
        ctx.strokeStyle = 'rgba(200,170,130,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let j = 1; j < 5; j++) { const u = j / 5, px = bez(x, x + dx * 0.2, x + dx * 0.8, x + dx, u), py = bez(-2, len * 0.4, len * 0.5, len, u), sd = j % 2 ? 1 : -1; ctx.moveTo(px, py); ctx.quadraticCurveTo(px + sd * 8, py + 3, px + sd * 14, py + 10); }
        ctx.stroke();
        ctx.lineCap = 'butt';
      });
    }
    ctx.strokeStyle = 'rgba(222,198,160,0.42)'; ctx.lineWidth = 0.9; ctx.beginPath();
    for (let k = 0; k < 140; k++) {
      const rx = R(k + 200) * P, len = 8 + R(k + 201) * 26, dx = (R(k + 202) - 0.5) * 16;
      wrap(rx, 20, x => { ctx.moveTo(x, 1); ctx.quadraticCurveTo(x + dx * 0.2, len * 0.6, x + dx, len); if (k % 3 === 0) { ctx.moveTo(x + dx * 0.4, len * 0.5); ctx.lineTo(x + dx * 0.4 + 4, len * 0.5 + 5); } });
    }
    ctx.stroke();
    // stones of many colours, half-buried at every depth (deeper ones darker)
    const SC = ['#9a968c', '#b8ac98', '#8a7a6a', '#a8704e', '#7a8088', '#ddd6c6', '#6e5e4c', '#c49c6c', '#8c949a', '#b48a62'];
    for (let i = 0; i < 64; i++) {
      const x = R(i + 300) * P, y = 10 + R(i + 301) * (h - 12), r = 2.5 + Math.pow(R(i + 302), 2) * 10, ry = r * (0.55 + R(i + 303) * 0.25);
      if (y - ry < 6) continue;
      const c0 = SC[Math.floor(R(i + 304) * SC.length)], c1 = mixCol(c0, '#2a1a10', clamp(y / Math.max(h, 1), 0, 1) * 0.4);
      wrap(x, r + 2, xx => stoneBit(xx, y, r, ry, R(i + 305) * 3, c1, i));
      if (c0 === '#ddd6c6' && r > 5) wrap(x, r, xx => { ctx.fillStyle = '#ffffff'; K.star(xx - r * 0.3, y - ry * 0.4, 2.6, 0.8, 0); ctx.fill(); });
    }
    // deeper is damper and darker
    const dg = ctx.createLinearGradient(0, Math.min(60, h * 0.5), 0, h);
    dg.addColorStop(0, 'rgba(12,6,2,0)'); dg.addColorStop(1, 'rgba(12,6,2,0.38)');
    ctx.fillStyle = dg; ctx.fillRect(0, Math.min(60, h * 0.5), PW, h);
    // the turf line: a dark shadow under the grass and a crumbly lit lip
    ctx.fillStyle = 'rgba(20,10,4,0.42)'; ctx.fillRect(0, 0, PW, 4);
    ctx.fillStyle = 'rgba(20,10,4,0.2)'; ctx.fillRect(0, 4, PW, 5);
    if (!grass) { ctx.fillStyle = 'rgba(255,226,180,0.22)'; ctx.fillRect(0, 0, PW, 1.5); return; }
    // grass: a dark back row, a middle row, a bright front row with lit edges, the odd tall blade, clover and tiny flowers
    const N = P / 8, blade = (x, y0, hh, l, w2) => { ctx.moveTo(x - w2, y0); ctx.quadraticCurveTo(x - w2 * 0.3 + l * 0.3, y0 - hh * 0.6, x + l, y0 - hh); ctx.quadraticCurveTo(x + w2 * 0.4 + l * 0.3, y0 - hh * 0.6, x + w2, y0); };
    ctx.fillStyle = COL.grassDark; ctx.fillRect(0, -3, PW, 6);
    const rows = [[COL.grassDark, 5, 10, 12, 3.2, 0], ['#4fa43e', 2, 9, 11, 3, 11], [COL.grass, 0, 7, 12, 2.8, 23]];
    for (const [cs, off, hmin, hvar, w2, sd] of rows) {
      ctx.fillStyle = cs; ctx.beginPath();
      for (let j = -2; j <= N + 2; j++) { const jj = ((j % N) + N) % N, x = j * 8 + off + (R(jj + sd + 500) - 0.5) * 4, hh = hmin + R(jj + sd + 501) * hvar, l = (R(jj + sd + 502) - 0.5) * 9; blade(x, 3, hh, l, w2); }
      ctx.fill();
    }
    ctx.strokeStyle = COL.grassHi; ctx.lineWidth = 1; ctx.beginPath();
    for (let j = -2; j <= N + 2; j++) { const jj = ((j % N) + N) % N; if (jj % 2) continue; const x = j * 8 + (R(jj + 523) - 0.5) * 4, hh = 7 + R(jj + 524) * 12, l = (R(jj + 525) - 0.5) * 9; ctx.moveTo(x - 1, 1); ctx.quadraticCurveTo(x - 1 + l * 0.3, -hh * 0.6, x + l, -hh + 1); }
    ctx.stroke();
    // the odd taller blade with a dark midrib
    for (let k = 0; k < 18; k++) {
      const x0 = R(k + 600) * P, hh = 18 + R(k + 601) * 12, l = (R(k + 602) - 0.5) * 14;
      wrap(x0, 12, x => { ctx.fillStyle = k % 2 ? '#3f9a36' : '#56b046'; ctx.beginPath(); blade(x, 3, hh, l, 3.4); ctx.fill(); ctx.strokeStyle = 'rgba(20,70,20,0.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, 2); ctx.quadraticCurveTo(x + l * 0.3, -hh * 0.6, x + l, -hh + 2); ctx.stroke(); });
    }
    // clover sprigs and tiny daisies in the turf
    for (let k = 0; k < 7; k++) {
      const x0 = R(k + 700) * P, cy = -9 - R(k + 701) * 5;
      wrap(x0, 10, x => {
        ctx.strokeStyle = '#3c8a36'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x, cy); ctx.stroke();
        ctx.fillStyle = '#5cb04a'; ctx.strokeStyle = '#2f7428'; ctx.lineWidth = 0.8;
        for (let j = 0; j < 3; j++) { const a = -Math.PI / 2 + (j - 1) * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3.2, cy + Math.sin(a) * 3.2, 3, 0, TAU); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = 'rgba(230,255,210,0.6)'; circle(x, cy, 0.9); ctx.fill();
      });
    }
    for (let k = 0; k < 6; k++) {
      const x0 = R(k + 800) * P, fy = -14 - R(k + 801) * 6, pc = k % 3 === 0 ? '#ffe27a' : '#ffffff';
      wrap(x0, 8, x => {
        ctx.strokeStyle = '#3c8a36'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x + 1, fy); ctx.stroke();
        ctx.fillStyle = pc; ctx.beginPath(); for (let j = 0; j < 6; j++) { const a = j / 6 * TAU; ctx.moveTo(x + 1 + Math.cos(a) * 4.2, fy + Math.sin(a) * 4.2); ctx.arc(x + 1 + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 1.6, 0, TAU); } ctx.fill();
        ctx.fillStyle = '#f2b81c'; circle(x + 1, fy, 1.5); ctx.fill();
      });
    }
  }

  // a big stone, bottom middle at (x, y): shaded from a lit top-left, flat facets with crisp edges, speckle and mica
  // glints, a quartz vein on some, pits, moss on the top and in the shady foot, lichen rosettes, grass at its base
  K.pebble = (x, y, w, h, o = {}) => {
    const s = o.seed || 0, col = o.col || COL.stone, w2 = Math.round(w), h2 = Math.round(h);
    K.pic('peb|' + w2 + '|' + h2 + '|' + s + '|' + col, w2 + 44, h2 + 34, w2 / 2 + 22, h2 + 20, () => paintPebble(w2, h2, s, col), x, y);
  };
  function paintPebble(w, h, s, col) {
    const R = n => pr(s, n), tx = (K.hash(s) - 0.5) * w * 0.2;
    const C1 = [-w / 2, 0, -w / 2 - 4, -h * 0.7, -w * 0.25, -h - 2, tx, -h], C2 = [tx, -h, w * 0.3, -h - 2, w / 2 + 4, -h * 0.6, w / 2, 0];
    const body = () => { ctx.beginPath(); ctx.moveTo(C1[0], C1[1]); ctx.bezierCurveTo(C1[2], C1[3], C1[4], C1[5], C1[6], C1[7]); ctx.bezierCurveTo(C2[2], C2[3], C2[4], C2[5], C2[6], C2[7]); ctx.closePath(); };
    const on = (C, u) => [bez(C[0], C[2], C[4], C[6], u), bez(C[1], C[3], C[5], C[7], u)];
    // soft ground shadow, darker right under it
    ctx.fillStyle = 'rgba(20,16,10,0.16)'; ctx.beginPath(); ctx.ellipse(w * 0.06, 1, w * 0.62, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(20,16,10,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0.5, w * 0.5, 3.5, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(-w * 0.35, -h, w * 0.4, 0);
    g.addColorStop(0, tint(col, 0.28)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, 0.32));
    ctx.fillStyle = g; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    // facets: a lit upper-left plane and a shaded lower-right plane, with crisp edges between
    const cxp = tx * 0.5 + (R(1) - 0.5) * w * 0.15, cyp = -h * (0.42 + R(2) * 0.12);
    const pL = on(C1, 0.55 + R(3) * 0.2), pR = on(C2, 0.35 + R(4) * 0.25), pB = [(R(5) - 0.3) * w * 0.3, 0];
    ctx.fillStyle = 'rgba(255,255,248,0.13)'; ctx.beginPath(); ctx.moveTo(pL[0], pL[1]); ctx.lineTo(cxp, cyp); ctx.lineTo(pR[0], pR[1]); ctx.lineTo(tx, -h - 4); ctx.lineTo(-w / 2, -h - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,26,20,0.16)'; ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(pR[0], pR[1]); ctx.lineTo(w / 2 + 6, 0); ctx.lineTo(pB[0], pB[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,26,20,0.07)'; ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(pL[0], pL[1]); ctx.lineTo(-w / 2 - 6, 0); ctx.lineTo(pB[0], pB[1]); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40,36,30,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(pL[0], pL[1]); ctx.lineTo(cxp, cyp); ctx.lineTo(pR[0], pR[1]); ctx.moveTo(cxp, cyp); ctx.lineTo(pB[0], pB[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,250,0.26)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pL[0], pL[1] - 1.2); ctx.lineTo(cxp, cyp - 1.2); ctx.lineTo(pR[0], pR[1] - 1.2); ctx.stroke();
    // a quartz vein across some stones
    if (R(6) < 0.55 && w > 30) {
      const vy = -h * (0.25 + R(7) * 0.3);
      const vein = () => { ctx.beginPath(); ctx.moveTo(-w / 2 - 4, vy + 6); ctx.bezierCurveTo(-w * 0.15, vy - 6, w * 0.1, vy + 8, w / 2 + 4, vy - 4); };
      vein(); ctx.strokeStyle = 'rgba(60,56,48,0.3)'; ctx.lineWidth = 4.5; ctx.stroke();
      vein(); ctx.strokeStyle = 'rgba(244,240,230,0.7)'; ctx.lineWidth = 2.6; ctx.stroke();
    }
    // speckle and mica: lots of tiny dots in two tones, and a few bright glints
    const n = Math.min(260, Math.round(w * h / 28));
    for (const [cs, sd, r0] of [['rgba(48,44,38,0.38)', 10, 0.7], ['rgba(255,255,250,0.32)', 20, 0.6], ['rgba(120,100,80,0.3)', 30, 1]]) {
      ctx.fillStyle = cs; ctx.beginPath();
      for (let k = 0; k < n; k++) { const px = (R(k * 3 + sd) - 0.5) * w, py = -R(k * 3 + sd + 1) * h, r = r0 + R(k + sd + 2) * 1.2; ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU); }
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff'; for (let k = 0; k < Math.max(2, n / 40); k++) { const px = (R(k + 70) - 0.6) * w * 0.7, py = -h * (0.45 + R(k + 71) * 0.45); ctx.fillRect(px, py, 1.4, 1.4); }
    // pits with a lit lower lip
    for (let k = 0; k < 3 + Math.round(w / 40); k++) {
      const px = (R(k + 80) - 0.5) * w * 0.7, py = -h * (0.15 + R(k + 81) * 0.6), r = 1.5 + R(k + 82) * 2.5;
      ctx.fillStyle = 'rgba(40,36,30,0.45)'; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,250,0.35)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.7, 0, 0.3, Math.PI - 0.3); ctx.stroke();
    }
    // the foot sits in shadow; the lit rim down the upper-left curve
    const fg = ctx.createLinearGradient(0, -h * 0.28, 0, 0); fg.addColorStop(0, 'rgba(20,16,10,0)'); fg.addColorStop(1, 'rgba(20,16,10,0.32)');
    ctx.fillStyle = fg; ctx.fillRect(-w, -h * 0.28, w * 2, h * 0.28 + 2);
    ctx.strokeStyle = 'rgba(255,255,250,0.38)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(C1[0], C1[1] - h * 0.2); ctx.bezierCurveTo(C1[2], C1[3], C1[4], C1[5], C1[6], C1[7]); ctx.bezierCurveTo(C2[2], C2[3], w * 0.3, -h * 0.9, w * 0.35, -h * 0.82); ctx.stroke();
    // lichen: pale green rosettes and the odd orange spot
    for (let k = 0; k < (w > 50 ? 3 : 1); k++) {
      const lx = (R(k + 90) - 0.45) * w * 0.6, ly = -h * (0.35 + R(k + 91) * 0.4), lr = 2.5 + R(k + 92) * 4, orange = R(k + 93) < 0.3;
      ctx.fillStyle = orange ? 'rgba(220,150,60,0.75)' : 'rgba(196,206,160,0.8)'; ctx.beginPath();
      for (let j = 0; j < 6; j++) { const a = j / 6 * TAU + k; ctx.moveTo(lx + Math.cos(a) * lr + lr * 0.55, ly + Math.sin(a) * lr * 0.7); ctx.arc(lx + Math.cos(a) * lr, ly + Math.sin(a) * lr * 0.7, lr * 0.55, 0, TAU); }
      ctx.fill();
      ctx.strokeStyle = orange ? 'rgba(150,80,20,0.6)' : 'rgba(110,120,80,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(lx, ly, lr * 0.6, lr * 0.45, 0, 0, TAU); ctx.stroke();
    }
    // a hairline crack with a lit edge
    if (w > 30) {
      const ck = [[tx * 0.4, -h * 0.98], [tx * 0.4 + w * 0.06, -h * 0.74], [tx * 0.4 - w * 0.01, -h * 0.55], [tx * 0.4 + w * 0.05, -h * 0.4]];
      ctx.strokeStyle = 'rgba(40,36,30,0.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); ck.forEach(([a, b], k) => (k ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,250,0.3)'; ctx.lineWidth = 0.8; ctx.beginPath(); ck.forEach(([a, b], k) => (k ? ctx.lineTo(a + 1.2, b) : ctx.moveTo(a + 1.2, b))); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = shade(col, 0.45); ctx.lineWidth = 2; body(); ctx.stroke();
    // moss: cushions along the top curve and in the shady right foot, with lit tips
    const moss = (px, py, r, k) => {
      ctx.fillStyle = '#4a7a2c'; ctx.beginPath(); for (let j = 0; j < 5; j++) { const a = Math.PI + j / 4 * Math.PI, mx = px + Math.cos(a) * r * 0.8, my = py + Math.sin(a) * r * 0.45; ctx.moveTo(mx + r * 0.55, my); ctx.arc(mx, my, r * 0.55, 0, TAU); } ctx.fill();
      ctx.fillStyle = '#6ea444'; ctx.beginPath(); for (let j = 0; j < 4; j++) { const a = Math.PI + (j + 0.5) / 4 * Math.PI, mx = px + Math.cos(a) * r * 0.6, my = py + Math.sin(a) * r * 0.5 - 1; ctx.moveTo(mx + r * 0.4, my); ctx.arc(mx, my, r * 0.4, 0, TAU); } ctx.fill();
      ctx.fillStyle = '#b4dc7a'; for (let j = 0; j < 5; j++) { ctx.fillRect(px + (pr(k, j) - 0.5) * r * 1.6, py - r * 0.5 - pr(k, j + 5) * r * 0.3, 1.2, 1.2); }
    };
    if (R(40) < 0.8) {
      const u0 = 0.55 + R(41) * 0.3, r = Math.max(4, Math.min(10, w / 9));
      for (let k = 0; k < 3; k++) { const p = on(C1, Math.min(0.98, u0 + k * 0.12)); moss(p[0] + 1, p[1] + r * 0.35, r * (1 - k * 0.15), s + k); }
    }
    if (R(42) < 0.7) { const r = Math.max(4, Math.min(9, w / 10)); moss(w * 0.36, -2, r, s + 9); moss(w * 0.44, -1, r * 0.7, s + 10); }
    // grass blades at the foot
    ctx.fillStyle = COL.grassDark; ctx.beginPath();
    for (let k = 0; k < 5; k++) { const bx = (k < 2 ? -w * 0.48 : w * 0.3) + (R(k + 50) - 0.5) * 12, bh = 6 + R(k + 51) * 9, l = (R(k + 52) - 0.5) * 8; ctx.moveTo(bx - 2, 2); ctx.lineTo(bx + l, -bh); ctx.lineTo(bx + 2, 2); }
    ctx.fill();
  }

  // a fallen stick lying along the ground, bottom left at (x, y), w long and h thick: ridged bark shaded round like a
  // log, knots, a broken-off side branch, lichen and moss, a sawn-looking end with growth rings, a sprig of leaves,
  // a lit top edge and a ground shadow. o.seed varies the pattern.
  K.twig = (x, y, w, h, o = {}) => {
    const w2 = Math.round(w), h2 = Math.round(h), s = o.seed === undefined ? w2 * 7 + h2 * 13 : o.seed;
    K.pic('twig|' + w2 + '|' + h2 + '|' + s, w2 + 44, h2 + 52, 20, h2 + 38, () => paintTwig(w2, h2, s), x, y);
  };
  function paintTwig(w, h, s) {
    const R = n => pr(s, n), e = Math.max(4, Math.min(h * 0.24, w * 0.16)), cy = -h / 2, big = h >= 50;
    const body = () => { ctx.beginPath(); ctx.moveTo(w - e, -h); ctx.lineTo(e, -h); ctx.ellipse(e, cy, e, h / 2, 0, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(w - e, 0); ctx.closePath(); };
    // ground shadow
    ctx.fillStyle = 'rgba(24,14,6,0.18)'; ctx.beginPath(); ctx.ellipse(w * 0.52, 2, w * 0.58, Math.max(4, h * 0.09), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(24,14,6,0.3)'; ctx.beginPath(); ctx.ellipse(w * 0.5, 0.5, w * 0.48, 3, 0, 0, TAU); ctx.fill();
    // the bark: lit on top, round and dark underneath
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, '#b48656'); g.addColorStop(0.16, '#9c6e46'); g.addColorStop(0.5, COL.bark); g.addColorStop(0.82, '#6a4628'); g.addColorStop(1, '#4a2e1a');
    ctx.fillStyle = g; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    // long bark fissures, closer together near the top and bottom (it is round), with lit ridges between
    const nr = clamp(Math.round(h / 6.5), 4, 18), ridgeY = k => cy - Math.cos((k + 0.5) / nr * Math.PI) * h * 0.5;
    // each fissure is a tapered sliver (thick in the middle, pointed at both ends) that wanders a little, so the bark
    // reads as rough ridged plates rather than planks
    const dark = new Path2D(), lite = new Path2D(), plates = new Path2D();
    for (let k = 0; k < nr; k++) {
      const fs = Math.sin((k + 0.5) / nr * Math.PI);
      let x = e * 0.4 - R(k + 1) * 30;
      for (let j = 0; x < w - e && j < 80; j++) {
        const yy = ridgeY(k) + (R(k * 19 + j + 2) - 0.5) * (h / nr) * 0.55;
        const len = (12 + R(k * 31 + j) * 50) * (0.6 + fs * 0.4), gap = 2 + R(k * 17 + j + 5) * 12, wob = (R(k * 13 + j + 9) - 0.5) * 4 * fs;
        const th = (0.5 + R(k * 23 + j + 4) * 1.3) * (big ? 1.4 : 1) * (0.45 + fs * 0.55), y2 = yy + wob * 0.5;
        dark.moveTo(x, yy); dark.quadraticCurveTo(x + len / 2, yy + wob - th, x + len, y2); dark.quadraticCurveTo(x + len / 2, yy + wob + th, x, yy);
        lite.moveTo(x + len * 0.15, yy - th - 1.2 * fs); lite.quadraticCurveTo(x + len / 2, yy + wob - th * 1.6 - 1.2 * fs, x + len * 0.85, y2 - th * 0.6 - 1.2 * fs);
        // bark plates: short cross-cracks between this fissure and the next
        if (k < nr - 1 && R(k * 7 + j + 3) < 0.4) { const px = x + len * R(k + j + 11), ny = ridgeY(k + 1); plates.moveTo(px, yy + th); plates.quadraticCurveTo(px + (R(j + k) - 0.5) * 6, (yy + ny) / 2, px + (R(j + k + 1) - 0.5) * 5, ny - 1); }
        x += len + gap;
      }
    }
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(40,22,10,0.7)'; ctx.fill(dark);
    ctx.strokeStyle = 'rgba(46,26,12,0.32)'; ctx.lineWidth = 1; ctx.stroke(plates);
    ctx.strokeStyle = 'rgba(255,226,180,0.22)'; ctx.lineWidth = 1.1; ctx.stroke(lite);
    // flecks of paler bark
    ctx.fillStyle = 'rgba(214,180,136,0.35)'; ctx.beginPath();
    for (let k = 0; k < Math.round(w * h / 90); k++) { const px = R(k + 200) * w, py = -R(k + 201) * h, r = 0.6 + R(k + 202) * 1.4; ctx.moveTo(px + r * 2, py); ctx.ellipse(px, py, r * 2, r * 0.7, 0, 0, TAU); }
    ctx.fill();
    // knots: a raised burl with the grain swirling round it and a little split in the middle
    const nk = w > 120 ? 2 : h > 28 ? 1 : 0;
    for (let k = 0; k < nk; k++) {
      const kx = e * 2 + (k === 0 ? 0.04 + 0.16 * R(k + 20) : 0.74 + 0.14 * R(k + 20)) * (w - e * 4), ky = cy + (k === 0 ? -0.18 : 0.14) * h + (R(k + 21) - 0.5) * h * 0.1, kr = Math.max(3, h * (0.07 + R(k + 22) * 0.04));
      ctx.strokeStyle = 'rgba(46,26,12,0.45)'; ctx.lineWidth = 1.2;
      for (let j = 1; j <= 3; j++) { ctx.beginPath(); ctx.ellipse(kx + j * 1.5, ky, kr * (1.2 + j * 0.9), kr * (0.55 + j * 0.3), 0, 0, TAU); ctx.stroke(); }
      const kg = ctx.createRadialGradient(kx - kr * 0.4, ky - kr * 0.4, 1, kx, ky, kr * 1.3); kg.addColorStop(0, '#b48a5c'); kg.addColorStop(1, '#6a4428');
      ctx.fillStyle = kg; ctx.beginPath(); ctx.ellipse(kx, ky, kr * 1.2, kr * 0.75, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(46,26,12,0.7)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(kx - kr * 0.5, ky + kr * 0.05); ctx.quadraticCurveTo(kx, ky - kr * 0.15, kx + kr * 0.55, ky + kr * 0.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,190,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(kx, ky, kr * 1.2, kr * 0.75, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
    }
    // lichen: pale grey-green rosettes and a few orange spots on the upper side
    const nl = Math.max(1, Math.round(w / 55));
    for (let k = 0; k < nl; k++) {
      const lx = e * 1.5 + R(k + 30) * (w - e * 3.5), ly = cy - h * (0.05 + R(k + 31) * 0.3), lr = Math.max(2.5, Math.min(7, h * 0.07)) * (0.7 + R(k + 32) * 0.6), orange = R(k + 33) < 0.3;
      ctx.fillStyle = orange ? 'rgba(222,156,62,0.85)' : 'rgba(190,204,160,0.85)'; ctx.beginPath();
      for (let j = 0; j < 7; j++) { const a = j / 7 * TAU, rr2 = lr * (0.8 + 0.4 * pr(k, j)); ctx.moveTo(lx + Math.cos(a) * rr2 + lr * 0.5, ly + Math.sin(a) * rr2 * 0.6); ctx.arc(lx + Math.cos(a) * rr2, ly + Math.sin(a) * rr2 * 0.6, lr * 0.5, 0, TAU); }
      ctx.fill();
      ctx.fillStyle = orange ? 'rgba(160,90,30,0.6)' : 'rgba(100,116,80,0.6)'; ctx.beginPath(); for (let j = 0; j < 4; j++) { ctx.moveTo(lx + (pr(k, j + 9) - 0.5) * lr * 1.4 + 0.9, ly + (pr(k, j + 13) - 0.5) * lr * 0.8); ctx.arc(lx + (pr(k, j + 9) - 0.5) * lr * 1.4, ly + (pr(k, j + 13) - 0.5) * lr * 0.8, 0.9, 0, TAU); } ctx.fill();
    }
    // round shading: a dark underside and a soft lit band on top
    const sh = ctx.createLinearGradient(0, -h, 0, 0);
    sh.addColorStop(0, 'rgba(255,240,210,0.16)'); sh.addColorStop(0.25, 'rgba(255,240,210,0)'); sh.addColorStop(0.6, 'rgba(30,16,6,0)'); sh.addColorStop(1, 'rgba(30,16,6,0.4)');
    ctx.fillStyle = sh; ctx.fillRect(-2, -h - 2, w + 4, h + 4);
    // the left end curves away into shadow
    const lg = ctx.createLinearGradient(0, 0, e * 2.2, 0); lg.addColorStop(0, 'rgba(30,16,6,0.35)'); lg.addColorStop(1, 'rgba(30,16,6,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, -h, e * 2.2, h);
    ctx.restore();
    ctx.strokeStyle = COL.barkDark; ctx.lineWidth = 2; body(); ctx.stroke();
    // the lit top edge
    ctx.strokeStyle = 'rgba(255,240,214,0.42)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(e * 0.6, -h + 1.6); ctx.lineTo(w - e - 2, -h + 1.6); ctx.stroke();
    // a broken-off side branch seen end on: a bark collar round a pale ringed stump
    if (w > 80 && h > 40) {
      const bx = w * (0.42 + R(40) * 0.14), by = cy + h * (0.04 + R(41) * 0.12), br = h * 0.12;
      ctx.fillStyle = 'rgba(30,16,6,0.35)'; ctx.beginPath(); ctx.ellipse(bx + br * 0.4, by + br * 0.5, br * 1.25, br * 1.1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7a5434'; ctx.strokeStyle = COL.barkDark; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(bx, by, br * 1.15, br, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#cfa772'; ctx.beginPath(); ctx.ellipse(bx - br * 0.12, by - br * 0.08, br * 0.78, br * 0.66, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(130,84,40,0.5)'; ctx.lineWidth = 0.9; for (const u of [0.55, 0.3]) { ctx.beginPath(); ctx.ellipse(bx - br * 0.1, by - br * 0.06, br * 0.78 * u, br * 0.66 * u, 0, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,240,210,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(bx, by, br * 1.15, br, 0, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
      // splinters round the break
      ctx.fillStyle = '#e0bc88'; ctx.beginPath(); ctx.moveTo(bx + br * 0.5, by - br * 0.55); ctx.lineTo(bx + br * 1.05, by - br * 1.0); ctx.lineTo(bx + br * 0.75, by - br * 0.3); ctx.closePath(); ctx.fill();
    }
    // the cut end: bark rim, pale wood with growth rings round an off-centre pith, drying cracks, shaded low
    const fx = w - e, fr = h / 2;
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.ellipse(fx, cy, e, fr, 0, 0, TAU); ctx.fill();
    const wg = ctx.createLinearGradient(fx - e, -h, fx + e, 0); wg.addColorStop(0, '#ecc994'); wg.addColorStop(1, '#c0915a');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(fx, cy, e * 0.84, fr * 0.88, 0, 0, TAU); ctx.fill();
    const pxk = fx - e * 0.08, pyk = cy + fr * 0.08, nring = clamp(Math.round(h / 9), 3, 10);
    ctx.lineWidth = big ? 1 : 0.8;
    for (let k = 1; k <= nring; k++) { const u = k / (nring + 0.6); ctx.strokeStyle = k % 2 ? 'rgba(140,90,44,0.55)' : 'rgba(160,110,60,0.3)'; ctx.beginPath(); ctx.ellipse(K.lerp(pxk, fx, u), K.lerp(pyk, cy, u), e * 0.84 * u, fr * 0.88 * u, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = '#7a4e26'; ctx.beginPath(); ctx.ellipse(pxk, pyk, Math.max(1, e * 0.08), Math.max(1.2, fr * 0.06), 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,20,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pxk, pyk); ctx.lineTo(pxk + e * 0.35, pyk - fr * 0.7); ctx.moveTo(pxk, pyk); ctx.lineTo(pxk - e * 0.25, pyk + fr * 0.55); ctx.stroke();
    ctx.fillStyle = 'rgba(90,50,20,0.18)'; ctx.beginPath(); ctx.ellipse(fx, cy, e * 0.84, fr * 0.88, 0, -0.2, Math.PI * 0.8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,226,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(fx, cy, e * 0.84, fr * 0.88, 0, Math.PI * 1.1, Math.PI * 1.65); ctx.stroke();
    ctx.strokeStyle = COL.barkDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(fx, cy, e, fr, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    // moss cushions on top and spilling down the left end and at the foot
    const moss = (px, py, r, k) => {
      ctx.fillStyle = '#466e28'; ctx.beginPath(); for (let j = 0; j < 5; j++) { const a = Math.PI + j / 4 * Math.PI, mx = px + Math.cos(a) * r * 0.85, my = py + Math.sin(a) * r * 0.4; ctx.moveTo(mx + r * 0.55, my); ctx.arc(mx, my, r * 0.55, 0, TAU); } ctx.fill();
      ctx.fillStyle = '#6aa042'; ctx.beginPath(); for (let j = 0; j < 4; j++) { const a = Math.PI + (j + 0.5) / 4 * Math.PI, mx = px + Math.cos(a) * r * 0.6, my = py + Math.sin(a) * r * 0.45 - 1; ctx.moveTo(mx + r * 0.4, my); ctx.arc(mx, my, r * 0.4, 0, TAU); } ctx.fill();
      ctx.fillStyle = '#b8e07e'; for (let j = 0; j < 6; j++) ctx.fillRect(px + (pr(k, j) - 0.5) * r * 1.7, py - r * 0.45 - pr(k, j + 6) * r * 0.35, 1.2, 1.2);
    };
    const mr = Math.max(3.5, Math.min(9, h * 0.1));
    if (w > 60) for (let k = 0; k < 3; k++) moss(e + w * (0.08 + R(50) * 0.3) + k * mr * 1.5, -h + mr * 0.3, mr * (1 - k * 0.18), s + k);
    moss(e * 0.7, cy - h * 0.18, mr * 0.8, s + 7);
    moss(w * (0.6 + R(51) * 0.2), -1, mr * 0.9, s + 8);
    // a sprig with two leaves growing from the top near the left end
    if (h > 26) {
      const sx = e + w * (0.05 + R(60) * 0.08), sy0 = -h + 1, sh2 = Math.min(26, 8 + h * 0.18);
      ctx.strokeStyle = '#5a7a2a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy0); ctx.quadraticCurveTo(sx - 2, sy0 - sh2 * 0.6, sx - sh2 * 0.25, sy0 - sh2); ctx.stroke();
      for (const [u, d] of [[0.55, 1], [1, -1]]) {
        const lx = sx - sh2 * 0.12 * u * 2, ly = sy0 - sh2 * u, a = d > 0 ? -0.5 : -2.3, L = sh2 * 0.5;
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(a);
        ctx.fillStyle = '#7cc04a'; ctx.strokeStyle = '#3c7a24'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, -L * 0.32, L, 0); ctx.quadraticCurveTo(L * 0.5, L * 0.32, 0, 0); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(40,90,20,0.6)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * 0.9, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,220,0.35)'; ctx.beginPath(); ctx.ellipse(L * 0.45, -L * 0.1, L * 0.22, L * 0.06, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    // grass blades in front of the bottom edge, so it sits in the lawn
    ctx.fillStyle = COL.grassDark; ctx.beginPath();
    for (let k = 0; k < Math.round(w / 14); k++) { const bx = R(k + 70) * w, bh = 5 + R(k + 71) * 9, l = (R(k + 72) - 0.5) * 7; ctx.moveTo(bx - 2, 2); ctx.lineTo(bx + l, -bh); ctx.lineTo(bx + 2, 2); }
    ctx.fill();
    ctx.fillStyle = COL.grass; ctx.beginPath();
    for (let k = 0; k < Math.round(w / 20); k++) { const bx = R(k + 80) * w, bh = 4 + R(k + 81) * 7, l = (R(k + 82) - 0.5) * 6; ctx.moveTo(bx - 1.6, 2); ctx.lineTo(bx + l, -bh); ctx.lineTo(bx + 1.6, 2); }
    ctx.fill();
  }

  // an acorn cap lying upside down (a low thing to hop over), bottom left at (x, y): a dome of overlapping scales,
  // cross-hatched, on a smooth lip, with the stalk nub on top
  K.acornCap = (x, y, w, h) => {
    const w2 = Math.round(w), h2 = Math.round(h);
    K.pic('acorn|' + w2 + '|' + h2, w2 + 24, h2 + 22, 12, h2 + 12, () => paintAcorn(w2, h2), x, y);
  };
  function paintAcorn(w, h) {
    const lip = Math.max(5, h * 0.2), top = -h * 0.84;
    const dome = () => { ctx.beginPath(); ctx.moveTo(1, -lip + 1); ctx.bezierCurveTo(0, top * 0.7, w * 0.16, top, w / 2, top); ctx.bezierCurveTo(w * 0.84, top, w, top * 0.7, w - 1, -lip + 1); ctx.closePath(); };
    ctx.fillStyle = 'rgba(30,18,8,0.24)'; ctx.beginPath(); ctx.ellipse(w / 2 + 2, 1, w * 0.6, 4.5, 0, 0, TAU); ctx.fill();
    // the smooth lip the cap sits on, lit along its top, its pale inside showing at the foot
    const lg = ctx.createLinearGradient(0, -lip, 0, 0); lg.addColorStop(0, '#b88a56'); lg.addColorStop(1, '#7a5230');
    ctx.fillStyle = lg; rr(-1, -lip, w + 2, lip, lip * 0.45); ctx.fill();
    ctx.fillStyle = '#d6b07a'; ctx.beginPath(); ctx.ellipse(w / 2, -0.5, w * 0.44, 2.2, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#4a2c14'; ctx.lineWidth = 1.6; rr(-1, -lip, w + 2, lip, lip * 0.45); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,200,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -lip + 1.5); ctx.lineTo(w - 2, -lip + 1.5); ctx.stroke();
    // the dome
    const g = ctx.createRadialGradient(w * 0.35, top * 0.8, 2, w * 0.5, -lip, w * 0.75);
    g.addColorStop(0, '#c89660'); g.addColorStop(0.5, '#966436'); g.addColorStop(1, '#5e3a1c');
    ctx.fillStyle = g; dome(); ctx.fill();
    ctx.save(); dome(); ctx.clip();
    // rows of overlapping scales, tips pointing down to the lip (the crown row first, so each lower row lies over the
    // one above, like roof shingles); each scale its own shade, outlined, lit down its left side
    const rows = Math.max(3, Math.round((h - lip) / 7.5)), span = -lip - top;
    for (let r = 0; r < rows; r++) {
      const u = (r + 1) / rows, ry = top + 2 + span * u, q = clamp((ry - top) / span, 0, 1);
      const half = (w / 2 - 1) * Math.sqrt(Math.max(0.04, 1 - Math.pow(1 - q, 2))), sw = 6.5 + 3.5 * u, sh = 6 + 3.5 * u;
      const n = Math.max(2, Math.round(half * 2 / sw) + 1);
      for (let k = 0; k <= n; k++) {
        const sx = w / 2 - half + (k + (r % 2 ? 0.5 : 0) - 0.25) * (half * 2 / n), sc = mixCol('#d4a066', '#5a3818', clamp(0.15 + (sx / w) * 0.55 + q * 0.2 + (K.hash(r * 7.3 + k * 1.9 + w) - 0.5) * 0.3, 0, 1));
        const scale = () => { ctx.beginPath(); ctx.moveTo(sx - sw * 0.55, ry - sh); ctx.quadraticCurveTo(sx - sw * 0.5, ry - sh * 0.25, sx, ry); ctx.quadraticCurveTo(sx + sw * 0.5, ry - sh * 0.25, sx + sw * 0.55, ry - sh); ctx.closePath(); };
        ctx.fillStyle = sc; scale(); ctx.fill();
        ctx.fillStyle = 'rgba(40,20,6,0.3)'; ctx.fillRect(sx - sw * 0.55, ry - sh, sw * 1.1, sh * 0.28);
        ctx.strokeStyle = 'rgba(46,24,8,0.6)'; ctx.lineWidth = 0.9; scale(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,236,200,0.55)'; ctx.fillRect(sx - 0.6, ry - 2.2, 1.2, 1.2);
        ctx.strokeStyle = 'rgba(255,232,190,0.45)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(sx - sw * 0.4, ry - sh * 0.7); ctx.quadraticCurveTo(sx - sw * 0.35, ry - sh * 0.2, sx - 0.5, ry - 1); ctx.stroke();
      }
    }
    // a fine cross-hatched texture over the scales
    ctx.strokeStyle = 'rgba(56,30,12,0.16)'; ctx.lineWidth = 0.7; ctx.beginPath();
    for (let k = -h; k < w + h; k += 3.5) { ctx.moveTo(k, 0); ctx.lineTo(k + h, -h); ctx.moveTo(k, -h); ctx.lineTo(k + h, 0); }
    ctx.stroke();
    // round shading: dark on the right and low, a soft shine top-left
    const sg = ctx.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, 'rgba(255,230,190,0.1)'); sg.addColorStop(0.55, 'rgba(40,20,6,0)'); sg.addColorStop(1, 'rgba(40,20,6,0.35)');
    ctx.fillStyle = sg; ctx.fillRect(0, top, w, -top);
    ctx.fillStyle = 'rgba(255,240,210,0.22)'; ctx.beginPath(); ctx.ellipse(w * 0.32, top * 0.72, w * 0.16, -top * 0.14, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#4a2c14'; ctx.lineWidth = 1.8; dome(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,200,0.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(3, -lip - 3); ctx.bezierCurveTo(2, top * 0.66, w * 0.18, top + 1.5, w * 0.45, top + 1.5); ctx.stroke();
    // the stalk nub on the crown, with a little cut end
    const nw = Math.max(4, w * 0.12), nh = h + top + 1;
    ctx.fillStyle = '#7a5230'; ctx.strokeStyle = '#4a2c14'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(w / 2 - nw / 2, top + 2); ctx.lineTo(w / 2 - nw * 0.35 + 1, -h + 1); ctx.lineTo(w / 2 + nw * 0.35 + 1, -h + 1); ctx.lineTo(w / 2 + nw / 2, top + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c8a070'; ctx.beginPath(); ctx.ellipse(w / 2 + 1, -h + 1.2, nw * 0.35, Math.max(1, nh * 0.18), 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,210,0.4)'; ctx.fillRect(w / 2 - nw * 0.3, top - nh * 0.6, 1.2, nh * 0.5);
  }

  // a crown bottle cap lying top up (a low thing to hop over), bottom left at (x, y): crimped skirt, a printed top
  // with a star, a metal shine and a few chips showing the steel. o.col: paint colour.
  K.bottleCap = (x, y, w, h, o = {}) => {
    const w2 = Math.round(w), h2 = Math.round(h), col = o.col || '#d8423a';
    K.pic('bcap|' + w2 + '|' + h2 + '|' + col, w2 + 24, h2 + 20, 12, h2 + 10, () => paintBottleCap(w2, h2, col), x, y);
  };
  function paintBottleCap(w, h, col) {
    const topH = Math.max(6, h * 0.3), dk = shade(col, 0.42), n = Math.max(8, Math.round(w / 4));
    ctx.fillStyle = 'rgba(30,20,10,0.24)'; ctx.beginPath(); ctx.ellipse(w / 2 + 2, 1, w * 0.6, 4.5, 0, 0, TAU); ctx.fill();
    // the skirt: flaring a little at the foot, crimped into flutes
    const skirt = () => { ctx.beginPath(); ctx.moveTo(1, -h + topH / 2); ctx.lineTo(w - 1, -h + topH / 2); ctx.lineTo(w + 1, -2); ctx.quadraticCurveTo(w / 2, 1.5, -1, -2); ctx.closePath(); };
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, shade(col, 0.15)); g.addColorStop(0.28, tint(col, 0.22)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, 0.4));
    ctx.fillStyle = g; skirt(); ctx.fill();
    ctx.save(); skirt(); ctx.clip();
    for (let k = 0; k < n; k++) {
      const x0 = -1 + k * (w + 2) / n, cw = (w + 2) / n;
      ctx.fillStyle = k % 2 ? 'rgba(255,255,255,0.2)' : 'rgba(40,0,0,0.22)'; ctx.fillRect(x0, -h, cw * 0.55, h + 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x0 + cw * 0.15, -h + topH * 0.7, 0.9, h * 0.35);
    }
    const bg = ctx.createLinearGradient(0, -h * 0.5, 0, 0); bg.addColorStop(0, 'rgba(40,0,0,0)'); bg.addColorStop(1, 'rgba(40,0,0,0.3)');
    ctx.fillStyle = bg; ctx.fillRect(-2, -h * 0.5, w + 4, h * 0.5 + 2);
    ctx.restore();
    // the scalloped foot of the crimps
    ctx.fillStyle = dk; for (let k = 0; k < n; k++) { const x0 = -1 + (k + 0.5) * (w + 2) / n; ctx.beginPath(); ctx.ellipse(x0, -1.5, (w + 2) / n * 0.32, 1.6, 0, 0, Math.PI); ctx.fill(); }
    ctx.strokeStyle = dk; ctx.lineWidth = 1.6; skirt(); ctx.stroke();
    // the top: a slightly domed disc seen from just above, a printed white ring and star, a shine
    const tx = w / 2, ty = -h + topH / 2;
    ctx.fillStyle = tint(col, 0.08); ctx.beginPath(); ctx.ellipse(tx, ty, w / 2, topH / 2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = dk; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(tx, ty, w * 0.34, topH * 0.3, 0, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(tx, ty); ctx.scale(1, topH / w); ctx.fillStyle = '#ffffff'; K.star(0, 0, w * 0.2, w * 0.08, 0); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(tx, ty, w / 2 - 1.5, topH / 2 - 1, 0, Math.PI * 1.08, Math.PI * 1.55); ctx.stroke();
    // chips in the paint show the steel
    ctx.fillStyle = '#d8dce2'; for (const [u, v, r] of [[0.18, 0.55, 1.4], [0.74, 0.7, 1.1], [0.52, 0.35, 0.9]]) { ctx.beginPath(); ctx.ellipse(w * u, -h * v, r * 1.6, r, 0.4, 0, TAU); ctx.fill(); }
  }
  K.clover = (x, y, s = 1, t = 0) => {
    ctx.strokeStyle = '#3c8a36'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 6 * s, y - 40 * s, x, y - 70 * s); ctx.stroke();
    const sw = Math.sin(t * 1.4 + x * 0.01) * 0.05;
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 1.6 + sw;
      ctx.fillStyle = k === 1 ? '#5fb84a' : '#4fa63e';
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 20 * s, y - 70 * s + Math.sin(a) * 14 * s, 22 * s, 13 * s, a, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2f7428'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(30,80,20,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 70 * s); ctx.lineTo(x + Math.cos(a) * 36 * s, y - 70 * s + Math.sin(a) * 25 * s); ctx.stroke();
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
    ctx.strokeStyle = '#d89a10'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#e8a818'; for (let k = 0; k < 6; k++) { const a = k * 1.1; circle(fx + Math.cos(a) * 7, fy + Math.sin(a) * 7, 1.6); ctx.fill(); }
  };
  K.daisy = (x, y, h, t = 0, o = {}) => {
    const sw = Math.sin(t * 1.1 + x * 0.017) * 5, fx = x + sw, fy = y - h;
    ctx.strokeStyle = '#4c9a40'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - sw * 0.2, y - h * 0.5, fx, fy); ctx.stroke();
    ctx.fillStyle = o.col || COL.petal;
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, ex = fx + Math.cos(a) * 18, ey = fy + Math.sin(a) * 18; ctx.moveTo(ex + Math.cos(a) * 15, ey + Math.sin(a) * 15); ctx.ellipse(ex, ey, 15, 6, a, 0, TAU); } ctx.fill();
    ctx.strokeStyle = 'rgba(160,140,170,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; ctx.moveTo(fx + Math.cos(a) * 10, fy + Math.sin(a) * 10); ctx.lineTo(fx + Math.cos(a) * 26, fy + Math.sin(a) * 26); } ctx.stroke();
    ctx.fillStyle = o.mid || '#ffc83a'; circle(fx, fy, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(180,110,10,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(fx - 3, fy - 3, 3); ctx.fill();
  };
  K.mushroom = (x, y, s = 1, o = {}) => {
    const cap = o.col || '#e0473a';
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(x, y, 30 * s, 5 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2e8d0'; rr(x - 9 * s, y - 40 * s, 18 * s, 40 * s, 6 * s); ctx.fill();
    ctx.fillStyle = 'rgba(120,100,70,0.22)'; rr(x + 1 * s, y - 40 * s, 8 * s, 40 * s, 5 * s); ctx.fill();
    ctx.strokeStyle = '#b8a888'; ctx.lineWidth = 1.5; rr(x - 9 * s, y - 40 * s, 18 * s, 40 * s, 6 * s); ctx.stroke();
    // the gills under the cap
    ctx.fillStyle = '#e8d8b8'; ctx.beginPath(); ctx.ellipse(x, y - 36 * s, 36 * s, 6 * s, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(140,110,80,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -4; k <= 4; k++) { ctx.moveTo(x + k * 3 * s, y - 34 * s); ctx.lineTo(x + k * 7.5 * s, y - 31 * s); } ctx.stroke();
    ctx.fillStyle = cap;
    ctx.beginPath(); ctx.moveTo(x - 38 * s, y - 36 * s); ctx.quadraticCurveTo(x, y - 92 * s, x + 38 * s, y - 36 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(60,10,10,0.18)'; ctx.beginPath(); ctx.moveTo(x + 2 * s, y - 64 * s); ctx.quadraticCurveTo(x + 26 * s, y - 58 * s, x + 38 * s, y - 36 * s); ctx.lineTo(x + 10 * s, y - 36 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(cap, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 38 * s, y - 36 * s); ctx.quadraticCurveTo(x, y - 92 * s, x + 38 * s, y - 36 * s); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); for (const [dx, dy, r] of [[-18, -52, 6], [4, -66, 7], [20, -46, 5], [-4, -44, 4]]) { ctx.moveTo(x + (dx + r) * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); } ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.arc(x - 4 * s, y - 40 * s, 26 * s, -2.7, -2.0); ctx.stroke();
  };
  K.leaf = (x, y, w, rot = 0, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = o.col || '#8fbf4a';
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(0, -w * (o.curl || 0.32), w / 2, 0); ctx.quadraticCurveTo(0, w * 0.18, -w / 2, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(40,80,20,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(30,60,10,0.2)'; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, -2); ctx.quadraticCurveTo(0, w * 0.18, -w / 2, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(40,80,20,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, -2); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); for (let k = 1; k < 4; k++) { const vx = -w / 2 + k * w / 4; ctx.moveTo(vx, -0.5); ctx.lineTo(vx + w * 0.1, -w * 0.1); } ctx.stroke();
    ctx.restore();
  };
  K.dew = (x, y, r = 8, t = 0) => {
    const b = 1 + Math.sin(t * 4 + x * 0.05) * 0.06;
    ctx.fillStyle = 'rgba(160,220,255,0.75)'; ctx.beginPath(); ctx.ellipse(x, y, r * b, r * 1.1 / b, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(x - r * 0.35, y - r * 0.4, r * 0.28); ctx.fill();
    if (Math.sin(t * 3 + x) > 0.85) { ctx.fillStyle = '#ffffff'; K.star(x + r * 0.6, y - r * 0.9, 4, 1.5, 0); ctx.fill(); }
  };
  // a sunflower seed: a teardrop husk, pointed at one end, with black and pale stripes, a shine and a dark rim
  K.seed = (x, y, r = 7, rot = 0) => {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(1, r * 0.55, r * 1.05, r * 0.28, 0, 0, TAU); ctx.fill();
    ctx.rotate(rot);
    const husk = () => { ctx.beginPath(); ctx.moveTo(-r * 1.05, 0); ctx.bezierCurveTo(-r * 0.7, -r * 0.62, r * 0.55, -r * 0.62, r * 1.05, -r * 0.05); ctx.bezierCurveTo(r * 0.55, r * 0.6, -r * 0.7, r * 0.6, -r * 1.05, 0); ctx.closePath(); };
    ctx.fillStyle = '#2e2824'; husk(); ctx.fill();
    ctx.save(); husk(); ctx.clip();
    ctx.strokeStyle = '#ece4d2'; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round';
    ctx.beginPath(); for (const d of [-0.36, 0, 0.36]) { ctx.moveTo(-r * 0.85, d * r * 0.55); ctx.quadraticCurveTo(0, d * r * 1.15, r * 0.9, d * r * 0.2); } ctx.stroke();
    ctx.strokeStyle = 'rgba(160,150,140,0.6)'; ctx.lineWidth = r * 0.06;
    ctx.beginPath(); for (const d of [-0.18, 0.18]) { ctx.moveTo(-r * 0.8, d * r * 0.55); ctx.quadraticCurveTo(0, d * r * 1.15, r * 0.85, d * r * 0.2); } ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-r * 1.1, r * 0.12, r * 2.2, r * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.3, r * 0.5, r * 0.1, -0.08, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#141010'; ctx.lineWidth = 1.2; husk(); ctx.stroke();
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
