/* Pip & Bo - World 29 Ninja Dojo: shared helpers for the four ninja levels (loads before them). */
'use strict';

/* The only global here is NINJA. The four World 29 levels use it for the same little jobs, so they look and feel like
   one world: key names, pops and particles, hint bubbles and prompts, HUD chips and panels, the gold-help banner, ninja
   Pip and Bo, night-town scenery, props (stars, hook, sword, guards...) and shared sounds. It is World 26's CIRCUS kit
   (same names, same arguments, so the World 26 level files are a working example) plus the ninja parts.
   Nothing here touches the rules of a level and nothing keeps state between levels (state lives in G.mst).
   Usual start of a level file:   (() => { const K = NINJA; ... NINJA.defs.<mode> = {...}; })();

   THE MANUAL. "st" is always the level's G.mst. Unless it says "screen px", x / y are in whatever space the canvas is in
   when you call (so call scenery and props inside your camera transform; the parallax painters want NO transform).

   Registering
     NINJA.defs                      {} : each level file ends with NINJA.defs.<mode> = { name, world: 28, ... }.
     K.stubMap()                     the 18-row spawn-only map every World 29 def uses (map: K.stubMap()).
   Small maths
     K.FONT(n)                       the body font string at n px.      K.lerp(a, b, u)      K.smooth(u) smoothstep 0..1
     K.hash(n)                       a steady 0..1 number from n (scenery that must not flicker; never Math.random in draw).
     K.mmss(sec)                     "2:07".
   Players and keys
     K.quiet(id)                     true when the computer plays that character in 1-player mode (no key prompts for it).
     K.key(id, what)                 that player's own key name: what = 'act' | 'left' | 'right' | 'up' | 'down' | 'lr'.
     K.track(st)                     every tick: notes who pressed something (needs st.inT = [0, 0], st.personT = 0).
     K.both(st, win = 12)            both seats are playing (pressed lately, or the computer): gate gold help on it.
     K.idle(st, dt, wait = 12)       no person pressed anything for `wait` s: returns true and stops the clock ("Taking a break").
     K.actLabels(words, both)        sets each player's touch / legend action word, words = [pip, bo] (jobs swap per room).
     K.hide(st) / K.unhide(st)       hide the engine bodies while the level draws Pip and Bo itself (draw: hide, drawTop: unhide).
     K.place(id, sx, sy)             screen px of the feet: keeps the engine player there for name tags and speech bubbles.
   Effects (K.fx(st) in setup makes st.parts, st.pops, st.hints, st.msg, st.hinted; K.tickFx(st, dt) every tick)
     K.pop(st, x, y, word, col, size)         a floating word ("Bonk!").        K.drawPops(st, camX = 0, camY = 0)  screen px
     K.part(st, x, y, vx, vy, life, col, size, grav, kind)   kind: 'dot' | 'star' | 'conf' | 'note' | 'smoke' | 'dust' | 'leaf'
     K.spark(st, x, y, n, cols)   K.confetti(st, x, y, n)   K.dust(st, x, y, col, n = 6)   K.poof(st, x, y, n = 10) ninja smoke
     K.drawParts(st, camX = 0)                inside the camera transform.
     K.star(x, y, ro, ri, rot)                a 5-point star PATH (then fill).
   Messages and prompts
     K.msg(st, text, col, life = 3.5)         the timed message line.      K.BREAK   the "Taking a break..." text.
     K.goldHelp(st, text, life = 4.4)         THE gold-help banner: gold message with a star, the ninjaHelp sound, and
                                              st.stats.helps++ (when st.stats exists). Catch-up help must go through it.
     K.drawMsg(st, m, rightX = W - 14)        draws a message (st.msg, or { text, col, t, life }) in the HUD, screen px.
     K.hint(st, id, text, life = 2.8)         a white bubble over a player (replaces the prompt).   K.hintOnce(st, name, id, text, life)
     K.prompter(st)                           once per HUD frame; then P.say(id, str, x, y, col, pulse) in screen px draws a
                                              key prompt over a player (nothing for the computer's character; bubbles never overlap).
   HUD (screen px; z = hudBig() ? 1.35 : 1)
     K.chip(x, y, w, h, str, lit, held, z)    a pill: gold and blinking when it is the thing to press, green while held.
     K.panel(id, job, w, h, z)                a player's corner panel with name and job; returns { x, y, w, h } to fill.
     K.meter(x, y, w, h, frac, col, mark)     a rounded bar (mark 0..1 draws a gold tick).
     K.helpLine(n)                            the results-card line for n gold helps ('' when 0).
   Ninja Pip and Bo
     K.hero(id, x, y, o)                      the plain engine look, feet at x, y. o: face, rot, s, sy, sx, vy, stun.
     K.ninja(id, x, y, o)                     the same body plus a headband with fluttering tails (Pip peach, Bo ice blue),
                                              little hands and what they hold. Feet at x, y. Returns the hand point { x, y }.
        o.pose   'idle' | 'run' | 'sneak' (crouched) | 'hang' (hands up on a rope) | 'sword' | 'throw' | 'dizzy' | 'cheer'
        o.face 1 | -1    o.t animation clock (default G.clock)    o.rot    o.s scale    o.alpha    o.wind 0..1 (tail stream)
        o.anchor 'hands' : x, y is the grip point and rot swings the body around it (hang / swing on a rope).
        o.aim    sword angle in radians for 'sword' (default raised up and forward);  o.glint 0..1 a sparkle on the tip.
        o.item   'star' | 'pebble' | 'hook' held in the hand for 'throw' (and 'idle').
   Night scenery (all cheap: sky + skyline + town + roofs + props is about 3 ms in slow headless Chromium; node tools/w29/kit-time.js)
     K.sky(camX, t, o)                        full screen, no transform: indigo sky, twinkling stars, big moon, thin clouds.
                                              o: moonX = 770, moonY = 104, moonR = 46, noMoon.
     K.skyline(camX, o)                       no transform: far hills with pagoda and castle silhouettes. o: y = 430, par = 0.12.
     K.town(camX, o)                          no transform: nearer dark houses with lit windows. o: y = 480, par = 0.35.
     K.roof(x, y, w, o)                       a tiled rooftop to stand on: top surface from x to x + w at y, curled eaves,
                                              house wall below. o: bottom = H + 20, th = 18 (tile thickness), noWall, noWindows.
     K.wall(x, y, w, h, o)                    a fortress wall, top at y, with a tile cap. o: noCap.
     K.ground(x0, x1, y, kind, bottom)        a floor strip: kind 'stone' (cobbles) | 'dirt' | 'tatami' | 'wood'.
     K.lantern(x, y, t, o)                    a paper lantern hanging from x, y with a warm glow. o: s = 1, col, off, sway = 1.
     K.lanterns(x0, y0, x1, y1, n, t, sag)    a sagging string of n lanterns.
     K.bamboo(x, y, h, t, seed)               a swaying clump, base at x, y.
     K.stall(x, y, w, o)                      a market stall, bottom middle at x, y. o: h = 96, cols = [a, b] awning, goods 0..3.
     K.dojo(t, o)                             full screen, no transform: wooden hall, paper screens, moon window, scrolls,
                                              tatami floor. o: floor = 440 (y of the mats), noMoon.
   Props
     K.shuriken(x, y, r, rot, o)              a foam throwing star. o: id (0 / 1 tints it Pip / Bo), col, gold, trail (angle it flies along).
     K.hook(x, y, rot, s)                     a grappling hook; x, y is the ring the rope ties to, prongs point along rot.
     K.rope(x0, y0, x1, y1, sag, o)           a twisted rope. o: col, w.
     K.sword(x, y, ang, len, o)               a toy sword from the hand at x, y. o: id (handle colour), glint 0..1.
     K.slash(x, y, r, a0, a1, alpha, col)     a white swoosh crescent (sword swing, deflect).
     K.pebble(x, y, r)
     K.guard(x, y, o)                         a round purple guard ninja, feet at x, y (30 x 40 at s = 1).
        o.state  'patrol' | 'curious' ("?") | 'alert' ("!") | 'dizzy' (stars) | 'sleep' ("z")
        o.face, o.s, o.t, o.walk (walk phase; default t * 9 while patrolling, pass 0 to stand), o.lantern (carries one)
     K.cone(x, y, ang, len, half, o)          a guard's vision cone. o: alert (turns red-orange), a (strength 0..1).
     K.noise(x, y, r, a, col)                 a noise ring (pebble "tik", gong) of radius r and strength a 0..1.
     K.hayCart(x, y, o)                       a hay cart, bottom middle at x, y. o: s, squash 0..1 (something just landed in it), face.
     K.gong(x, y, r, o)                       a gong, disc centre at x, y. o: hit 0..1 (just struck), t, noFrame, ground (y of the feet).
   Sounds (Sfx.play('ninjaWhoosh', pitch)): ninjaWhoosh (throw / swing), ninjaBonk (foam star bonk), ninjaTik (pebble),
     ninjaGong, ninjaShing (sword deflect), ninjaCheer, ninjaHelp (played by K.goldHelp), ninjaAlert ("!"), ninjaDizzy,
     ninjaPoof (smoke), ninjaClink (hook bites). Levels add their own as Sfx.extra.<mode>Name.
   Colours: K.COL = { tile, tileHi, tileEdge, trim, wallDark, wallLit, window, paper, wood, woodDark, guard, guardDark,
     steel, lantern, band: [pip, bo] }. Gold (C.gold) is kept for help and "press now". */
const NINJA = (() => {
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
    tile: '#46507f', tileHi: '#8090c8', tileEdge: '#1f2244', trim: '#c8474a', wallDark: '#2b2750', wallLit: '#3a3566',
    window: '#ffd98a', paper: '#f2e6c8', wood: '#8a5a3a', woodDark: '#5a3824', guard: '#7a6cae', guardDark: '#2a2546',
    steel: '#dfe4f5', lantern: '#ff7a4a', band: ['#ffd9c2', '#d4e6ff'],
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
  // a ninja smoke puff (a job swap, a vanish, a dizzy guard popping back up)
  K.poof = (st, x, y, n = 10) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 20 + Math.random() * 70; K.part(st, x + Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 20, 0.7 + Math.random() * 0.3, i % 3 ? 'rgba(214,208,240,0.85)' : 'rgba(255,255,255,0.9)', 7 + Math.random() * 5, -20, 'smoke'); } };
  K.hint = (st, id, text, life) => { if (K.quiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; };
  K.hintOnce = (st, name, id, text, life) => { if (st.hinted[name]) return; st.hinted[name] = true; K.hint(st, id, text, life); };
  K.msg = (st, text, col, life) => { st.msg = { text, col: col || '#ffffff', t: 0, life: life || 3.5 }; };
  // catch-up help is gold and announced, never hidden, and counted for the results card
  K.goldHelp = (st, text, life) => {
    st.msg = { text, col: C.gold, t: 0, life: life || 4.4, gold: true };
    if (st.stats) st.stats.helps = (st.stats.helps || 0) + 1;
    Sfx.play('ninjaHelp');
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
  const hand = id => { ctx.fillStyle = PCOL[id]; ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 2; };
  // ninja Pip / Bo: the engine body, a headband with two fluttering tails, little hands and what they hold
  K.ninja = (id, x, y, o = {}) => {
    const p = G.players[id], t = o.t === undefined ? G.clock : o.t, f = o.face || 1, pose = o.pose || 'idle', s = o.s || 1;
    let sx = 1, sy = 1, rot = o.rot || 0, wind = 0.3, bob = 0, stun = false, vy = 0;
    if (pose === 'run') { rot += f * 0.14; bob = Math.abs(Math.sin(t * 14)) * 3; sx = 1.04; sy = 0.97; wind = 1; }
    else if (pose === 'sneak') { sy = 0.72; sx = 1.14; bob = Math.abs(Math.sin(t * 5)) * 1.2; wind = 0.1; }
    else if (pose === 'hang') { sy = 1.1; sx = 0.92; wind = 0.6; vy = -200; }
    else if (pose === 'sword') wind = 0.45;
    else if (pose === 'throw') { rot += f * 0.2; wind = 0.7; }
    else if (pose === 'dizzy') { stun = true; rot += Math.sin(t * 6) * 0.16; wind = 0; }
    else if (pose === 'cheer') { bob = Math.abs(Math.sin(t * 9)) * 7; sy = 1.06; sx = 0.95; wind = 0.5; vy = -200; }
    if (o.wind !== undefined) wind = o.wind;
    const w = PW * sx, h = PH * sy, hung = o.anchor === 'hands';
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (hung) { ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(0, h + 9); }
    else { ctx.translate(x, y - bob); ctx.scale(s, s); ctx.translate(0, -h / 2); ctx.rotate(rot); ctx.translate(0, h / 2); }
    // headband tails (behind the body), from the knot at the back of the head
    const by = -h * 0.86, kx = -f * (w / 2 + 1), band = COL.band[id], dark = PDARK[id];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = pass ? band : dark; ctx.lineWidth = pass ? 3.4 : 6;
      ctx.beginPath(); ctx.moveTo(kx, by);
      for (let i = 1; i <= 4; i++) {
        const u = i / 4, fl = Math.sin(t * (9 + wind * 6) - i * 1.1 + k * 1.9) * (1.5 + 3.5 * wind) * u;
        ctx.lineTo(kx - f * i * (1.5 + 4 * wind), by + i * (4.6 - 3.6 * wind) + (k ? 3 * u : -2 * u) + fl);
      }
      ctx.stroke();
    }
    // the body, in the engine's own look
    const save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive, blink: p.blink, stompSafe: p.stompSafe };
    p.x = -PW / 2; p.y = -PH; p.alive = true; p.face = f; p.sx = sx; p.sy = sy; p.vy = o.vy === undefined ? vy : o.vy; p.stun = stun ? 0.5 : 0; p.blink = 0; p.stompSafe = 0;
    drawPlayer(p);
    Object.assign(p, save);
    // the band across the forehead and its knot
    ctx.fillStyle = band; ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
    rr(-w / 2 - 1.5, by - 2.6, w + 3, 5.2, 2.4); ctx.fill(); ctx.stroke();
    circle(kx, by, 3.2); ctx.fill(); ctx.stroke();
    // hands and what they hold
    let hx = 0, hy = -h - 9;
    if (pose === 'hang' || pose === 'cheer') {
      const up = pose === 'hang' ? -h - 7 : -h - 3, dx = pose === 'hang' ? 4 : w / 2 + 4;
      ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -h + 5); ctx.lineTo(-dx, up); ctx.moveTo(w / 2 - 4, -h + 5); ctx.lineTo(dx, up); ctx.stroke();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -h + 5); ctx.lineTo(-dx, up); ctx.moveTo(w / 2 - 4, -h + 5); ctx.lineTo(dx, up); ctx.stroke();
      hand(id); circle(-dx, up, 3.6); ctx.fill(); ctx.stroke(); circle(dx, up, 3.6); ctx.fill(); ctx.stroke();
    } else if (pose === 'sword') {
      hx = f * (w / 2 + 3); hy = -h * 0.5;
      const aim = o.aim === undefined ? (f > 0 ? -1.15 : -Math.PI + 1.15) : o.aim;
      K.sword(hx, hy, aim, 30, { id, glint: o.glint });
      hand(id); circle(hx, hy, 3.8); ctx.fill(); ctx.stroke();
    } else if (pose === 'throw' || o.item) {
      hx = f * (w / 2 + (pose === 'throw' ? 7 : 3)); hy = -h * (pose === 'throw' ? 0.66 : 0.42);
      hand(id); circle(hx, hy, 3.8); ctx.fill(); ctx.stroke();
      if (o.item === 'star') K.shuriken(hx + f * 5, hy - 3, 7, t * 3, { id });
      else if (o.item === 'pebble') K.pebble(hx + f * 4, hy - 3, 4);
      else if (o.item === 'hook') K.hook(hx + f * 2, hy - 2, f > 0 ? -0.6 : -Math.PI + 0.6, 0.8);
    }
    ctx.restore();
    // where the hand is, in the caller's space
    const c = Math.cos(rot), sn = Math.sin(rot);
    if (hung) { const vx = hx, vy2 = hy + h + 9; return { x: x + s * (c * vx - sn * vy2), y: y + s * (sn * vx + c * vy2) }; }
    const vx = hx, vy2 = hy + h / 2;
    return { x: x + s * (c * vx - sn * vy2), y: y - bob + s * (sn * vx + c * vy2 - h / 2) };
  };

  /* ---------- night scenery ---------- */
  const STARS = [];
  for (let i = 0; i < 70; i++) STARS.push({ x: K.hash(i * 3 + 1) * (W + 60), y: K.hash(i * 3 + 2) * 300 * K.hash(i * 3 + 2) + 6, r: 0.7 + K.hash(i * 3 + 3) * 1.3, ph: K.hash(i * 7) * 6.28 });
  const wrap = (v, m) => ((v % m) + m) % m;
  // the night sky: full screen, call with no transform
  K.sky = (cx, t, o = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e1434'); g.addColorStop(0.55, '#2b2a68'); g.addColorStop(1, '#5a4a86');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) {   // three twinkle groups, one path each
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 1.7 + k * 2.1);
      ctx.beginPath();
      for (let i = k; i < STARS.length; i += 3) { const s = STARS[i]; ctx.rect(wrap(s.x - cx * 0.02, W + 60) - 30 - s.r, s.y - s.r, s.r * 2, s.r * 2); }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!o.noMoon) {
      const mx = (o.moonX === undefined ? 770 : o.moonX) - Math.min(140, cx * 0.006), my = o.moonY === undefined ? 104 : o.moonY, r = o.moonR || 46;
      ctx.fillStyle = 'rgba(200,210,255,0.07)'; circle(mx, my, r * 2.1); ctx.fill();
      ctx.fillStyle = 'rgba(210,216,255,0.12)'; circle(mx, my, r * 1.45); ctx.fill();
      ctx.fillStyle = '#faf4d6'; circle(mx, my, r); ctx.fill();
      ctx.fillStyle = 'rgba(196,190,170,0.5)';
      circle(mx - r * 0.3, my - r * 0.25, r * 0.2); ctx.fill(); circle(mx + r * 0.32, my + r * 0.1, r * 0.14); ctx.fill(); circle(mx - r * 0.05, my + r * 0.45, r * 0.11); ctx.fill();
    }
    ctx.fillStyle = 'rgba(126,118,178,0.3)';
    for (let i = 0; i < 4; i++) {
      const x = wrap(i * 331 + 80 - cx * 0.05 + t * 4, W + 400) - 200, y = 70 + i * 47 % 150;
      ctx.beginPath(); ctx.ellipse(x, y, 110 + i * 18, 7 + i % 2 * 3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 60, y + 7, 70, 5, 0, 0, TAU); ctx.fill();
    }
  };
  // one curled roof of a silhouette (centre x, eave line y, half width hw, height rh)
  const sRoof = (x, y, hw, rh) => {
    ctx.beginPath(); ctx.moveTo(x - hw - 8, y - 5); ctx.quadraticCurveTo(x - hw + 2, y, x - hw * 0.5, y - rh * 0.55);
    ctx.lineTo(x - hw * 0.28, y - rh); ctx.lineTo(x + hw * 0.28, y - rh); ctx.lineTo(x + hw * 0.5, y - rh * 0.55);
    ctx.quadraticCurveTo(x + hw - 2, y, x + hw + 8, y - 5); ctx.lineTo(x + hw, y + 3); ctx.lineTo(x - hw, y + 3); ctx.closePath(); ctx.fill();
  };
  const sPagoda = (x, y, s, tiers) => {
    let hw = 30 * s, yy = y;
    for (let i = 0; i < tiers; i++) {
      const bh = 20 * s;
      ctx.fillRect(x - hw * 0.62, yy - bh, hw * 1.24, bh + 1);
      sRoof(x, yy - bh, hw, 13 * s);
      yy -= bh + 11 * s; hw *= 0.8;
    }
    ctx.fillRect(x - 1.5 * s, yy - 20 * s, 3 * s, 22 * s); ctx.fillRect(x - 4 * s, yy - 12 * s, 8 * s, 2 * s);
  };
  const sCastle = (x, y, s) => {
    ctx.beginPath(); ctx.moveTo(x - 78 * s, y); ctx.lineTo(x - 60 * s, y - 44 * s); ctx.lineTo(x + 60 * s, y - 44 * s); ctx.lineTo(x + 78 * s, y); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 46 * s, y - 72 * s, 92 * s, 30 * s); sRoof(x, y - 70 * s, 54 * s, 16 * s);
    ctx.fillRect(x - 30 * s, y - 112 * s, 60 * s, 30 * s); sRoof(x, y - 110 * s, 38 * s, 15 * s);
    ctx.fillRect(x - 17 * s, y - 146 * s, 34 * s, 24 * s); sRoof(x, y - 144 * s, 24 * s, 18 * s);
    ctx.fillRect(x - 96 * s, y - 30 * s, 22 * s, 30 * s); sRoof(x - 85 * s, y - 30 * s, 16 * s, 10 * s);
  };
  const FAR = [[120, 'p', 1.0, 3], [420, 'c', 1.0], [760, 'p', 0.8, 4], [980, 'p', 1.2, 2], [1260, 'c', 0.75], [1520, 'p', 1.0, 5]], FARP = 1700;
  // far hills with pagodas and a castle: call with no transform
  K.skyline = (cx, o = {}) => {
    const y = o.y === undefined ? 430 : o.y, par = o.par === undefined ? 0.12 : o.par, off = cx * par;
    ctx.fillStyle = o.col || '#3a3672';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 24; x += 24) { const wx = x + off; ctx.lineTo(x, y - 26 - Math.sin(wx * 0.006 + 1.3) * 24 - Math.sin(wx * 0.017) * 9); }
    ctx.lineTo(W + 24, H); ctx.fill();
    const k0 = Math.floor((off - 200) / FARP);
    for (let k = k0; k <= k0 + 1; k++) for (const b of FAR) {
      const x = b[0] + k * FARP - off;
      if (x < -160 || x > W + 160) continue;
      const by = y - 22 - Math.sin((b[0]) * 0.006 + 1.3) * 10;
      if (b[1] === 'p') sPagoda(x, by, b[2], b[3]); else sCastle(x, by, b[2]);
    }
  };
  // a nearer row of dark houses with a few lit windows: call with no transform
  K.town = (cx, o = {}) => {
    const y = o.y === undefined ? 480 : o.y, par = o.par === undefined ? 0.35 : o.par, off = cx * par, step = 118;
    const i0 = Math.floor((off - 140) / step), i1 = Math.floor((off + W + 140) / step);
    for (let i = i0; i <= i1; i++) {
      const hsh = K.hash(i), x = i * step + hsh * 30 - off, hw = 44 + K.hash(i + 50) * 26, bh = 34 + K.hash(i + 99) * 56;
      ctx.fillStyle = o.col || '#211d48';
      ctx.fillRect(x - hw * 0.8, y - bh, hw * 1.6, bh + (H - y));
      sRoof(x, y - bh, hw, 20);
      if (hsh > 0.3) {
        ctx.fillStyle = 'rgba(255,217,138,' + (0.5 + 0.35 * hsh) + ')';
        ctx.fillRect(x - hw * 0.45, y - bh + 10, 12, 14); if (hsh > 0.6) ctx.fillRect(x + hw * 0.2, y - bh + 10, 12, 14);
      }
    }
    ctx.fillStyle = o.col || '#211d48'; ctx.fillRect(0, y, W, H - y);
  };
  // the tile slab with curled-up eaves: top surface from x to x + w at y
  const eave = (x, y, w, th, tip) => {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y);
    ctx.quadraticCurveTo(x + w + tip * 0.6, y + 1, x + w + tip, y - tip * 0.55);
    ctx.quadraticCurveTo(x + w + tip * 0.7, y + th - 2, x + w - 6, y + th);
    ctx.lineTo(x + 6, y + th);
    ctx.quadraticCurveTo(x - tip * 0.7, y + th - 2, x - tip, y - tip * 0.55);
    ctx.quadraticCurveTo(x - tip * 0.6, y + 1, x, y); ctx.closePath();
  };
  const tiles = (x, y, w, th) => {
    ctx.fillStyle = COL.tile; ctx.strokeStyle = COL.tileEdge; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    eave(x, y, w, th, th); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,22,52,0.5)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let xi = x + 9; xi < x + w - 4; xi += 14) { ctx.moveTo(xi, y + 4); ctx.lineTo(xi, y + th - 2); }
    ctx.stroke();
    ctx.strokeStyle = COL.tileHi; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 2, y + 1.6); ctx.lineTo(x + w - 2, y + 1.6); ctx.stroke();
  };
  // a tiled rooftop to stand on, with its house below
  K.roof = (x, y, w, o = {}) => {
    const th = o.th || 18, bottom = o.bottom === undefined ? H + 20 : o.bottom, inset = Math.min(18, w * 0.12);
    if (!o.noWall && bottom > y + th) {
      const wx = x + inset, ww = w - inset * 2, wy = y + th - 2;
      ctx.fillStyle = COL.wallLit; ctx.fillRect(wx, wy, ww, bottom - wy);
      ctx.fillStyle = COL.wallDark; ctx.fillRect(wx, wy, ww, 14); ctx.fillRect(wx, wy, 7, bottom - wy); ctx.fillRect(wx + ww - 7, wy, 7, bottom - wy);
      if (!o.noWindows) for (let ex = wx + 22; ex + 30 < wx + ww - 14; ex += 78) {
        if (K.hash(Math.round(ex)) < 0.25) continue;
        for (let ey = wy + 30; ey + 40 < bottom; ey += 96) {
          ctx.fillStyle = 'rgba(255,217,138,0.16)'; ctx.fillRect(ex - 5, ey - 5, 40, 46);
          ctx.fillStyle = COL.window; ctx.fillRect(ex, ey, 30, 36);
          ctx.fillStyle = COL.woodDark; ctx.fillRect(ex + 14, ey, 2, 36); ctx.fillRect(ex, ey + 17, 30, 2);
        }
      }
    }
    ctx.fillStyle = COL.trim; ctx.fillRect(x + 6, y + th - 3, w - 12, 6);
    tiles(x, y, w, th);
  };
  // a fortress wall: pale plaster on a stone foot, a tile cap on top (top at y)
  K.wall = (x, y, w, h, o = {}) => {
    const cap = o.noCap ? 0 : 12, foot = Math.min(h * 0.4, 46);
    ctx.fillStyle = '#8f8ab8'; ctx.fillRect(x, y + cap - 2, w, h - cap + 2 - foot);
    ctx.fillStyle = 'rgba(20,22,52,0.18)'; ctx.fillRect(x, y + cap - 2, w, 10);
    ctx.fillStyle = '#4a4668'; ctx.fillRect(x, y + h - foot, w, foot);
    ctx.strokeStyle = '#2a2742'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x, y + h - foot); ctx.lineTo(x + w, y + h - foot);
    if (foot > 24) { ctx.moveTo(x, y + h - foot / 2); ctx.lineTo(x + w, y + h - foot / 2); }
    for (let xi = x + 20, r = 0; xi < x + w; xi += 44, r++) { ctx.moveTo(xi, y + h - foot); ctx.lineTo(xi, y + h - foot / 2); ctx.moveTo(xi + 22, y + h - foot / 2); ctx.lineTo(xi + 22, y + h); }
    ctx.stroke();
    if (cap) tiles(x - 4, y, w + 8, cap);
  };
  // a floor strip from x0 to x1 with its top at y
  K.ground = (x0, x1, y, kind, bottom) => {
    const b = bottom === undefined ? H + 20 : bottom, w = x1 - x0;
    if (kind === 'tatami') {
      ctx.fillStyle = '#b9b274'; ctx.fillRect(x0, y, w, b - y);
      ctx.fillStyle = '#d2cb8c'; ctx.fillRect(x0, y, w, 5);
      ctx.fillStyle = '#4c5a3c';
      for (let x = Math.floor(x0 / 160) * 160; x < x1; x += 160) ctx.fillRect(Math.max(x0, x), y, 5, b - y);
      ctx.fillRect(x0, y + 44, w, 4);
    } else if (kind === 'wood') {
      ctx.fillStyle = COL.wood; ctx.fillRect(x0, y, w, b - y);
      ctx.fillStyle = '#a8744c'; ctx.fillRect(x0, y, w, 4);
      ctx.fillStyle = COL.woodDark;
      for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) ctx.fillRect(Math.max(x0, x), y + 4, 2, b - y);
    } else if (kind === 'dirt') {
      ctx.fillStyle = '#4e4258'; ctx.fillRect(x0, y, w, b - y);
      ctx.fillStyle = '#6a5a70'; ctx.fillRect(x0, y, w, 5);
      ctx.fillStyle = 'rgba(20,22,52,0.25)';
      for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) { const xx = x + K.hash(x) * 40; if (xx > x0 && xx < x1 - 14) ctx.fillRect(xx, y + 14 + K.hash(x + 1) * 20, 14, 4); }
    } else {
      ctx.fillStyle = '#3d3a64'; ctx.fillRect(x0, y, w, b - y);
      ctx.fillStyle = '#6a6590'; ctx.fillRect(x0, y, w, 5);
      ctx.strokeStyle = 'rgba(20,22,52,0.45)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let r = 0; r < 3; r++) {
        const yy = y + 5 + r * 20; if (yy > b) break;
        ctx.moveTo(x0, yy + 20); ctx.lineTo(x1, yy + 20);
        for (let x = Math.floor(x0 / 48) * 48 + (r % 2) * 24; x < x1; x += 48) if (x > x0) { ctx.moveTo(x, yy); ctx.lineTo(x, yy + 20); }
      }
      ctx.stroke();
    }
  };
  // a paper lantern hanging from (x, y)
  K.lantern = (x, y, t, o = {}) => {
    const s = o.s || 1, sw = Math.sin(t * 1.6 + x * 0.013) * 0.1 * (o.sway === undefined ? 1 : o.sway), col = o.col || COL.lantern;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw); ctx.scale(s, s);
    ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 8); ctx.stroke();
    if (!o.off) {
      const fl = 0.85 + 0.15 * Math.sin(t * 7 + x);
      ctx.fillStyle = 'rgba(255,190,110,' + 0.1 * fl + ')'; circle(0, 21, 34); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,120,' + 0.16 * fl + ')'; circle(0, 21, 21); ctx.fill();
    }
    ctx.fillStyle = o.off ? '#8a5a6a' : col; ctx.beginPath(); ctx.ellipse(0, 21, 10.5, 13, 0, 0, TAU); ctx.fill();
    if (!o.off) { ctx.fillStyle = 'rgba(255,236,170,0.75)'; ctx.beginPath(); ctx.ellipse(0, 22, 5.5, 8, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(120,40,30,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (const ry of [-6, 0, 6]) { ctx.moveTo(-10, 21 + ry); ctx.quadraticCurveTo(0, 23 + ry, 10, 21 + ry); }
    ctx.stroke();
    ctx.fillStyle = '#2a2546'; ctx.fillRect(-5, 7, 10, 3.5); ctx.fillRect(-5, 32, 10, 3.5);
    ctx.fillStyle = '#ffd98a'; ctx.fillRect(-1, 35, 2, 7);
    ctx.restore();
  };
  K.lanterns = (x0, y0, x1, y1, n, t, sag = 16) => {
    ctx.strokeStyle = 'rgba(20,22,52,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
    const cols = [COL.lantern, '#ffb85a', '#ff8fa0'];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      K.lantern(K.lerp(x0, x1, u), K.lerp(y0, y1, u) + sag * 4 * u * (1 - u), t, { s: 0.7, col: cols[i % 3] });
    }
  };
  // a clump of bamboo, base at (x, y)
  K.bamboo = (x, y, h, t, seed = 0) => {
    for (let k = 0; k < 3; k++) {
      const hh = h * (0.72 + 0.28 * K.hash(seed + k * 7 + 1)), bx = x + (k - 1) * 13, sway = Math.sin(t * 1.2 + seed + k * 1.7) * hh * 0.035, seg = 26;
      const at = u => bx + sway * u * u;
      ctx.strokeStyle = '#1d3f3c'; ctx.lineWidth = 8; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx, y - hh / 2, at(1), y - hh); ctx.stroke();
      ctx.strokeStyle = k === 1 ? '#4f9a78' : '#3f8468'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx, y - hh / 2, at(1), y - hh); ctx.stroke();
      ctx.fillStyle = '#1d3f3c';
      for (let d = seg; d < hh; d += seg) { const u = d / hh; ctx.fillRect(at(u) - 4, y - d - 1, 8, 2); }
      ctx.fillStyle = k === 1 ? '#6fba8c' : '#4f9a78';
      for (let j = 0; j < 4; j++) {
        const u = 0.55 + j * 0.13, lx = at(u), ly = y - hh * u, dir = (j + k) % 2 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + dir * 14, ly - 9, lx + dir * 26 + sway * 0.5, ly + 1); ctx.quadraticCurveTo(lx + dir * 12, ly + 1, lx, ly); ctx.fill();
      }
    }
  };
  // a market stall, bottom middle at (x, y)
  K.stall = (x, y, w, o = {}) => {
    const h = o.h || 96, cols = o.cols || ['#c8474a', '#f2e6c8'], goods = o.goods === undefined ? Math.floor(K.hash(Math.round(x)) * 4) : o.goods;
    ctx.fillStyle = COL.woodDark; ctx.fillRect(x - w / 2 + 4, y - h, 5, h); ctx.fillRect(x + w / 2 - 9, y - h, 5, h);
    ctx.fillStyle = '#231f44'; ctx.fillRect(x - w / 2 + 9, y - h + 16, w - 18, h - 50);
    // the counter and what it sells
    ctx.fillStyle = COL.wood; ctx.fillRect(x - w / 2, y - 36, w, 36);
    ctx.fillStyle = '#a8744c'; ctx.fillRect(x - w / 2, y - 36, w, 5);
    ctx.fillStyle = COL.woodDark; for (let xi = x - w / 2 + 18; xi < x + w / 2 - 4; xi += 22) ctx.fillRect(xi, y - 31, 2, 31);
    const gc = [['#ff9a4a', '#ffc24a'], ['#8fd67a', '#d8f08a'], ['#ff8fa0', '#ffd0d8'], ['#b9a0ff', '#e0d4ff']][goods % 4];
    for (let i = 0, n = Math.floor((w - 24) / 15); i < n; i++) {
      const gx = x - w / 2 + 19 + i * 15;
      ctx.fillStyle = gc[i % 2]; circle(gx, y - 41, 6.5); ctx.fill();
      if (i % 2 === 0 && i + 1 < n) { ctx.fillStyle = gc[1]; circle(gx + 7.5, y - 50, 6); ctx.fill(); }
    }
    // the striped awning
    const n = Math.max(4, Math.round(w / 22)), sw = (w + 20) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cols[i % 2];
      const ax = x - w / 2 - 10 + i * sw;
      ctx.beginPath(); ctx.moveTo(ax + 5, y - h - 6); ctx.lineTo(ax + sw + 5.5, y - h - 6); ctx.lineTo(ax + sw + 0.5, y - h + 18); ctx.arc(ax + sw / 2, y - h + 18, sw / 2, 0, Math.PI); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(20,22,52,0.25)'; ctx.fillRect(x - w / 2 - 5, y - h - 6, w + 16, 3);
  };
  // inside the dojo: full screen, call with no transform
  K.dojo = (t, o = {}) => {
    const fy = o.floor === undefined ? 440 : o.floor;
    const g = ctx.createLinearGradient(0, 0, 0, fy);
    g.addColorStop(0, '#1b1838'); g.addColorStop(1, '#3a2e58');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, fy);
    // paper screens glowing with moonlight
    const top = 86, ph = fy - top - 18;
    for (let i = 0; i < 6; i++) {
      const x = 24 + i * 154;
      ctx.fillStyle = i % 2 ? '#7471ae' : '#7f7cb8'; ctx.fillRect(x, top, 142, ph);
      ctx.strokeStyle = '#3c2a34'; ctx.lineWidth = 3; ctx.beginPath();
      for (let k = 1; k < 4; k++) { ctx.moveTo(x + k * 35.5, top); ctx.lineTo(x + k * 35.5, top + ph); }
      for (let k = 1; k < 5; k++) { ctx.moveTo(x, top + k * ph / 5); ctx.lineTo(x + 142, top + k * ph / 5); }
      ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeRect(x, top, 142, ph);
    }
    // the round moon window
    if (!o.noMoon) {
      const mx = W / 2, my = top + ph * 0.42, r = 74;
      ctx.fillStyle = '#3c2a34'; circle(mx, my, r + 8); ctx.fill();
      ctx.fillStyle = '#1a2050'; circle(mx, my, r); ctx.fill();
      ctx.fillStyle = 'rgba(210,216,255,0.16)'; circle(mx + 14, my - 12, 44); ctx.fill();
      ctx.fillStyle = '#faf4d6'; circle(mx + 14, my - 12, 30); ctx.fill();
      ctx.fillStyle = '#2f6a58'; ctx.beginPath(); ctx.moveTo(mx - r * 0.8, my + r * 0.6); ctx.quadraticCurveTo(mx - 30, my - 10, mx - 44, my - r * 0.7); ctx.lineTo(mx - 38, my - r * 0.7); ctx.quadraticCurveTo(mx - 22, my - 6, mx - r * 0.66, my + r * 0.75); ctx.fill();
      ctx.strokeStyle = '#3c2a34'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx - r, my); ctx.lineTo(mx + r, my); ctx.moveTo(mx, my - r); ctx.lineTo(mx, my + r); ctx.stroke();
    }
    // beams, posts and two hanging scrolls
    ctx.fillStyle = '#4a3040'; ctx.fillRect(0, 0, W, 30); ctx.fillRect(0, 62, W, 16); ctx.fillRect(0, fy - 20, W, 20);
    ctx.fillStyle = '#5c3c48'; ctx.fillRect(0, 26, W, 5); ctx.fillRect(0, 74, W, 4);
    ctx.fillStyle = '#3c2634'; for (const px of [0, 164, W - 178, W - 14]) ctx.fillRect(px, 0, 14, fy);
    for (const k of [0, 1]) {
      const sx = k ? W - 96 : 96, sw = Math.sin(t * 1.1 + k * 2) * 2;
      ctx.fillStyle = COL.paper; ctx.beginPath(); ctx.moveTo(sx - 26, 96); ctx.lineTo(sx + 26, 96); ctx.lineTo(sx + 26 + sw, 250); ctx.lineTo(sx - 26 + sw, 250); ctx.closePath(); ctx.fill();
      ctx.fillStyle = COL.trim; ctx.fillRect(sx - 30, 92, 60, 7); ctx.fillRect(sx - 30 + sw, 248, 60, 7);
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(sx + sw * 0.5, 172, 17, 0.5, 6.0); ctx.stroke();
    }
    K.ground(0, W, fy, 'tatami', H);
  };

  /* ---------- props ---------- */
  // a foam throwing star (soft and round at the points)
  K.shuriken = (x, y, r, rot, o = {}) => {
    const fill = o.gold ? C.gold : o.col || (o.id === 0 ? '#ffc0ab' : o.id === 1 ? '#b9d4ff' : COL.steel);
    const edge = o.gold ? C.goldDark : o.id === 0 || o.id === 1 ? PDARK[o.id] : '#3a3e66';
    if (o.trail !== undefined) {
      ctx.strokeStyle = fill; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.35 - i * 0.1; ctx.lineWidth = r * (0.7 - i * 0.15);
        const d = r * (1.4 + i * 1.5), oy = (i - 1) * r * 0.5;
        ctx.beginPath(); ctx.moveTo(x - Math.cos(o.trail) * d - Math.sin(o.trail) * oy, y - Math.sin(o.trail) * d + Math.cos(o.trail) * oy);
        ctx.lineTo(x - Math.cos(o.trail) * (d + r * 1.6) - Math.sin(o.trail) * oy, y - Math.sin(o.trail) * (d + r * 1.6) + Math.cos(o.trail) * oy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rad = i % 2 ? r * 0.42 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath();
    ctx.lineJoin = 'round'; ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1.5, r * 0.3);
    ctx.stroke(); ctx.fill();
    ctx.fillStyle = edge; circle(x, y, r * 0.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(x + Math.cos(rot) * r * 0.55, y + Math.sin(rot) * r * 0.55, r * 0.12); ctx.fill();
  };
  // a grappling hook: (x, y) is the ring the rope ties to, the prongs point along rot
  K.hook = (x, y, rot, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? COL.steel : '#1c1a36'; ctx.lineWidth = pass ? 3 : 6;
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(18, 0);
      ctx.moveTo(18, 0); ctx.quadraticCurveTo(27, -1, 24, -11); ctx.moveTo(18, 0); ctx.quadraticCurveTo(27, 1, 24, 11); ctx.moveTo(18, 0); ctx.lineTo(27, 0);
      ctx.stroke();
      ctx.lineWidth = pass ? 2 : 5; circle(0, 0, 4); ctx.stroke();
    }
    ctx.restore();
  };
  // a twisted rope
  K.rope = (x0, y0, x1, y1, sag = 0, o = {}) => {
    const lw = o.w || 3.5, path = () => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); };
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = lw + 2.5; path(); ctx.stroke();
    ctx.strokeStyle = o.col || '#e8d8b0'; ctx.lineWidth = lw; path(); ctx.stroke();
    ctx.setLineDash([3, 6]); ctx.strokeStyle = '#9a8458'; ctx.lineWidth = lw * 0.5; path(); ctx.stroke(); ctx.setLineDash([]);
  };
  // a toy sword held at (x, y), pointing along ang
  K.sword = (x, y, ang, len = 30, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#eef2ff'; ctx.strokeStyle = '#3a3e66'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(6, -2.6); ctx.lineTo(len - 5, -2.6); ctx.quadraticCurveTo(len + 1, -2, len + 2, 2.6); ctx.lineTo(6, 2.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(150,165,215,0.8)'; ctx.fillRect(8, 0.6, len - 10, 1.4);
    ctx.fillStyle = o.id === 0 || o.id === 1 ? PDARK[o.id] : COL.woodDark; rr(-7, -2.4, 13, 4.8, 2); ctx.fill();
    ctx.fillStyle = '#e2a93b'; ctx.strokeStyle = '#7a5210'; ctx.lineWidth = 1.2; rr(4.5, -5, 3.4, 10, 1.5); ctx.fill(); ctx.stroke();
    if (o.glint > 0) {
      ctx.globalAlpha = clamp(o.glint, 0, 1); ctx.fillStyle = '#ffffff';
      const gr = 4 + 7 * o.glint; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rad = i % 2 ? gr * 0.25 : gr; ctx.lineTo(len + Math.cos(a) * rad, Math.sin(a) * rad); }
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
  };
  // a white swoosh from angle a0 to a1 around (x, y), fat in the middle
  K.slash = (x, y, r, a0, a1, alpha = 1, col) => {
    ctx.globalAlpha = clamp(alpha, 0, 1); ctx.fillStyle = col || '#ffffff';
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const a = K.lerp(a0, a1, i / 10); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    for (let i = 10; i >= 0; i--) { const u = i / 10, a = K.lerp(a0, a1, u), rad = r - r * 0.3 * Math.sin(Math.PI * u) * (0.4 + 0.6 * u); ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  };
  K.pebble = (x, y, r = 4) => {
    ctx.fillStyle = '#b4b0c8'; ctx.strokeStyle = '#3a3e66'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r * 0.9, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(x - r * 0.3, y - r * 0.3, r * 0.28); ctx.fill();
  };
  // a guard ninja: round, purple, a bit sleepy. Feet at (x, y)
  K.guard = (x, y, o = {}) => {
    const t = o.t === undefined ? G.clock : o.t, f = o.face || 1, s = o.s || 1, state = o.state || 'patrol';
    const ph = o.walk === undefined ? (state === 'patrol' ? t * 9 : 0) : o.walk, moving = ph !== 0;
    const bob = state === 'alert' ? Math.abs(Math.sin(t * 11)) * 5 : moving ? Math.abs(Math.sin(ph)) * 2 : 0;
    const rot = state === 'dizzy' ? Math.sin(t * 5) * 0.2 : state === 'sleep' ? f * 0.1 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(14,16,40,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 3.5, 0, 0, TAU); ctx.fill();
    // feet
    ctx.fillStyle = COL.guardDark;
    const st = moving ? Math.sin(ph) * 5 : 0;
    ctx.beginPath(); ctx.ellipse(-7 + st, -2, 6.5, 3.5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(7 - st, -2, 6.5, 3.5, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -bob - 20); ctx.rotate(rot); ctx.translate(0, 20);
    // lantern on a stick
    if (o.lantern && state !== 'dizzy') {
      ctx.strokeStyle = COL.woodDark; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 12, -16); ctx.lineTo(f * 30, -34); ctx.stroke();
      K.lantern(f * 30, -34, t, { s: 0.62 });
    }
    // body and hood
    ctx.fillStyle = COL.guard; ctx.strokeStyle = COL.guardDark; ctx.lineWidth = 2.5;
    rr(-15, -40, 30, 38, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(-11, -37, 9, 13, 5); ctx.fill();
    ctx.fillStyle = COL.guardDark; circle(0, -42, 4.5); ctx.fill();
    ctx.fillStyle = COL.trim; ctx.fillRect(-15, -15, 30, 5.5);
    ctx.beginPath(); ctx.moveTo(-f * 13, -13); ctx.lineTo(-f * 21, -6 + Math.sin(t * 6) * 1.5); ctx.lineTo(-f * 15, -9); ctx.closePath(); ctx.fill();
    // the face slit
    const fx = f * 2.5;
    ctx.fillStyle = '#f6e3c6'; rr(-10.5 + fx, -33, 21, 11.5, 5.5); ctx.fill();
    ctx.strokeStyle = COL.guardDark; ctx.lineWidth = 1.5; rr(-10.5 + fx, -33, 21, 11.5, 5.5); ctx.stroke();
    const ey = -27;
    if (state === 'dizzy') {
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2;
      for (const ex of [-4.5, 4.5]) { ctx.beginPath(); ctx.moveTo(ex + fx - 2.5, ey - 2.5); ctx.lineTo(ex + fx + 2.5, ey + 2.5); ctx.moveTo(ex + fx + 2.5, ey - 2.5); ctx.lineTo(ex + fx - 2.5, ey + 2.5); ctx.stroke(); }
    } else if (state === 'sleep') {
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2;
      for (const ex of [-4.5, 4.5]) { ctx.beginPath(); ctx.arc(ex + fx, ey - 1, 2.6, 0.2, Math.PI - 0.2); ctx.stroke(); }
    } else if (state === 'alert') {
      for (const ex of [-4.5, 4.5]) { ctx.fillStyle = '#ffffff'; circle(ex + fx, ey, 3.8); ctx.fill(); ctx.fillStyle = '#1c1a36'; circle(ex + fx + f * 1.2, ey, 1.5); ctx.fill(); }
    } else {
      ctx.fillStyle = '#1c1a36';
      for (const ex of [-4.5, 4.5]) { circle(ex + fx + f, ey + 0.6, state === 'curious' ? 2.5 : 2.1); ctx.fill(); }
      if (state === 'patrol') { ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8 + fx, ey - 2.6); ctx.lineTo(-1.5 + fx, ey - 1.8); ctx.moveTo(1.5 + fx, ey - 1.8); ctx.lineTo(8 + fx, ey - 2.6); ctx.stroke(); }
    }
    // the sign over the head
    if (state === 'alert') bigText('!', 0, -62, 28, '#ff6b6b', 1 + 0.12 * Math.sin(t * 14));
    else if (state === 'curious') bigText('?', 0, -60, 24, '#ffffff', 1 + 0.06 * Math.sin(t * 6));
    else if (state === 'dizzy') { ctx.fillStyle = '#fff2b0'; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; K.star(Math.cos(a) * 15, -50 + Math.sin(a) * 4, 4.5, 2, a); ctx.fill(); } }
    else if (state === 'sleep') for (let i = 0; i < 3; i++) { const u = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = 1 - u; text('z', f * (10 + u * 16), -46 - u * 26, 10 + u * 8, '#ffffff', 'center'); ctx.globalAlpha = 1; }
    ctx.restore();
  };
  // a guard's vision cone from (x, y) along ang
  K.cone = (x, y, ang, len, half, o = {}) => {
    const a = o.a === undefined ? 1 : o.a, c = o.alert ? '255,120,90' : '255,240,170';
    for (const [u, al] of [[1, 0.13], [0.62, 0.12]]) {
      ctx.fillStyle = 'rgba(' + c + ',' + al * a * (o.alert ? 1.5 : 1) + ')';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, len * u, ang - half, ang + half); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(' + c + ',' + 0.5 * a + ')'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(ang - half) * len, y + Math.sin(ang - half) * len); ctx.lineTo(x, y); ctx.lineTo(x + Math.cos(ang + half) * len, y + Math.sin(ang + half) * len); ctx.stroke();
    ctx.setLineDash([]);
  };
  // a noise ring
  K.noise = (x, y, r, a = 1, col) => {
    ctx.globalAlpha = clamp(a, 0, 1); ctx.strokeStyle = col || '#ffffff';
    ctx.lineWidth = 3; circle(x, y, r); ctx.stroke();
    ctx.lineWidth = 1.5; circle(x, y, r * 0.68); ctx.stroke();
    ctx.globalAlpha = 1;
  };
  // a hay cart, bottom middle at (x, y)
  K.hayCart = (x, y, o = {}) => {
    const s = o.s || 1, q = clamp(o.squash || 0, 0, 1), f = o.face || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
    ctx.strokeStyle = COL.woodDark; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(40, -24); ctx.lineTo(70, -12); ctx.stroke();
    // the hay
    const top = -70 + q * 14;
    ctx.fillStyle = '#e8c860'; ctx.strokeStyle = '#8a6a20'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-44, -30); ctx.quadraticCurveTo(-50 - q * 6, top + 12, -18, top); ctx.quadraticCurveTo(4, top - 9 + q * 10, 22, top + 3); ctx.quadraticCurveTo(52 + q * 6, top + 14, 44, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff2a8'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i < 7; i++) { const hx = -32 + i * 11, hy = top + 14 + (i * 37 % 17); ctx.moveTo(hx, hy); ctx.lineTo(hx + 7, hy - 6); }
    ctx.stroke();
    ctx.strokeStyle = '#b8943a'; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const hx = -28 + i * 11, hy = top + 24 + (i * 53 % 13); ctx.moveTo(hx, hy); ctx.lineTo(hx - 6, hy - 5); }
    ctx.stroke();
    // the cart
    ctx.fillStyle = COL.wood; ctx.strokeStyle = COL.woodDark; ctx.lineWidth = 2;
    rr(-46, -36, 92, 20, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.woodDark; for (const px of [-24, 0, 24]) ctx.fillRect(px - 1, -35, 2, 18);
    for (const wx of [-28, 28]) {
      ctx.fillStyle = '#3c2634'; circle(wx, -13, 13); ctx.fill();
      ctx.fillStyle = COL.wood; circle(wx, -13, 9); ctx.fill();
      ctx.strokeStyle = '#3c2634'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx - 9, -13); ctx.lineTo(wx + 9, -13); ctx.moveTo(wx, -22); ctx.lineTo(wx, -4); ctx.stroke();
      ctx.fillStyle = '#e2a93b'; circle(wx, -13, 2.5); ctx.fill();
    }
    ctx.restore();
  };
  // a gong, disc centre at (x, y)
  K.gong = (x, y, r, o = {}) => {
    const hit = clamp(o.hit || 0, 0, 1), t = o.t === undefined ? G.clock : o.t, gy = o.ground === undefined ? y + r + 34 : o.ground;
    if (!o.noFrame) {
      ctx.fillStyle = COL.trim; ctx.fillRect(x - r - 16, y - r - 16, 7, gy - (y - r - 16)); ctx.fillRect(x + r + 9, y - r - 16, 7, gy - (y - r - 16));
      ctx.fillStyle = '#8a2c34'; rr(x - r - 26, y - r - 24, r * 2 + 52, 9, 4); ctx.fill();
      ctx.fillRect(x - r - 22, gy - 5, 19, 5); ctx.fillRect(x + r + 3, gy - 5, 19, 5);
      ctx.strokeStyle = COL.paper; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r - 16); ctx.lineTo(x - r * 0.5, y - r * 0.8); ctx.moveTo(x + r * 0.5, y - r - 16); ctx.lineTo(x + r * 0.5, y - r * 0.8); ctx.stroke();
    }
    const dx = Math.sin(t * 46) * 3 * hit;
    if (hit > 0) { ctx.strokeStyle = 'rgba(255,236,170,' + 0.7 * hit + ')'; ctx.lineWidth = 3; for (const k of [1.25, 1.55]) { circle(x, y, r * (k + (1 - hit) * 0.5)); ctx.stroke(); } }
    ctx.fillStyle = '#e2a93b'; ctx.strokeStyle = '#7a5210'; ctx.lineWidth = 3; circle(x + dx, y, r); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b07a20'; ctx.lineWidth = 2; circle(x + dx, y, r * 0.7); ctx.stroke();
    ctx.fillStyle = '#ffd978'; circle(x + dx, y, r * 0.32); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x + dx, y, r * 0.85, -2.4, -1.5); ctx.stroke();
  };

  /* ---------- shared sounds ---------- */
  Sfx.extra.ninjaWhoosh = function (p) { p = p || 1; this.tone(320 * p, 0.12, 'sawtooth', 0.018, 900 * p); this.tone(1200 * p, 0.1, 'sine', 0.02, 500 * p, 0.02); };
  Sfx.extra.ninjaBonk = function (p) { p = p || 1; this.tone(190 * p, 0.14, 'sine', 0.09, 95 * p); this.tone(540 * p, 0.06, 'triangle', 0.03, 380 * p, 0.01); };
  Sfx.extra.ninjaTik = function (p) { p = p || 1; this.tone(1500 * p, 0.03, 'square', 0.03, 900 * p); this.tone(700 * p, 0.04, 'triangle', 0.03, 500 * p, 0.03); };
  Sfx.extra.ninjaGong = function () { this.tone(196, 0.9, 'sine', 0.08, 190); this.tone(294, 0.7, 'triangle', 0.04, 288); this.tone(588, 0.4, 'sine', 0.02, 580, 0.01); };
  Sfx.extra.ninjaShing = function (p) { p = p || 1; this.tone(1800 * p, 0.1, 'triangle', 0.04, 2600 * p); this.tone(2600 * p, 0.18, 'sine', 0.025, 3200 * p, 0.04); };
  Sfx.extra.ninjaCheer = function () { [587, 659, 784, 988, 1175, 988, 1175].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.05, null, i * 0.08)); };
  Sfx.extra.ninjaHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.ninjaAlert = function () { this.tone(660, 0.08, 'square', 0.04); this.tone(990, 0.16, 'square', 0.04, null, 0.09); };
  Sfx.extra.ninjaDizzy = function () { [700, 560, 620, 480].forEach((f, i) => this.tone(f, 0.1, 'sine', 0.04, f * 0.85, i * 0.09)); };
  Sfx.extra.ninjaPoof = function () { this.tone(220, 0.22, 'sawtooth', 0.02, 70); this.tone(900, 0.1, 'sine', 0.015, 300, 0.02); };
  Sfx.extra.ninjaClink = function () { this.tone(1300, 0.05, 'square', 0.03); this.tone(1950, 0.09, 'triangle', 0.03, null, 0.03); };
  return K;
})();
