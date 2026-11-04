/* Pip & Bo - Level 5-3 Ice Slide (team). */
'use strict';

/* ---------- 5-3 Ice Slide (MODES.ice, World 5 Road Trip, team) ----------
   On ice you can't walk: a press of ◀/▶ sends you sliding until you bump into something (a wall, a closed gate, a post
   of your colour, or your partner), and you stop in the middle of that tile. On ice you can only hop straight up (through
   an ice shelf above you) or drop (▼, down through the ice shelf you stand on). Snow ('n') is grippy: normal walking.
   Splashing into icy water puts you back where you last stood still. Two of you sliding head-on into each other: "Boing!",
   you both bounce back to where your slides began (so a slide only ever ends where a standing partner would stop you, and
   timing never matters). Hold ▼ for 1 s (on the ground, not on a shelf, a button or a head) to go back to your start spot.
   After a respawn or a room change, a held ◀/▶ must be let go first (dirLock), like ▼ (dropLock).
   On snow a tap of ◀/▶ keeps you walking that way until you reach the ice or bump into something (or press the other way).
   After ice.arrowAfter s in a room, an arrow in the player's colour shows who moves next and which way (ice.guide table).
   def.ownStep: this step() is the whole tick (it copies the engine's buttons/gates/door).
   Everything lives in this block, so only MODES.ice and the Sfx.extra.ice* sounds are visible outside it. */
{
  const ICE = {
    slideV: 300,      // px/s top slide speed (10 tiles a second)
    startV: 120,      // px/s speed a slide starts at
    slideAcc: 3000,   // px/s^2 push-off ramp (0.06 s from startV to slideV)
    hopV: 660,        // px/s hop (= PHYS.jumpV: apex 109 px, clears a shelf 3 rows up, never 4)
    walkOn: 40,       // px/s: walking/landing onto ice faster than this turns into a slide, slower = you stop
    buffer: 0.15,     // s: a direction/jump pressed this long before you come to rest still counts
    holdRepeat: 0.3,  // s: a direction still held this long while standing still starts the next slide (kids hold)
    resetHold: 1.0,   // s: hold ▼ this long to go back to your start spot (World 5's "go back" gesture)
    resetShow: 0.15,  // s: the go-back ring shows only after ▼ has been held this long
    respawn: 0.8,     // s: splash -> back on your last resting spot
    doorHold: 0.35,   // s: both in the door
    hintAfter: 45,    // s in a room before the "park here" markers fade in (a room's ice.hintAfter overrides it)
    stuckAfter: 30,   // s: earliest "Stuck? Hold ▼ to go back" bubble
    stuckLate: 4,     // s: ... and never before the markers have been up this long
    stuckShow: 6,     // s the stuck bubble stays up
    arrowAfter: 60,   // s in a room before the "who moves next" arrows (a room's ice.arrowAfter overrides it)
    boingT: 0.55,     // s: a head-on crash flies you both back to where your slides began
    walkBlock: 0.12,  // s: a snow walk (tap ◀/▶ on snow) ends after being blocked this long
    idleZzz: 20,      // s without any input -> "zzz" bubble (only while the partner is playing)
    introLock: 0.6,   // moves wait while the room card is up (G.introT above this)
    wobble: 0.25,     // s of wobble when you press something while sliding
  };
  const iceFont = (size, bold) => (bold ? '700 ' : '400 ') + size + 'px "Atkinson Hyperlegible", system-ui, sans-serif';

  // where a player stands: 'snow', 'ice' (any other ground, a shelf or a head) or null (in the air)
  function iceSurface(p) {
    if (!p.grounded) return null;
    const st = G.mst, cx = Math.floor((p.x + p.w / 2) / T), ty = Math.floor((p.y + p.h + 1) / T);
    if (p.tileGround && st.snow && st.snow.has(ty * COLS + cx) && Math.abs(p.y + p.h - ty * T) < 1) return 'snow';
    return 'ice';
  }
  function iceProbe(p) { const pr = probe(p); p.tileGround = pr.tile; p.onPartner = pr.partner; p.onOneWay = pr.oneway; p.grounded = pr.tile || pr.partner; }
  // centre the player on the tile under their middle (respects walls and the partner)
  function iceSnap(p) {
    const col = Math.floor((p.x + p.w / 2) / T), tx = col * T + (T - PW) / 2;
    if (Math.abs(tx - p.x) > 0.001) moveX(p, tx - p.x);
  }
  // a resting player always sits in the middle of a tile; if the partner is in the way it takes the next tile away from them
  // (maxStep: on snow you drift there gently instead of snapping)
  function iceSettle(p, maxStep) {
    const o = other(p), col = Math.floor((p.x + p.w / 2) / T);
    let tx = col * T + (T - PW) / 2;
    if (Math.abs(tx - p.x) <= 0.5) { p.x = tx; return; }
    if (o.alive && rectHit(o, tx, p.y, PW, PH)) tx += (p.x < o.x ? -T : T);
    moveX(p, maxStep ? clamp(tx - p.x, -maxStep, maxStep) : tx - p.x);
  }
  // is there room to slide that way (no wall, closed gate, own-colour post or partner right next to you)?
  function iceCanSlide(p, d) {
    const x0 = p.x, vx0 = p.vx, got = moveX(p, d * 10); p.x = x0; p.vx = vx0;
    return Math.abs(got) >= 9; // a resting player sits 4 px from a wall and 8 px from a partner, so < 9 px means blocked
  }
  // the guide table's key for where the two of you stand: the tile under each middle (row * COLS + col, 2 base-36 chars;
  // a head-stander's middle is in the tile above), Bo's + ROWS * COLS when you share a tile and Bo is to the right
  function iceGuideKey(a, b) {
    const cell = p => Math.floor((p.y + p.h / 2) / T) * COLS + Math.floor((p.x + p.w / 2) / T);
    const ca = cell(a), cb = cell(b) + (cell(a) === cell(b) && b.x > a.x ? ROWS * COLS : 0);
    return [ca, cb].map(i => (i < 36 ? '0' : '') + i.toString(36)).join('');
  }
  function iceOnPlate(p) { return G.level.plates.some(pl => rectHit(p, pl.x * T + 3, pl.y * T + 18, T - 6, 12)); }
  function iceHeldDir(p, s, dt) {
    const d = (p.input.right ? 1 : 0) - (p.input.left ? 1 : 0);
    if (!d || s.dirLock) { s.heldT = 0; return false; } // (a direction held through a respawn or a room change: let go first)
    s.heldT += dt;
    return s.heldT >= ICE.holdRepeat;
  }
  function iceRest(p, s) {
    s.heldT = 0;
    iceSnap(p); p.vx = 0; s.mode = iceSurface(p) === 'snow' ? 'free' : 'rest'; s.dir = 0; s.v = 0;
  }
  function iceStopSlide(p, s, why) {
    const st = G.mst, o = other(p), d = s.dir || s.lastDir || 0;
    iceProbe(p); s.heldT = 0;
    iceSnap(p); p.vx = 0; s.dir = 0; s.v = 0;
    s.mode = p.grounded ? (iceSurface(p) === 'snow' ? 'free' : 'rest') : 'hop';
    p.sx = 1.3; p.sy = 0.75;
    const fx = p.x + p.w / 2 + d * 12, fy = p.y + p.h - 6;
    if (why === 'partner') {
      st.stats.partnerStops[p.id]++;
      Sfx.play('iceBump', p.id); rumble(p.id, 0.3, 0.5, 90); rumble(o.id, 0.2, 0.3, 70);
      o.sx = 1.15; o.sy = 0.88;                                     // the parked partner feels the bump too
      burst(p.x + p.w / 2 + d * 11, p.y + p.h * 0.45, C.gold, 5);   // little stars between them
      st.cheerT = 1.2;                                              // the penguins cheer
    } else if (why === 'snow') {
      Sfx.play('iceSnow', p.id); puff(p.x + p.w / 2, p.y + p.h - 2, 7, 'rgba(255,255,255,0.95)');
    } else {
      Sfx.play('iceThunk', p.id); puff(fx, fy, 5, 'rgba(220,245,255,0.9)');
    }
  }
  function iceSplash(p) {
    if (!p.alive) return;
    const st = G.mst;
    G.falls++; st.stats.splashes[p.id]++;
    Sfx.play('splash', p.id); rumble(p.id, 0.6, 0.6, 200);
    burst(p.x + p.w / 2, p.y + p.h, '#9fe0ff', 16); burst(p.x + p.w / 2, p.y + p.h, 'rgba(255,255,255,0.95)', 8);
    st.ps[p.id].splashAt = { x: p.x + p.w / 2, y: Math.min(p.y + p.h, H - 40), t: 0.9 };
    p.alive = false; p.respawnT = ICE.respawn; p.vx = 0; p.vy = 0;
  }
  // a head-on crash (both sliding, towards each other): "Boing!" Both fly back to where their slides began (the respawn
  // machinery: out of play for boingT, then iceRespawnAt(false) at the last resting spot). The two slides still count.
  function iceBoing(p, o) {
    const st = G.mst, cx = (p.x + p.w / 2 + o.x + o.w / 2) / 2, cy = Math.min(p.y, o.y) + PH * 0.45;
    st.stats.boings++;
    Sfx.play('iceBoing', p.id); rumble(p.id, 0.4, 0.5, 120); rumble(o.id, 0.4, 0.5, 120);
    burst(cx, cy, C.gold, 8); burst(cx, cy, 'rgba(255,255,255,0.95)', 6);
    st.boingFx = { x: cx, y: cy - 22, t: 0.9 }; st.cheerT = 1.2;
    for (const q of [p, o]) {
      const s = st.ps[q.id], to = s.rest || G.level.spawns[q.id];
      s.boing = { x0: q.x, y0: q.y, x1: to.x, y1: to.y, t: 0, face: s.dir || q.face };
      s.mode = 'hop'; s.dir = 0; s.v = 0; s.walk = 0; s.trail.length = 0;
      q.alive = false; q.respawnT = ICE.boingT; q.vx = 0; q.vy = 0;
    }
  }
  // back to your start spot (toStart) or your last resting spot (a splash). Your start spot always wins: if your partner
  // stands on it (they can only be on the start pad), they are put on their own start spot first.
  function iceRespawnAt(p, toStart) {
    const st = G.mst, s = st.ps[p.id], o = other(p), sp = G.level.spawns;
    let at = toStart ? sp[p.id] : (s.rest || sp[p.id]);
    const walled = q => {
      for (let ty = Math.floor(q.y / T); ty <= Math.floor((q.y + PH - 0.01) / T); ty++)
        for (let tx = Math.floor(q.x / T); tx <= Math.floor((q.x + PW - 0.01) / T); tx++) if (solidFor(tile(tx, ty), p)) return true;
      return false;
    };
    if (!toStart && ((o.alive && rectHit(o, at.x, at.y, PW, PH)) || walled(at))) at = sp[p.id];
    if (o.alive && rectHit(o, at.x, at.y, PW, PH)) {
      const os = st.ps[o.id];
      burst(o.x + o.w / 2, o.y + o.h / 2, 'rgba(255,255,255,0.9)', 6);
      Object.assign(o, { x: sp[o.id].x, y: sp[o.id].y, vx: 0, vy: 0, grounded: false });
      os.mode = 'hop'; os.dir = 0; os.v = 0; os.trail.length = 0; os.walk = 0; os.heldT = 0; os.dirLock = true;
    }
    Object.assign(p, { x: at.x, y: at.y, vx: 0, vy: 0, alive: true, grounded: false, jumping: false, jumpBuf: 0, pendingJump: false,
      coyote: 0, dropT: 0, sx: 0.6, sy: 1.4, lastVy: 0, carryVx: 0, offT: 0, stun: 0 });
    s.mode = 'hop'; s.dir = 0; s.v = 0; s.qDir = 0; s.qDirT = 0; s.qJump = 0; s.heldT = 0; s.dropLock = true; s.trail.length = 0;
    s.dirLock = true; s.walk = 0; s.boing = null; // (a held ◀/▶ or ▼ must be let go first: no splash → slide → splash loop)
    burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(255,255,255,0.9)', 10);
  }
  // the key that means "down" for this player, for the hint bubbles
  function iceKey(id) {
    const touch = document.documentElement.classList.contains('has-touch') && Pads.kind === 'touch';
    const pad = Pads.kind === 'pad' && padFor(padSlots(), id);
    return pad ? 'stick ↓' : touch ? '▼' : id === 0 ? 'S' : '↓';
  }

  /* ---------- drawing helpers ---------- */
  function iceDrawPenguin(x, y, s, look, flap, blink) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.16)'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.ellipse(-4.5, -1, 4.2, 2, 0, 0, Math.PI * 2); ctx.ellipse(4.5, -1, 4.2, 2, 0, 0, Math.PI * 2); ctx.fill();
    const body = '#2d3157';
    for (const sd of [-1, 1]) { // flippers (up while cheering)
      ctx.save(); ctx.translate(sd * 8.5, -15); ctx.rotate(sd * (0.35 + flap * 1.1));
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 6, 3.2, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -14, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0.8 * look, -11, 6.6, 10, 0, 0, Math.PI * 2); ctx.fill();
    const ex = look * 2.2;
    if (blink) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - 6, -19.5); ctx.lineTo(ex - 2, -19.5); ctx.moveTo(ex + 2, -19.5); ctx.lineTo(ex + 6, -19.5); ctx.stroke(); }
    else {
      ctx.fillStyle = '#fff'; circle(ex - 3.8, -20, 2.8); ctx.fill(); circle(ex + 3.8, -20, 2.8); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex - 3.8 + look, -19.6, 1.5); ctx.fill(); circle(ex + 3.8 + look, -19.6, 1.5); ctx.fill();
    }
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(ex - 2.6, -16.5); ctx.lineTo(ex + 2.6, -16.5); ctx.lineTo(ex + look * 1.5, -12.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(ex - 6.5, -15, 1.8); ctx.fill(); circle(ex + 6.5, -15, 1.8); ctx.fill();
    ctx.restore();
  }
  // a far-away ice palace (one fill per colour, so overlapping parts don't double their alpha)
  function iceDrawPalace(cx, base, s) {
    ctx.save(); ctx.translate(cx, base); ctx.scale(s, s);
    const towers = [[-170, 44, 170], [170, 44, 170], [-78, 38, 205], [78, 38, 205], [0, 54, 262]];
    ctx.beginPath();
    ctx.rect(-150, -118, 300, 118);
    for (let i = -150; i < 150; i += 22) ctx.rect(i, -132, 13, 15);
    for (const [x, w, h] of towers) { ctx.rect(x - w / 2, -h, w, h); for (let i = 0; i < 3; i++) ctx.rect(x - w / 2 + i * (w - 9) / 2, -h - 9, 9, 10); }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
    ctx.beginPath();
    for (const [x, w, h] of towers) { ctx.moveTo(x - w / 2 - 5, -h - 9); ctx.lineTo(x + w / 2 + 5, -h - 9); ctx.lineTo(x, -h - 9 - w * 1.25); ctx.closePath(); }
    ctx.fillStyle = 'rgba(150,205,246,0.6)'; ctx.fill();
    ctx.beginPath();
    for (const [x, w, h] of towers) for (let k = 0; k < 2; k++) { const wy = -h + 26 + k * 46; if (wy > -30) continue; ctx.moveTo(x - 6, wy + 16); ctx.lineTo(x - 6, wy + 5); ctx.arc(x, wy + 5, 6, Math.PI, 0); ctx.lineTo(x + 6, wy + 16); ctx.closePath(); }
    ctx.moveTo(-26, 0); ctx.lineTo(-26, -48); ctx.arc(0, -48, 26, Math.PI, 0); ctx.lineTo(26, 0); ctx.closePath();
    ctx.fillStyle = 'rgba(110,172,228,0.35)'; ctx.fill();
    ctx.beginPath(); // flags on the tallest towers
    for (const [x, w, h] of [towers[0], towers[1], towers[4]]) { const top = -h - 9 - w * 1.25; ctx.rect(x - 1, top - 16, 2, 16); }
    ctx.fillStyle = 'rgba(80,120,180,0.5)'; ctx.fill();
    ctx.fillStyle = 'rgba(255,107,74,0.55)'; ctx.beginPath(); { const [x, w, h] = towers[4], top = -h - 9 - w * 1.25; ctx.moveTo(x + 1, top - 16); ctx.lineTo(x + 15 + Math.sin(G.clock * 4) * 2, top - 12); ctx.lineTo(x + 1, top - 8); } ctx.fill();
    ctx.fillStyle = 'rgba(91,149,255,0.55)'; ctx.beginPath();
    for (const [x, w, h] of [towers[0], towers[1]]) { const top = -h - 9 - w * 1.25; ctx.moveTo(x + 1, top - 16); ctx.lineTo(x + 13 + Math.sin(G.clock * 4 + x) * 2, top - 12); ctx.lineTo(x + 1, top - 8); }
    ctx.fill();
    ctx.restore();
  }
  // a speech bubble whose tail points down at (cx, by). str: a string, or [[text, colour], ...] segments.
  // bx: where the bubble's middle goes (default cx; the tail stays as close to cx as the bubble allows)
  function iceBubbleSize(str, size) {
    ctx.font = iceFont(size, true);
    const segs = typeof str === 'string' ? [[str, C.ink]] : str;
    return { segs, w: segs.reduce((a, sg) => a + ctx.measureText(sg[0]).width, 0) + size * 1.3, h: Math.round(size * 1.85) };
  }
  function iceBubble(cx, by, str, size, col, bx) {
    const { segs, w, h } = iceBubbleSize(str, size);
    const x = clamp((bx === undefined ? cx : bx) - w / 2, 4, W - 4 - w), y = by - h - 6;
    ctx.fillStyle = 'rgba(255,255,255,0.96)'; rr(x, y, w, h, h / 2); ctx.fill();
    const tx = clamp(cx, x + 12, x + w - 12);
    ctx.beginPath(); ctx.moveTo(tx - 6, y + h - 1); ctx.lineTo(tx + 6, y + h - 1); ctx.lineTo(tx, by); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col || 'rgba(28,26,54,0.25)'; ctx.lineWidth = 2; rr(x, y, w, h, h / 2); ctx.stroke();
    let lx = x + size * 0.65;
    for (const [t, c] of segs) { ctx.font = iceFont(size, true); const sw = ctx.measureText(t).width; text(t, lx, y + h / 2 + 0.5, size, c, 'left', 'body'); lx += sw; }
    return { x, y, w, h };
  }
  // the "who moves next" arrow: a fat arrow in the player's colour, a down arrow with a ring for "hold ▼"
  function iceDrawArrow(cx, cy, a, col, alpha) {
    const dir = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1], B: [0, 1] }[a];
    if (!dir) return;
    const bob = Math.sin(G.clock * 6) * 2.5;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx + dir[0] * bob, cy + dir[1] * bob);
    if (a === 'B') { ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; circle(0, 0, 15); ctx.stroke(); ctx.lineWidth = 2.5; ctx.strokeStyle = col; circle(0, 0, 15); ctx.stroke(); ctx.scale(0.72, 0.72); }
    ctx.rotate(Math.atan2(dir[1], dir[0]));
    ctx.beginPath(); // pointing right: shaft -11..1, head 1..13
    ctx.moveTo(-11, -4.5); ctx.lineTo(1, -4.5); ctx.lineTo(1, -10); ctx.lineTo(13, 0); ctx.lineTo(1, 10); ctx.lineTo(1, 4.5); ctx.lineTo(-11, 4.5); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.stroke();
    ctx.restore();
  }

  MODES.ice = {
    rand: Math.random,
    K: ICE,          // (tests read the numbers)
    keyName: iceKey, // (tests: the device's name for ▼)
    guideKey: iceGuideKey, // (tests/mkguide.js builds the ice.guide tables with it)
    setup(st, L) {
      st.stats = { slides: [0, 0], partnerStops: [0, 0], hops: [0, 0], drops: [0, 0], splashes: [0, 0], resets: [0, 0], boings: 0, roomMoves: [], roomTimes: [] };
      st.cheerT = 0;
      this.room(0, L);
    },
    room(k, L) {
      const st = G.mst;
      if (!st.stats) return;
      if (k > 0 && st.roomT !== undefined) { st.stats.roomMoves.push(st.moves); st.stats.roomTimes.push(st.roomT); }
      // snow: solid like rock (the engine doesn't know 'n'), grippy on top
      st.snow = new Set();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (L.grid[y][x] === 'n') { L.grid[y][x] = '#'; st.snow.add(y * COLS + x); }
      const cfg = L.def.ice || {};
      st.roomT = 0; st.moves = 0; st.par = cfg.par || 0;
      st.hintAfter = cfg.hintAfter === undefined ? ICE.hintAfter : cfg.hintAfter;
      st.stuckAt = Math.max(ICE.stuckAfter, st.hintAfter + ICE.stuckLate); // (the markers come first: the bubble mustn't hide them)
      st.hints = (cfg.hints || []).map(([c, r]) => ({ c, r, a: 0, used: false }));
      st.hintsOn = false; st.stuckT = 0; st.stuckDone = false; st.cheerT = 0; st.boingFx = null;
      // "who moves next": ice.guide = 5-char entries, 4 base-36 chars (Pip's cell, Bo's cell: row * COLS + col, 2 chars each)
      // and the move (l r u d b for Pip, L R U D B for Bo; b = hold ▼ to go back). Made by tests/mkguide.js on the real engine.
      st.arrowAt = cfg.arrowAfter === undefined ? ICE.arrowAfter : cfg.arrowAfter;
      st.guide = new Map();
      for (let i = 0; i + 5 <= (cfg.guide || '').length; i += 5) st.guide.set(cfg.guide.slice(i, i + 4), cfg.guide[i + 4]);
      st.guideNow = null; st.guideShow = null; st.guideA = 0; st.guideOn = false;
      st.pengs = (cfg.penguins || []).map(([x, y, s]) => ({ x, y, s: s || 1, blinkT: 1 + this.rand() * 3, blink: 0 }));
      // the open air of the room (the backdrop is clipped to it) and the icicles under ceilings
      const air = new Path2D(), icicles = [];
      const open = (x, y) => { const ch = L.grid[y][x]; return ch === '.' || !!L.sw[ch]; };
      for (let y = 0; y < ROWS; y++) {
        let x0 = -1;
        for (let x = 0; x <= COLS; x++) {
          const o = x < COLS && open(x, y);
          if (o && x0 < 0) x0 = x;
          if (!o && x0 >= 0) { air.rect(x0 * T, y * T, (x - x0) * T, T); x0 = -1; }
        }
      }
      const inDoor = (x, y) => L.door && x * T >= L.door.x && x * T < L.door.x + L.door.w && y * T >= L.door.y - T && y * T < L.door.y + L.door.h;
      for (let y = 0; y < ROWS - 1; y++) for (let x = 0; x < COLS; x++) {
        if (L.grid[y][x] !== '#' || st.snow.has(y * COLS + x) || L.grid[y + 1][x] !== '.' || inDoor(x, y + 1)) continue;
        if (L.plates.some(pl => pl.x === x && pl.y === y + 1)) continue;
        const h = hash(x, y + 7);
        icicles.push({ x: x * T + 6 + (h % 6), y: (y + 1) * T, len: 7 + (h % 7), w: 5 });
        if (h % 3) icicles.push({ x: x * T + 18 + ((h >> 3) % 6), y: (y + 1) * T, len: 5 + ((h >> 5) % 6), w: 4 });
      }
      st.air = air; st.icicles = icicles;
      st.ps = G.players.map(p => {
        iceProbe(p);
        // a direction or ▼ held into the room must be let go first (dirLock, dropLock; prev* = no fresh press)
        return { mode: iceSurface(p) === 'snow' ? 'free' : 'rest', dir: 0, v: 0, lastDir: 0, qDir: 0, qDirT: 0, qJump: 0, heldT: 0,
          prevL: true, prevR: true, prevD: true, downOk: false, dropLock: true, dirLock: true, resetT: 0, rest: { x: p.x, y: p.y },
          walk: 0, walkBlockT: 0, fin: { left: false, right: false, jump: false, down: false, up: false, act: false }, boing: null,
          idleT: 0, wobbleT: 0, wobbleSnd: 0, blockT: 0, slideT: 0, puffT: 0, trail: [], splashAt: null };
      });
    },
    step(dt) {
      const st = G.mst, L = G.level, ps = G.players;
      if (!st.ps) return;
      st.roomT += dt;
      const locked = G.introT > ICE.introLock; // the room card is up: moves wait (held keys must be let go or held on)

      // 1. input: fresh presses, the ▼-hold go-back
      for (const p of ps) {
        const s = st.ps[p.id], inp = p.input;
        s.qDirT -= dt; s.qJump -= dt; s.blockT -= dt; s.wobbleSnd -= dt;
        const freshL = inp.left && !s.prevL, freshR = inp.right && !s.prevR, freshD = inp.down && !s.prevD, freshJ = p.pendingJump;
        s.prevL = inp.left; s.prevR = inp.right;
        if (inp.left || inp.right || inp.down || inp.jump || inp.up) s.idleT = 0; else s.idleT += dt;
        if (!inp.down) s.dropLock = false;
        if (!inp.left && !inp.right) s.dirLock = false;
        if (locked) {
          s.prevD = inp.down; s.qDir = 0; s.qDirT = 0; s.qJump = 0; s.heldT = 0; s.downOk = false; s.resetT = 0; p.pendingJump = false; s.walk = 0;
          if (inp.left || inp.right) s.dirLock = true; // (pressed while the card is up: let go first)
          continue;
        }
        if (freshL) { s.qDir = -1; s.qDirT = ICE.buffer; }
        if (freshR) { s.qDir = 1; s.qDirT = ICE.buffer; }
        if (s.mode === 'free' && p.alive && (freshL || freshR)) { s.walk = freshR ? 1 : -1; s.walkBlockT = 0; } // snow: a tap walks you on
        if (freshJ && s.mode !== 'free') { s.qJump = ICE.buffer; p.pendingJump = false; }
        // pressing while sliding: "I heard you, but you're sliding!"
        if (s.mode === 'slide' && p.alive && (freshL || freshR || (freshJ && s.mode !== 'free'))) {
          s.wobbleT = ICE.wobble;
          if (s.wobbleSnd <= 0) { Sfx.play('iceWobble', p.id); s.wobbleSnd = 0.3; }
        }
        // go back: hold ▼ 1 s, standing still, not on a shelf (▼ drops you there) or a button; the press must start here
        const canHold = p.alive && p.grounded && (s.mode === 'rest' || (s.mode === 'free' && Math.abs(p.vx) < 1)) && !p.onOneWay
          && !p.onPartner && !iceOnPlate(p) && !inp.left && !inp.right; // (not on a head either: "get down" isn't "go home")
        if (freshD) s.downOk = canHold;
        if (!inp.down || !canHold) s.downOk = false;
        s.prevD = inp.down;
        if (s.downOk) {
          s.resetT += dt;
          if (s.resetT >= ICE.resetHold) {
            s.resetT = 0; s.downOk = false; st.stats.resets[p.id]++;
            Sfx.play('iceReset', p.id); rumble(p.id, 0, 0.3, 80);
            burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(255,255,255,0.9)', 10);
            iceRespawnAt(p, true);
          }
        } else s.resetT = 0;
      }

      // 2. buttons and gates (as in the engine's platformer tick)
      for (const pl of L.plates) {
        const was = pl.down;
        pl.down = ps.some(p => p.alive && rectHit(p, pl.x * T + 3, pl.y * T + 18, T - 6, 12));
        if (pl.down && !was) Sfx.play('press');
      }
      for (const sw of Object.values(L.sw)) {
        const want = L.plates.some(pl => pl.letter === sw.plate && pl.down);
        if (want !== sw.on) {
          const blocked = sw.tiles.some(t => ps.some(p => p.alive && rectHit(p, t.x * T, t.y * T, T, T)));
          if (!blocked) { sw.on = want; Sfx.play(want ? 'open' : 'close'); }
        }
        sw.anim = approach(sw.anim, sw.on ? 1 : 0, dt * 7);
      }

      // 3. intents
      for (const p of ps) {
        const s = st.ps[p.id];
        if (!p.alive) { p.respawnT -= dt; if (p.respawnT <= 0) iceRespawnAt(p, false); continue; }
        if (s.mode === 'free') {
          // snow: the normal platformer controls, except that a tap of ◀/▶ keeps you walking (s.walk) until you are on the ice,
          // blocked or press the other way, and a direction held through a respawn or into the room does nothing (dirLock)
          const inp = p.input, f = s.fin;
          f.left = !locked && (s.walk ? s.walk < 0 : inp.left && !s.dirLock);
          f.right = !locked && (s.walk ? s.walk > 0 : inp.right && !s.dirLock);
          f.jump = !locked && inp.jump; f.down = !locked && inp.down; f.up = !locked && inp.up; f.act = false;
          p.input = f;
          try { control(p, dt); } finally { p.input = inp; }
          continue;
        }
        s.walk = 0;
        p.dropT -= dt; p.offT -= dt; p.stun = 0;
        if (s.mode === 'rest' && !locked) {
          p.vx = 0;
          if (!p.grounded) s.mode = 'hop';
          else {
            const q = s.qDir && s.qDirT > 0;
            if (q || iceHeldDir(p, s, dt)) {
              const d = q ? s.qDir : (p.input.right ? 1 : -1);
              if (!iceCanSlide(p, d)) {
                // pushing into something right next to you: nothing happens, no sound (a fresh press stays queued for its
                // buffer, so pushing together with a partner who is just leaving still works); you just look that way
                s.heldT = 0; p.face = d;
                if (s.blockT <= 0) { s.blockT = 0.35; p.sx = 0.9; p.sy = 1.06; }
              } else {
                s.qDir = 0; s.qDirT = 0; s.heldT = 0;
                s.mode = 'slide'; s.dir = s.lastDir = d; s.v = ICE.startV; s.slideT = 0; p.face = d;
                st.stats.slides[p.id]++; st.moves++;
                Sfx.play('iceGo', p.id); p.sx = 0.85; p.sy = 1.12;
                puff(p.x + p.w / 2 - d * 10, p.y + p.h - 3, 4, 'rgba(230,248,255,0.9)');
              }
            } else if (s.qJump > 0) {
              s.qJump = 0; s.mode = 'hop'; st.stats.hops[p.id]++; st.moves++;
              jump(p, ICE.hopV); p.jumping = false; // full height: no jump-cut on ice
            } else if (p.input.down && !s.dropLock && p.onOneWay && !p.onPartner) {
              s.mode = 'hop'; p.dropT = 0.2; p.grounded = false; st.stats.drops[p.id]++; st.moves++;
              Sfx.play('iceDrop', p.id); puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(230,248,255,0.9)');
            }
          }
        }
        if (s.mode === 'slide') { s.v = Math.min(ICE.slideV, s.v + ICE.slideAcc * dt); p.vx = s.dir * s.v; }
        else p.vx = 0;
        p.vy = Math.min(p.vy + PHYS.g * dt, PHYS.maxFall);
      }
      separate();

      // 4. sideways: whoever is in front (in their direction of travel) moves first, so two sliding together are a train
      const order = ps.slice().sort((a, b) => {
        const da = Math.sign(a.vx), db = Math.sign(b.vx);
        return da && da === db ? (da > 0 ? b.x - a.x : a.x - b.x) : 0;
      });
      for (const p of order) {
        if (!p.alive || !p.vx) continue;
        const s = st.ps[p.id], want = p.vx * dt, got = moveX(p, want);
        if (s.mode === 'slide' && Math.abs(got - want) > 0.001) {
          const o = other(p), os = st.ps[o.id];
          const byPartner = o.alive && Math.abs(s.dir > 0 ? o.x - (p.x + p.w) : p.x - (o.x + o.w)) < 0.5 && p.y < o.y + o.h && p.y + p.h > o.y;
          const partnerSlides = byPartner && os.mode === 'slide';
          // caught up with a partner sliding the same way: a train (you stop behind them when they stop). Head-on: boing!
          // Either way where you end up doesn't depend on timing: it is where a standing partner would have stopped you.
          if (partnerSlides && os.dir === s.dir) { /* the one in front sets the pace */ }
          else if (partnerSlides && os.dir === -s.dir) iceBoing(p, o);
          else iceStopSlide(p, s, byPartner ? 'partner' : 'wall');
        } else if (s.mode === 'free') {
          if (Math.abs(got - want) > 0.001) { p.vx = 0; if (s.walk && (s.walkBlockT += dt) >= ICE.walkBlock) s.walk = 0; }
          else s.walkBlockT = 0;
        }
      }
      // 5. vertical: the higher player first
      const [up, lo] = ps[1].y < ps[0].y ? [ps[1], ps[0]] : [ps[0], ps[1]];
      for (const p of [up, lo]) {
        if (!p.alive) continue;
        const vy0 = p.vy;
        moveY(p, p.vy * dt);
        if (vy0 < -120 && p.vy === 0 && st.ps[p.id].mode === 'hop') { // bonked a ceiling: back down where you were
          Sfx.play('bonk', p.id); puff(p.x + p.w / 2, p.y, 3, 'rgba(255,255,255,0.85)');
        }
      }

      // 6. after moving
      for (const p of ps) {
        if (!p.alive) continue;
        const s = st.ps[p.id];
        postStep(p); // grounded flags, landing puff/sound, falling off the bottom
        if (!p.alive) continue;
        const surf = iceSurface(p);
        if (s.mode === 'slide') {
          s.slideT += dt;
          if (surf === 'snow') iceStopSlide(p, s, 'snow');
        } else if (s.mode === 'hop') {
          if (p.grounded && p.vy >= 0) iceRest(p, s);
        } else if (s.mode === 'free' && p.grounded && surf === 'ice') {
          if (Math.abs(p.vx) >= ICE.walkOn) { // walked (or jumped) off the snow onto ice: off you go
            s.mode = 'slide'; s.dir = s.lastDir = Math.sign(p.vx); s.v = Math.max(Math.abs(p.vx), ICE.startV); s.slideT = 0; p.face = s.dir;
            s.qDir = 0; s.heldT = 0; st.stats.slides[p.id]++; st.moves++; Sfx.play('iceGo', p.id);
          } else iceRest(p, s);
        }
        if (s.mode === 'rest') { iceSettle(p); if (iceSurface(p) === 'snow') s.mode = 'free'; } // (settled back onto the snow: walk)
        // standing still on snow: drift to the middle of your tile too (so the start pad has tidy spots, like the ice)
        else if (s.mode === 'free' && p.grounded && surf === 'snow' && Math.abs(p.vx) < 1 && !s.walk && !p.input.left && !p.input.right) iceSettle(p, 90 * dt);
        if (s.mode === 'rest' || (s.mode === 'free' && p.grounded && surf === 'snow' && Math.abs(p.vx) < 1)) s.rest = { x: p.x, y: p.y };
        // icy water
        const tx1 = Math.floor(p.x / T), tx2 = Math.floor((p.x + p.w) / T), ty1 = Math.floor(p.y / T), ty2 = Math.floor((p.y + p.h) / T);
        for (let ty = ty1; ty <= ty2 && p.alive; ty++) for (let tx = tx1; tx <= tx2; tx++) {
          if (tile(tx, ty) === 'w' && rectHit(p, tx * T + 2, ty * T + 10, T - 4, T - 10)) { iceSplash(p); break; }
        }
        if (!p.alive) continue;
        // speed trail and little snow puffs at the feet
        if (s.mode === 'slide') {
          if ((G.tickN & 3) === 0) { s.trail.push([p.x + p.w / 2 - s.dir * 8, p.y + p.h - 5]); if (s.trail.length > 6) s.trail.shift(); }
          if (p.grounded && (s.puffT -= dt) <= 0) { s.puffT = 0.06; puff(p.x + p.w / 2 - s.dir * 9, p.y + p.h - 1, 1, 'rgba(255,255,255,0.85)'); }
        } else if (s.trail.length && (G.tickN & 1) === 0) s.trail.shift();
      }

      // 7. door (as in the engine)
      if (L.door) {
        const d = L.door;
        G.doorIn = ps.map(p => { if (!p.alive) return false; const cx = p.x + p.w / 2, cy = p.y + p.h / 2; return cx > d.x + 2 && cx < d.x + d.w - 2 && cy > d.y && cy < d.y + d.h; });
        if (G.doorIn[0] && G.doorIn[1]) {
          G.doorHold += dt;
          if (G.doorHold >= ICE.doorHold) {
            if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return; }
            st.stats.roomMoves.push(st.moves); st.stats.roomTimes.push(st.roomT); st.roomT = undefined;
            levelClear();
            return;
          }
        } else G.doorHold = 0;
      }

      // 8. hints and cosmetics
      if (!st.hintsOn && st.roomT >= st.hintAfter && st.hints.length) {
        st.hintsOn = true;
        if (st.hintAfter > 0 && st.hints.some(h => !h.used)) Sfx.play('iceHint');
      }
      for (const h of st.hints) {
        if (!h.used && ps.some((p, k) => p.alive && p.grounded && st.ps[k].mode === 'rest'
          && Math.floor((p.x + p.w / 2) / T) === h.c && Math.floor((p.y + p.h - 1) / T) === h.r)) h.used = true;
        h.a = h.used ? Math.max(0, h.a - dt / 0.5) : st.hintsOn ? Math.min(1, h.a + dt) : 0;
      }
      if (!st.stuckDone && st.roomT >= st.stuckAt && !st.guideOn) { st.stuckDone = true; st.stuckT = ICE.stuckShow; }
      if (st.guideOn) st.stuckT = Math.min(st.stuckT, 0.3); // (the arrows say more: the bubble fades)
      if (st.stuckT > 0) st.stuckT -= dt;
      if (st.cheerT > 0) st.cheerT -= dt;
      if (st.boingFx && (st.boingFx.t -= dt) <= 0) st.boingFx = null;
      for (const p of ps) {
        const s = st.ps[p.id];
        if (s.wobbleT > 0) { s.wobbleT -= dt; p.sx = 1 + 0.08 * Math.sin(st.roomT * 40); }
        if (s.splashAt) { s.splashAt.t -= dt; if (s.splashAt.t <= 0) s.splashAt = null; }
        if (s.boing) s.boing.t += dt;
      }
      // "who moves next" arrows, once the room has taken a while: only while both of you stand still
      st.guideNow = null;
      if (st.roomT >= st.arrowAt && st.guide.size && G.introT <= 0 && ps.every((p, k) => p.alive && p.grounded
        && (st.ps[k].mode === 'rest' || (st.ps[k].mode === 'free' && Math.abs(p.vx) < 1)))) {
        const a = st.guide.get(iceGuideKey(ps[0], ps[1]));
        if (a) {
          st.guideNow = { id: a === a.toUpperCase() ? 1 : 0, a: a.toUpperCase() };
          if (!st.guideOn) { st.guideOn = true; Sfx.play('iceHint'); }
        }
      }
      if (st.guideNow) { st.guideShow = st.guideNow; st.guideA = Math.min(1, st.guideA + dt * 4); }
      else st.guideA = Math.max(0, st.guideA - dt * 6);
      for (const g of st.pengs) { g.blinkT -= dt; g.blink -= dt; if (g.blinkT <= 0) { g.blink = 0.14; g.blinkT = 2 + this.rand() * 3.5; } }
    },
    draw() {
      const st = G.mst, L = G.level;
      if (!st.ps || !st.air) return;
      const cfg = L.def.ice || {};
      // backdrop in the open air of the room: a far ice palace and falling snow
      ctx.save(); ctx.clip(st.air);
      if (cfg.palace) iceDrawPalace(cfg.palace[0], cfg.palace[1], cfg.palace[2] || 1);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 26; i++) {
        const sp = 14 + (i % 5) * 5, x = (i * 151 + Math.sin(G.clock * 0.7 + i) * 18 + 2000) % W, y = (i * 83 + G.clock * sp) % (H + 20) - 10;
        circle(x, y, 1.2 + (i % 3) * 0.6); ctx.fill();
      }
      ctx.restore();
      // the open air also covered the gates, buttons and door the engine drew: draw them again
      for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) { const ch = L.grid[ty][tx]; if (L.sw[ch]) drawSwitchTile(ch, tx * T, ty * T); }
      if (L.door) drawDoor(L.door);
      for (const pl of L.plates) drawPlate(pl); // (after the door: the door's own button shows on top of it)
      for (const sg of cfg.signs || []) {
        ctx.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(sg.text, sg.x + 1, sg.y + 1.5);
        ctx.fillStyle = 'rgba(28,26,54,0.62)'; ctx.fillText(sg.text, sg.x, sg.y);
      }
      // caps: flat & shiny = ice (slippery), bumpy & white = snow (grippy)
      for (let ty = 1; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
        const ch = L.grid[ty][tx], x = tx * T, y = ty * T, up = tile(tx, ty - 1);
        if (ch === '#' && !'#sw'.includes(up)) {
          if (st.snow.has(ty * COLS + tx)) {
            ctx.fillStyle = '#dfe9f3'; ctx.fillRect(x, y, T, 10);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, T, 6);
            for (let i = 0; i < 3; i++) { circle(x + 5 + i * 10, y + 4, 4.5); ctx.fill(); }
            ctx.fillStyle = 'rgba(160,190,225,0.5)'; circle(x + 9, y + 8, 1.3); ctx.fill(); circle(x + 21, y + 7, 1.3); ctx.fill();
          } else {
            ctx.fillStyle = '#7cc7ec'; ctx.fillRect(x, y, T, 10);
            ctx.fillStyle = '#c9f0ff'; ctx.fillRect(x, y, T, 6);
            ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x + ((tx * 7) % 12) + 2, y + 1.5, 9, 2);
            const h = hash(tx, ty);
            if (h % 5 === 0) { // a twinkle now and then
              const a = Math.max(0, Math.sin(G.clock * 1.7 + (h % 97)));
              if (a > 0.6) {
                const sx = x + 6 + (h % 18), r = 3.5 * (a - 0.6) / 0.4 + 0.5;
                ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.4; ctx.beginPath();
                ctx.moveTo(sx - r, y + 3); ctx.lineTo(sx + r, y + 3); ctx.moveTo(sx, y + 3 - r); ctx.lineTo(sx, y + 3 + r); ctx.stroke();
              }
            }
          }
        } else if (ch === '=') {
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, y, T, 2);
          ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + ((tx * 11) % 14) + 3, y + 3, 8, 1.5);
        } else if ((ch === 'o' || ch === 'u') && !'ou#'.includes(up)) { // colour posts wear a snow cap
          ctx.fillStyle = '#ffffff'; rr(x - 1, y - 3, T + 2, 7, 3.5); ctx.fill();
          circle(x + 7, y - 2, 4); ctx.fill(); circle(x + 18, y - 3, 4.5); ctx.fill();
          ctx.fillStyle = 'rgba(160,190,225,0.6)'; ctx.fillRect(x + 1, y + 3, T - 2, 1.5);
        }
      }
      // icicles under the ceilings
      ctx.fillStyle = 'rgba(214,240,255,0.95)';
      ctx.beginPath();
      for (const ic of st.icicles) { ctx.moveTo(ic.x - ic.w / 2, ic.y); ctx.lineTo(ic.x + ic.w / 2, ic.y); ctx.lineTo(ic.x, ic.y + ic.len); ctx.closePath(); }
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath();
      for (const ic of st.icicles) { ctx.moveTo(ic.x - ic.w / 2 + 0.5, ic.y); ctx.lineTo(ic.x - 0.3, ic.y); ctx.lineTo(ic.x - 0.4, ic.y + ic.len * 0.6); ctx.closePath(); }
      ctx.fill();
      // ice floes bobbing on the water, penguins watching
      for (const [fx, fy] of cfg.floes || []) {
        const bob = Math.sin(G.clock * 2 + fx * 0.05) * 1.4;
        ctx.fillStyle = 'rgba(28,26,54,0.12)'; ctx.beginPath(); ctx.ellipse(fx, fy + 4 + bob, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f4fbff'; rr(fx - 15, fy - 3 + bob, 30, 7, 3); ctx.fill();
        ctx.fillStyle = '#bfe6fb'; ctx.fillRect(fx - 13, fy + 2 + bob, 26, 2);
      }
      const cheer = st.cheerT > 0 ? Math.abs(Math.sin(st.cheerT * 9)) : 0;
      for (const g of st.pengs) {
        const near = G.players.reduce((a, p) => (Math.abs(p.x - g.x) < Math.abs(a.x - g.x) ? p : a), G.players[0]);
        const look = clamp((near.x + near.w / 2 - g.x) / 60, -1, 1);
        const bob = g.y > 440 ? Math.sin(G.clock * 2 + g.x * 0.05) * 1.4 - 3 : 0; // on a floe
        iceDrawPenguin(g.x, g.y + bob - cheer * 3, g.s, look, cheer, g.blink > 0);
      }
      // "park here" markers
      for (const h of st.hints) {
        if (h.a <= 0.01) continue;
        // neutral on purpose (either of you can park there): a white box with a dark dashed edge, slowly pulsing
        const x = h.c * T, y = h.r * T, pulse = 0.75 + 0.25 * Math.sin(G.clock * 3);
        ctx.globalAlpha = h.a * 0.55 * pulse; ctx.fillStyle = '#ffffff'; rr(x + 3, y + 2, 24, 26, 6); ctx.fill();
        ctx.globalAlpha = h.a * 0.7 * pulse; ctx.strokeStyle = 'rgba(28,26,54,0.75)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -G.clock * 6; rr(x + 3, y + 2, 24, 26, 6); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      // speed trails
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (const p of G.players) {
        const s = st.ps[p.id];
        if (!p.alive || s.trail.length < 2) continue;
        const tr = s.trail.concat([[p.x + p.w / 2 - (s.dir || s.lastDir) * 8, p.y + p.h - 5]]);
        for (let i = 1; i < tr.length; i++) {
          ctx.globalAlpha = i / tr.length * 0.9;
          ctx.beginPath(); ctx.moveTo(tr[i - 1][0], tr[i - 1][1]); ctx.lineTo(tr[i][0], tr[i][1]); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tr[i - 1][0], tr[i - 1][1] - 9); ctx.lineTo(tr[i][0], tr[i][1] - 9); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // boing: both fly back (dizzy) in a little arc to where their slides began
      for (const p of G.players) {
        const b = st.ps[p.id].boing;
        if (!b || p.alive) continue;
        const k = clamp(b.t / ICE.boingT, 0, 1), e = 1 - (1 - k) * (1 - k);
        const lift = Math.min(70, 18 + Math.hypot(b.x1 - b.x0, b.y1 - b.y0) * 0.12);
        const x = b.x0 + (b.x1 - b.x0) * e, y = b.y0 + (b.y1 - b.y0) * e - lift * 4 * k * (1 - k);
        ctx.save();
        if (!reduceMotion) { const cx = x + PW / 2, cy = y + PH / 2; ctx.translate(cx, cy); ctx.rotate(-b.face * Math.sin(k * Math.PI) * 0.6); ctx.translate(-cx, -cy); }
        drawPlayer(Object.assign({}, p, { alive: true, x, y, sx: 1, sy: 1, vy: 0, stun: 1, blink: 0, stompSafe: 0, face: b.face }));
        ctx.restore();
      }
    },
    drawTop() {
      const st = G.mst;
      if (!st.ps) return;
      const big = hudBig(), fs = big ? 18 : 13;
      // the go-back ring (World 5: the same ring in Rising Lava)
      for (const p of G.players) {
        const s = st.ps[p.id];
        if (!p.alive || !(s.resetT >= ICE.resetShow)) continue;
        const f = clamp(s.resetT / ICE.resetHold, 0, 1), cx = p.x + p.w / 2, cy = p.y - 16;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; circle(cx, cy, 9); ctx.stroke();
        ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.strokeStyle = PCOL[p.id];
        ctx.beginPath(); ctx.arc(cx, cy, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
        text('↓', cx, cy + 0.5, 10, C.ink, 'center', 'body');
      }
      // a splash ring on the water
      for (const p of G.players) {
        const sa = st.ps[p.id].splashAt;
        if (!sa) continue;
        const k = 1 - sa.t / 0.9;
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sa.x, sa.y - 2, 8 + k * 26, 3 + k * 6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // "Boing!" over a head-on crash
      if (st.boingFx) {
        const f = st.boingFx, k = 1 - f.t / 0.9, size = Math.round(22 + 6 * Math.sin(Math.min(1, k * 4) * Math.PI));
        ctx.globalAlpha = clamp(f.t / 0.3, 0, 1);
        ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.strokeText('Boing!', f.x, f.y - k * 20);
        ctx.fillStyle = C.gold; ctx.fillText('Boing!', f.x, f.y - k * 20);
        ctx.globalAlpha = 1;
      }
      if (G.introT > 0 || G.mode !== 'play') return;
      // bubbles: "Stuck? Hold S to go back" once per room, "zzz" over someone who hasn't played for a while
      const boxes = [], tops = G.players.map(p => p.y - (st.ps[p.id].resetT >= ICE.resetShow ? 30 : 10));
      const L = G.level;
      // a bubble keeps clear of the park markers, the buttons and the other bubble (it slides sideways if it can)
      const covers = (x, y, w, h) => st.hints.some(q => !q.used && x < q.c * T + T && x + w > q.c * T && y < q.r * T + T && y + h > q.r * T)
        || L.plates.some(pl => x < pl.x * T + T && x + w > pl.x * T && y < pl.y * T + T && y + h > pl.y * T + 12)
        || boxes.some(bx => x < bx.x + bx.w + 4 && x + w + 4 > bx.x && y < bx.y + bx.h + 4 && y + h + 4 > bx.y);
      const place = (px, by, segs, col) => {
        const { w, h } = iceBubbleSize(segs, fs);
        let at = px;
        for (const dx of [0, 0.6, -0.6, 1.1, -1.1]) {
          const bx = px + dx * w, x = clamp(bx - w / 2, 4, W - 4 - w);
          if (!covers(x, by - h - 6, w, h)) { at = bx; break; }
        }
        boxes.push(iceBubble(px, by, segs, fs, col, at));
      };
      if (st.stuckT > 0) {
        ctx.globalAlpha = clamp(st.stuckT / 0.4, 0, 1) * clamp((ICE.stuckShow - st.stuckT) / 0.3, 0, 1);
        const keys = [0, 1].map(iceKey), [a, b2] = G.players, cx = p => p.x + p.w / 2;
        const one = k => [['Stuck? Hold ', C.ink], [keys[k], PDARK[k]], [' to go back', C.ink]];
        const ws = [0, 1].map(k => iceBubbleSize(one(k), fs).w);
        const solo = cpuSolo(); // (1-player mode: only the person's key; the computer goes back by itself)
        const close = !solo && a.alive && b2.alive && Math.abs(cx(a) - cx(b2)) < (ws[0] + ws[1]) / 2 + 4 && Math.abs(tops[0] - tops[1]) < fs * 2.4;
        if (close) { // side by side: one bubble for the two of you (never two stacked up into the room)
          place((cx(a) + cx(b2)) / 2, Math.min(tops[0], tops[1]), keys[0] === keys[1] ? [['Stuck? Hold ' + keys[0] + ' to go back', C.ink]]
            : [['Stuck? Hold ', C.ink], [keys[0], PDARK[0]], [' / ', C.ink], [keys[1], PDARK[1]], [' to go back', C.ink]]);
        } else for (const p of G.players) if (p.alive && !(solo && cpuOn(p.id))) place(cx(p), tops[p.id], one(p.id), PCOL[p.id]);
        ctx.globalAlpha = 1;
      }
      // who moves next (after ice.arrowAfter s in the room)
      const gs = st.guideShow, arrowFor = gs && st.guideA > 0.01 ? gs.id : -1;
      if (arrowFor >= 0 && G.players[arrowFor].alive) {
        const p = G.players[arrowFor];
        iceDrawArrow(p.x + p.w / 2, tops[arrowFor] - (gs.a === 'B' ? 22 : 16), gs.a, PCOL[arrowFor], st.guideA);
      }
      for (const p of G.players) {
        const s = st.ps[p.id], o = st.ps[1 - p.id];
        if (!p.alive || st.stuckT > 0 || p.id === arrowFor || (cpuSolo() && cpuOn(p.id))) continue; // (1-player: no zzz over the computer waiting for you)
        const by = tops[p.id];
        if (s.idleT >= ICE.idleZzz && o.idleT < 8) {
          const bob = Math.sin(G.clock * 2.5) * 2;
          ctx.globalAlpha = clamp((s.idleT - ICE.idleZzz) / 0.5, 0, 1);
          iceBubble(p.x + p.w / 2, by + bob, 'zzz', big ? 16 : 12);
          ctx.globalAlpha = 1;
        }
      }
    },
    hud() {
      const st = G.mst;
      if (!st.ps || !st.par) return;
      // "Moves 3 · par 4" (gold while you're within par): a count and a target, never a limit. The size of the engine's pills.
      const neat = st.moves <= st.par;
      const str = `Moves ${st.moves} · par ${st.par}`;
      ctx.font = iceFont(13, true);
      const w = ctx.measureText(str).width + 40, h = 26, y = 46;
      const px = pill(W - 14, y, w, h, 'right');
      // a little snowflake
      const cx = px + 15, cy = y + h / 2;
      ctx.strokeStyle = neat ? C.gold : '#bfe9ff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(cx - Math.cos(a) * 6, cy - Math.sin(a) * 6); ctx.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); }
      ctx.stroke();
      text(str, px + 27, cy + 0.5, 13, neat ? C.gold : C.paper, 'left', 'body');
    },
    stats() {
      const s = G.mst.stats;
      if (!s) return [];
      const rooms = LEVELS[G.levelIndex].rooms || [];
      const neat = s.roomMoves.filter((m, i) => rooms[i] && rooms[i].ice && m <= rooms[i].ice.par).length;
      const bumps = s.partnerStops[0] + s.partnerStops[1];
      const out = [
        { label: 'Slides', values: s.slides.slice() },
        { label: 'Partner stops', values: s.partnerStops.slice() },
        { label: 'Neat rooms', value: neat + ' of ' + rooms.length },
      ];
      out.push(neat === rooms.length ? 'Every room in the fewest moves. Ice pros!'
        : 'Bumped into each other ' + bumps + (bumps === 1 ? ' time' : ' times') + '. Nice parking!');
      return out;
    },
  };
  Sfx.extra.iceGo = function (pitch) { this.tone(520 * pitch, 0.16, 'triangle', 0.035, 900 * pitch); };
  Sfx.extra.iceThunk = function () { this.tone(150, 0.08, 'triangle', 0.07, 80); this.tone(900, 0.03, 'square', 0.02, 600); };
  Sfx.extra.iceBump = function (pitch) { this.tone(260 * pitch, 0.09, 'square', 0.04, 180 * pitch); this.tone(660, 0.08, 'triangle', 0.04, 990, 0.04); };
  Sfx.extra.iceSnow = function () { this.tone(200, 0.12, 'sine', 0.06, 120); };
  Sfx.extra.iceDrop = function (pitch) { this.tone(700 * pitch, 0.14, 'triangle', 0.04, 300 * pitch); };
  Sfx.extra.iceReset = function (pitch) { [880, 660, 440].forEach((f, i) => this.tone(f * pitch, 0.08, 'triangle', 0.04, null, i * 0.05)); };
  Sfx.extra.iceWobble = function (pitch) { this.tone(900 * pitch, 0.05, 'sine', 0.025, 1300 * pitch); };
  Sfx.extra.iceBoing = function (pitch) { this.tone(170 * pitch, 0.2, 'square', 0.03, 430 * pitch); this.tone(430 * pitch, 0.22, 'sine', 0.06, 210 * pitch, 0.09); };
  Sfx.extra.iceHint = function () { [1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.03, null, i * 0.09)); };
}

