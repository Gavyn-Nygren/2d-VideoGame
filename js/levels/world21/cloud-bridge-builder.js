/* Pip & Bo - Level 21-3 Cloud Bridge Builder (team, World 21 Sky Kingdom). */
'use strict';

/* ===== 21-3 Cloud Bridge Builder (mode 'cloudbridge', team) — Gavyn's pick =====
   "One squeezes a cloud machine to puff out bridges, the other walks ahead and calls where to make them. Cloud bridges
   melt after a few seconds, so keep moving."
   Side view of floating sky islands with wide gaps between them; the scene scrolls rightward. The mode owns the tick,
   the camera, the picture and the HUD (def.ownStep + def.ownHUD + def.noFalls; the engine grid is only the two spawns).
   Pip and Bo walk and jump with the engine's own platformer control(), in WORLD coordinates (x along the stretch, y on
   screen; the camera only scrolls sideways). Between steps p.x is on screen (world x - camX), so the engine draws them,
   their name tags and the computer's bubbles in the right place; particles made during the step are moved the same way.
   Partners pass through each other (no head boosts). Every gap is wider than any jump (192 px or more; a running jump
   goes about 145 px), so only clouds get you over.
   - THE CALLER (one job per stretch) walks ahead and calls where a cloud should go: standing near the edge of the island
     or cloud they are on, a tap of the action ('call') plants a bobbing "here!" flag ping on the spot right in front of
     them (one block, 64 px wide, flush with the edge, the way they face). The spot's height is smart: it steps up or
     down (at most 40 px a block) toward the next island ahead, so stairs build themselves. Hold the action instead to
     aim: a ghost block shows, ▲ / ▼ move it a step higher or lower (jumping waits while aiming), let go to plant.
     At most 2 flags wait at once (a 3rd replaces the oldest). The caller can never make a cloud.
   - THE BUILDER carries the cloud machine (a little bellows on a box with a funnel). A press of the action ('puff')
     squeezes it: a cloud puff flies through the air to the OLDEST waiting flag within reach (300 px from the funnel),
     and a cloud block appears there. Holding the action keeps squeezing (every 0.45 s). Out of reach: "Too far!" and a
     dashed line to the flag; no flag: a little "pfft". The builder can never place a cloud without a flag, so neither
     player can cross a gap alone.
   - CLOUD BLOCKS are one-way platforms (land on them from above; walk off their ends), solid for both players. A block
     melts 6 s after it forms (sun rays: 1.8x faster): it wobbles for the last 1.6 s, thins, then pops. Walking into a
     block or island up to 46 px higher hops up onto it by itself (an auto-step), so cloud stairs just work.
   - Both players must cross every gap. Normally the builder follows right behind the caller over the fresh bridge; if
     the bridge melts first (or the builder takes a Boing), the caller turns round on the far island and calls clouds
     back toward the builder (flags go in front of whichever way the caller faces).
   - Falls are soft: below the islands a fluffy safety cloud catches you and bounces you back ("Boing!") to the last
     island you stood on, after about 1.7 s. Counted as Boings, never a game over.
   - Flavour per stretch (def.roomWord 'Stretch', 4 stretches, the caller swaps every stretch: Pip calls 1 and 3):
     First Puffs (plain gaps and a star), Stairway Up (cloud stairs up and down and a rainbow spring that boings you up
     to a high island), Windy Gap (gusts: while the windsock is up, a puff flying through the gap is blown away, so the
     builder puffs in the calm; a warning comes 1 s before each gust), Sunny Melt to the Cloud Castle (sun rays melt
     clouds faster, and a cloud lift: an island on a cloud pillar that rises while someone stands on it and sinks when
     it's empty). A stretch ends when both stand on the island with the flag; the last one ends at the Cloud Castle.
   - Stars (optional, one per stretch) float high over the middle of a gap: only reachable by jumping from a cloud
     that was aimed one step higher than the smart height.
   - Gold help, always announced: 2 Boings at the same gap make that gap's clouds GOLD (they last 18 s); 3 puffs blown
     away at one gap make that gap's puffs gold too (gold puffs ignore the wind); 32 s spent on one gap (both playing)
     makes it gold as well. 25 s without progress: a gold hint line for whoever is stuck.
   - Leash: on the ground you can't get more than 700 px ahead of your partner ("Wait for Bo!").
   Medal (MODES.cloudbridge.medals, js/medals.js): Gold at <= 3:30 with <= 3 Boings, Silver at <= 5:30 with <= 10, else
   Bronze. Results: Boings, clouds puffed and clouds called per player, stars and gold help.
   Room def: { title, caller: 0|1, look, tip, news, act, course: [items] }, items in order left to right:
     ['isle', len, top, { signs: [[dx, text]], spring: dx, flag, castle }]   an island (top = its surface y)
     ['gap', width, { wind: phaseSeconds, sun: true, star: true }]           a gap to bridge
     ['lift', len, highTop]   a cloud lift right after the previous island (its low stop is that island's height)
   Signs are [dx, text, cpuText]: text may use {C} / {B} (the caller's / builder's name) and {Ca} {Cu} {Ba} (the caller's
   action and ▲ keys, the builder's action key, for that player's keyboard, controller or touch); cpuText (optional)
   shows instead when the player whose keys it names is the computer.
   MODES.cloudbridge exposes the helpers the computer brain reads (spot, chain, wind, ranges); state lives in G.mst.
   Every top-level name starts with cloudbridge / CLOUDBRIDGE (Sfx.extra.cloudbridge* too). */
const CLOUDBRIDGE = {
  bw: 64, bh: 22, life: 6.0, sunK: 1.8, goldLife: 18, wobble: 1.6,
  step: 40, edgeR: 72, range: 300, maxMarks: 2, aimShow: 0.16,
  puffCD: 0.45, holdRepeat: 0.45, puffT0: 0.32, puffV: 1300,
  depth: 64, fallY: 600, boingT: 1.7, cushionY: 512,
  springV: 1020, stepUp: 46, stepV: 470,
  liftV: 95, liftWait: 0.9, liftDelay: 0.7,
  calm: 3.0, warn: 1.0, blow: 2.2,
  maxSep: 700, goldFalls: 2, goldBlown: 3, goldSlow: 32, stuckHint: 25,
  starR: 15, starDy: 158,
  introHold: 0.4, newsLife: 3.8, chipT: 7, chipAgain: 15, clearT: 1.8, finT: 4.6,
};

(() => {
  const CB = CLOUDBRIDGE;
  const solo = () => typeof cpuSolo === 'function' && cpuSolo();
  const isCpu = id => solo() && cpuOn(id);
  const big = () => typeof hudBig === 'function' && hudBig();
  const lerp = (a, b, u) => a + (b - a) * u;
  const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';

  /* ---------- each player's own keys (keyboard, controller or touch) ---------- */
  function dev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
  function key(id, what) {
    const d = dev(id), s = solo();
    // (on touch the round button reads 'call' or 'puff', so name it by that word)
    if (what === 'act') return d === 'pad' ? glyph('act') : d === 'touch' ? 'the ' + (G.mst && G.mst.caller === id ? 'call' : 'puff') + ' button' : s ? 'F' : id === 0 ? 'F' : '/';
    if (what === 'up') return d === 'pad' ? glyph('a') : d === 'touch' ? '▲' : s ? 'W' : id === 0 ? 'W' : '↑';
    if (what === 'down') return d === 'pad' ? 'stick down' : d === 'touch' ? '▼' : s ? 'S' : id === 0 ? 'S' : '↓';
    if (what === 'back') return d === 'pad' ? 'stick ◀' : d === 'touch' ? '◀' : s ? 'A' : id === 0 ? 'A' : '←';
    return '';
  }

  /* ---------- building a stretch from its course ---------- */
  function compile(st, def) {
    const isles = [], gaps = [], zones = [], stars = [], signs = [];
    const nm = s => String(s).replace(/\{C\}/g, NAMES[st.caller]).replace(/\{B\}/g, NAMES[st.builder]);
    let x = 0, pend = null;
    for (const it of def.course || []) {
      const k = it[0];
      if (k === 'gap') { const o = it[2] || {}; pend = { w: it[1], o }; x += it[1]; continue; }
      let s;
      if (k === 'lift') {
        const prev = isles[isles.length - 1], low = prev ? prev.top : 380;
        s = { kind: 'lift', x0: x, x1: x + it[1], top: low, low, high: it[2], bottom: low + CB.depth, emptyT: 0, vy: 0, riders: 0 };
      } else {
        const o = it[3] || {};
        s = { kind: 'isle', x0: x, x1: x + it[1], top: it[2], bottom: it[2] + CB.depth, spring: o.spring != null ? x + o.spring : null, flag: !!o.flag, castle: !!o.castle, springT: 9 };
        for (const sg of o.signs || []) signs.push({ x: x + sg[0], y: it[2], raw: nm(sg[1]), alt: sg[2] != null ? nm(sg[2]) : null });
      }
      s.i = isles.length; s.seed = hash(isles.length + 11, it[1] | 0);
      isles.push(s);
      if (pend && isles.length > 1) {
        const A = isles[isles.length - 2], B = s, o = pend.o;
        const g = { i: gaps.length, a: A.i, b: B.i, x0: A.x1, x1: B.x0, falls: 0, blown: 0, gold: false, wind: o.wind != null, sun: !!o.sun };
        gaps.push(g);
        if (o.wind != null) zones.push({ kind: 'wind', x0: g.x0 - 30, x1: g.x1 + 30, off: +o.wind || 0, gap: g.i });
        if (o.sun) zones.push({ kind: 'sun', x0: g.x0 - 24, x1: g.x1 + 24, gap: g.i });
        if (o.star) {
          // over the middle cloud of the bridge the smart flags would make, one step too high to reach from it
          const n = Math.ceil((g.x1 - g.x0) / CB.bw), tops = [], goal = B.kind === 'lift' ? B.high : B.top;
          let top = A.kind === 'lift' ? A.high : A.top;
          for (let k = 0; k < n; k++) { const want = goal - top; top += Math.abs(want) < 6 ? want : clamp(want, -CB.step, CB.step); tops.push(top); }
          const k = Math.floor(n / 2);
          stars.push({ x: g.x0 + k * CB.bw + CB.bw / 2, y: tops[k] - CB.starDy, got: false, t: 0 });
        }
      }
      pend = null;
      x = s.x1;
    }
    st.isles = isles; st.gaps = gaps; st.zones = zones; st.stars = stars; st.signs = signs;
    st.len = x;
    st.goalIsle = isles[isles.length - 1];
    st.lifts = isles.filter(s => s.kind === 'lift');
  }
  const topFor = s => (s.kind === 'lift' ? s.high : s.top);

  /* ---------- surfaces: islands, lifts and solid clouds ---------- */
  function surfaces(st) {
    const out = st.isles.slice();
    for (const c of st.clouds) if (c.state === 'solid') out.push(c);
    return out;
  }
  const overX = (p, s) => p.x < s.x1 - 0.01 && p.x + p.w > s.x0 + 0.01;
  function groundOf(st, p) {
    const feet = p.y + p.h, cx = p.x + p.w / 2;
    let best = null, bd = 1e9;
    for (const s of surfaces(st)) {
      if (Math.abs(feet - s.top) > 0.75 || !overX(p, s)) continue;
      const d = cx >= s.x0 && cx <= s.x1 ? 0 : Math.min(Math.abs(cx - s.x0), Math.abs(cx - s.x1));
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function moveX(st, p, dx) {
    if (!dx) return false;
    p.x += dx;
    let hit = false;
    for (const s of st.isles) {
      if (p.x < s.x1 && p.x + p.w > s.x0 && p.y < s.bottom - 0.01 && p.y + p.h > s.top + 0.01) {
        if (dx > 0) p.x = Math.min(p.x, s.x0 - p.w); else p.x = Math.max(p.x, s.x1);
        hit = true;
      }
    }
    if (p.x < 0) { p.x = 0; hit = true; }
    if (p.x + p.w > st.len) { p.x = st.len - p.w; hit = true; }
    if (hit) p.vx = 0;
    return hit;
  }
  function moveY(st, p, dy) {
    if (!dy) return;
    const feet0 = p.y + p.h, top0 = p.y;
    p.y += dy;
    if (dy > 0) {
      let land = null;
      for (const s of surfaces(st)) {
        if (!overX(p, s)) continue;
        if (feet0 <= s.top + 0.5 && p.y + p.h >= s.top) { if (!land || s.top < land.top) land = s; }
      }
      if (land) { p.y = land.top - p.h; p.vy = 0; }
    } else {
      for (const s of st.isles) {
        if (!overX(p, s)) continue;
        if (top0 >= s.bottom - 0.5 && p.y < s.bottom) { p.y = s.bottom; p.vy = Math.max(0, p.vy); p.jumping = false; }
      }
    }
  }
  // the island or cloud whose near edge is right in front of p, up to stepUp higher (for the auto-step)
  function stepAhead(st, p, d) {
    const feet = p.y + p.h;
    for (const s of surfaces(st)) {
      if (s.top > feet - 5 || s.top < feet - CB.stepUp) continue;
      if (d > 0 ? (s.x0 >= p.x + p.w - 3 && s.x0 <= p.x + p.w + 4) : (s.x1 <= p.x + 3 && s.x1 >= p.x - 4)) return s;
    }
    return null;
  }

  /* ---------- one player's tick (world coords) ---------- */
  function playerTick(st, p, dt) {
    const P = st.pl[p.id];
    if (P.boing) { boingStep(st, p, dt); return; }
    P.stepCD -= dt;
    const real = p.input;
    let inp = real;
    if (st.state !== 'play' || G.introT > CB.introHold) { inp = NO_INPUT; p.pendingJump = false; }
    else if (P.aim) { inp = Object.assign({}, real, { jump: false }); p.pendingJump = false; p.jumpBuf = 0; }
    const was = p.grounded;
    p.input = inp;
    try { control(p, dt); } finally { p.input = real; }
    const d = inp.right ? 1 : inp.left ? -1 : 0;
    moveX(st, p, p.vx * dt);
    if (was && d && P.stepCD <= 0 && p.stun <= 0 && !(p.vy < -CB.stepV)) {   // (not on the tick a jump started: the step hop used to swallow the jump)
      const s = stepAhead(st, p, d);
      if (s) { p.vy = -CB.stepV; p.jumping = false; P.stepCD = 0.3; p.vx = d * Math.max(Math.abs(p.vx), 120); }
    }
    const vy = p.vy;
    moveY(st, p, p.vy * dt);
    const gs = groundOf(st, p);
    p.grounded = !!gs; p.tileGround = !!gs; p.onPartner = false; p.onOneWay = false;
    P.ground = gs;
    if (p.grounded && !was && vy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.8)'); Sfx.play('land'); }
    p.lastVy = p.grounded ? 0 : p.vy;
    if (gs && gs.kind === 'isle') {
      P.cp = gs.i;
      if (gs.i > P.best) { P.best = gs.i; st.progressT = 0; }
      // a rainbow spring
      if (gs.spring != null && Math.abs(p.x + p.w / 2 - gs.spring) < 18 && st.state === 'play') {
        p.vy = -CB.springV; p.grounded = false; p.jumping = false; p.sx = 0.7; p.sy = 1.35; P.springT = 0;
        p.coyote = 0; p.jumpBuf = 0; p.pendingJump = false;   // (a jump pressed just after must not replace the launch)
        gs.springT = 0;
        pop(st, gs.spring, gs.top - 40, 'Boing!', '#ff9fd6', 20);
        Sfx.play('cloudbridgeSpring', p.id);
      }
    }
    if (gs && gs.kind === 'lift' && gs.i > P.best) { P.best = gs.i; st.progressT = 0; }
    P.springT += dt;
    if (p.y > CB.fallY) startBoing(st, p);
  }

  /* ---------- Boing: the safety cloud catches you and bounces you back ---------- */
  function gapNear(st, x) {
    let best = null, bd = 1e9;
    for (const g of st.gaps) {
      const d = x < g.x0 ? g.x0 - x : x > g.x1 ? x - g.x1 : 0;
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  }
  function boingSpot(st, isle, fromX) {
    const right = fromX > (isle.x0 + isle.x1) / 2;
    let sx = right ? isle.x1 - 40 : isle.x0 + 40;
    if (isle.x1 - isle.x0 < 100) sx = right ? isle.x1 - 16 : isle.x0 + 16;
    if (isle.spring != null && Math.abs(sx - isle.spring) < 30) sx = isle.spring + (sx < isle.spring ? -30 : 30);
    return clamp(sx, isle.x0 + 14, isle.x1 - 14);
  }
  function startBoing(st, p) {
    const P = st.pl[p.id];
    if (P.boing) return;
    const cx = p.x + p.w / 2, isle = st.isles[P.cp] || st.isles[0];
    const g = gapNear(st, cx);
    P.boing = { t: 0, x0: cx, y0: Math.min(p.y + p.h / 2, CB.fallY), sx: boingSpot(st, isle, cx), sy: isle.top, gap: g ? g.i : -1 };
    p.alive = false; P.aim = null;
    st.stats.boings[p.id]++;
    Sfx.play('cloudbridgeFall', p.id);
    if (g) {
      g.falls++;
      if (g.falls >= CB.goldFalls && !g.gold) goldGap(st, g, 'falls');
    }
    if (isCpu(1 - p.id) && typeof cpuSay === 'function') cpuSay(G.players[1 - p.id], 'Boing! You’re okay!');
  }
  function boingPos(st, w) {
    const bottom = CB.cushionY - 10;
    if (w.t < 0.5) { const u = w.t / 0.5; return { x: w.x0, y: lerp(w.y0, bottom, u * u), sq: 0 }; }
    if (w.t < 0.7) return { x: w.x0, y: bottom, sq: Math.sin((w.t - 0.5) / 0.2 * Math.PI) * 0.45 };
    const u = clamp((w.t - 0.7) / (CB.boingT - 0.7), 0, 1);
    return { x: lerp(w.x0, w.sx, u), y: lerp(bottom, w.sy - PH / 2, u) - Math.sin(u * Math.PI) * 170, sq: 0 };
  }
  function boingStep(st, p, dt) {
    const P = st.pl[p.id], w = P.boing;
    w.t += dt;
    p.pendingJump = false; p.pendingAct = false;
    if (w.t > 0.5 && !w.bounced) { w.bounced = true; Sfx.play('cloudbridgeBoing', p.id); pop(st, w.x0, CB.cushionY - 60, 'Boing!', '#ffffff', 24); }
    if (w.t < CB.boingT) return;
    const input = p.input;
    Object.assign(p, { x: w.sx - PW / 2, y: w.sy - PH, w: PW, h: PH, vx: 0, vy: 0, alive: true, grounded: true, jumping: false, jumpBuf: 0,
      pendingJump: false, coyote: 0, stun: 0, sx: 0.6, sy: 1.4, carryVx: 0, offT: 0, knockT: 0, input, face: w.sx > w.x0 ? -1 : 1 });
    p.pendingAct = false; p.prevJump = true;
    P.boing = null; P.ground = null;
    puff(w.sx, w.sy, 8, 'rgba(255,255,255,0.9)');
  }

  /* ---------- the caller's flags: where the next cloud goes ---------- */
  // the spot in front of p (world coords) with aim offset off (-2..2 steps, negative = higher), or { why }
  function spot(st, p, off) {
    off = off || 0;
    if (!p.grounded) return { why: 'air' };
    const P = st.pl[p.id], g = P.ground || groundOf(st, p);
    if (!g) return { why: 'air' };
    const dir = p.face >= 0 ? 1 : -1, edge = dir > 0 ? g.x1 : g.x0;
    const dist = dir > 0 ? g.x1 - (p.x + p.w) : p.x - g.x0;
    if (dist > CB.edgeR) return { why: 'far', edge, dir, g };
    // the next island (or lift) ahead: the smart height steps toward it
    let T = null;
    for (const s of st.isles) {
      if (s === g) continue;
      if (dir > 0 ? s.x0 >= edge - 1 : s.x1 <= edge + 1) { if (!T || (dir > 0 ? s.x0 < T.x0 : s.x1 > T.x1)) T = s; }
    }
    if (!T) return { why: 'end', edge, dir, g };
    const want = topFor(T) - g.top;
    const smart = Math.abs(want) < 6 ? want : clamp(want, -CB.step, CB.step);
    const dy = clamp(smart + off * CB.step, -CB.step, CB.step);
    const top = g.top + dy;
    let x0 = dir > 0 ? edge : edge - CB.bw, x1 = x0 + CB.bw;
    // trim against an island side in the way (a narrow last block); no room left: none
    for (const s of st.isles) {
      if (s === g) continue;
      const lo = s.kind === 'lift' ? s.high : s.top;
      if (top + CB.bh <= lo + 1 || top >= s.bottom) continue;
      if (dir > 0 && s.x0 > x0 - 0.5 && s.x0 < x1) x1 = s.x0;
      if (dir < 0 && s.x1 < x1 + 0.5 && s.x1 > x0) x0 = s.x1;
      if (s.x0 <= x0 + 0.5 && s.x1 >= x1 - 0.5) return { why: 'room', edge, dir, g };
    }
    if (x1 - x0 < 20) return { why: 'room', edge, dir, g };
    if (top < 150) return { why: 'room', edge, dir, g };
    const box = { x0, x1, top };
    // (no two clouds closer than a body height above each other: nobody gets squeezed between them)
    const clash = q => q.x0 < box.x1 - 8 && q.x1 > box.x0 + 8 && Math.abs(q.top - box.top) < CB.bh + PH + 4;
    if (st.clouds.some(clash)) return { why: 'room', edge, dir, g };
    if (st.marks.some(clash)) return { why: 'have', edge, dir, g };
    return { x0, x1, top, dir, g, smart, dy, T };
  }
  function plant(st, p, off) {
    const P = st.pl[p.id], s = spot(st, p, off);
    if (s.why) {
      if (P.noCD <= 0) {
        P.noCD = 1.4;
        const msg = { air: 'Land first!', far: 'Walk to the edge!', end: 'No gap here!', room: 'No room there!', have: 'Flag’s there!' }[s.why];
        pop(st, p.x + p.w / 2, p.y - 30, msg, '#ffffff', 15);
        Sfx.play('cloudbridgeNo');
      }
      return false;
    }
    const waiting = st.marks.filter(m => !m.puffing);
    if (waiting.length >= CB.maxMarks) st.marks.splice(st.marks.indexOf(waiting[0]), 1);
    st.marks.push({ x0: s.x0, x1: s.x1, top: s.top, t: 0, by: p.id, puffing: false, id: ++st.markN });
    st.stats.calls[p.id]++;
    P.waveT = 0.5;
    pop(st, (s.x0 + s.x1) / 2, s.top - 40, 'Here!', PCOL[p.id], 17);
    Sfx.play('cloudbridgeCall', p.id);
    st.progressT = Math.min(st.progressT, st.progressT * 0.5);
    return true;
  }

  /* ---------- the builder's cloud machine ---------- */
  const nozzle = (st, p) => ({ x: p.x + p.w / 2 + p.face * 19, y: p.y + 9 });
  const markC = m => ({ x: (m.x0 + m.x1) / 2, y: m.top + CB.bh / 2 });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // the flag the next squeeze goes to (the oldest waiting one in reach), with the nozzle in world coords
  function target(st, p) {
    const n = nozzle(st, p);
    for (const m of st.marks) if (!m.puffing && dist(n, markC(m)) <= CB.range) return m;
    return null;
  }
  function squeeze(st, p) {
    const P = st.pl[p.id];
    P.cd = CB.puffCD; P.squeezeT = 0.32;
    const n = nozzle(st, p), m = target(st, p);
    st.stats.squeezes[p.id]++;
    if (!m) {
      // pfft: a little puff of air
      for (let i = 0; i < 3; i++) st.parts.push({ x: n.x, y: n.y, vx: p.face * (60 + Math.random() * 60), vy: -20 - Math.random() * 30, t: 0, life: 0.45, r: 3 + Math.random() * 2, kind: 'air' });
      Sfx.play('cloudbridgePfft', p.id);
      if (P.noCD <= 0) {
        P.noCD = 1.6;
        const any = st.marks.some(q => !q.puffing);
        pop(st, p.x + p.w / 2, p.y - 30, any ? 'Too far! Get closer' : 'Wait for a flag!', '#ffffff', 15);
      }
      return;
    }
    const to = markC(m), d = dist(n, to);
    m.puffing = true;
    const gp = gapNear(st, to.x);
    st.puffs.push({ x0: n.x, y0: n.y, x: n.x, y: n.y, tx: to.x, ty: to.y, t: 0, T: CB.puffT0 + d / CB.puffV, arc: 26 + d * 0.12, mark: m, by: p.id, gold: !!(gp && gp.gold), spin: 0 });
    st.stats.puffs[p.id]++;
    p.sx = 1.12; p.sy = 0.9;
    Sfx.play('cloudbridgePuff', p.id);
  }
  function act(st, p, dt) {
    const P = st.pl[p.id], inp = p.input;
    P.noCD -= dt; P.cd -= dt; P.squeezeT = Math.max(0, P.squeezeT - dt); P.waveT = Math.max(0, P.waveT - dt);
    if (!p.alive || P.boing || st.state !== 'play' || G.introT > CB.introHold) { P.aim = null; p.pendingAct = false; P.holdT = 0; return; }
    if (p.id === st.caller) {
      if (p.pendingAct) { p.pendingAct = false; if (!P.aim) P.aim = { t: 0, off: 0, prevDown: !!inp.down }; }
      if (P.aim) {
        const a = P.aim;
        a.t += dt;
        if (p.pendingJump) { p.pendingJump = false; p.jumpBuf = 0; if (a.off > -2) { a.off--; Sfx.play('cloudbridgeAim', p.id); } }
        if (inp.down && !a.prevDown && a.off < 2) { a.off++; Sfx.play('cloudbridgeAim', p.id); }
        a.prevDown = !!inp.down;
        if (!inp.act) { plant(st, p, a.off); P.aim = null; }
      }
      return;
    }
    // the builder
    if (inp.act) P.holdT += dt; else P.holdT = 0;
    if (p.pendingAct && P.cd <= 0) { p.pendingAct = false; squeeze(st, p); }
    else if (inp.act && P.holdT > CB.holdRepeat && P.cd <= 0) squeeze(st, p);
  }

  /* ---------- puffs in flight, wind, cloud blocks melting ---------- */
  function windAt(st, x) {
    for (const z of st.zones) {
      if (z.kind !== 'wind' || x < z.x0 || x > z.x1) continue;
      return windState(st, z);
    }
    return null;
  }
  function windState(st, z) {
    const cyc = CB.calm + CB.warn + CB.blow, ph = ((st.windT + z.off) % cyc + cyc) % cyc;
    if (ph < CB.calm) return { s: 'calm', left: CB.calm - ph, z };
    if (ph < CB.calm + CB.warn) return { s: 'warn', left: CB.calm + CB.warn - ph, z };
    return { s: 'blow', left: cyc - ph, z };
  }
  const inSun = (st, x) => st.zones.some(z => z.kind === 'sun' && x >= z.x0 && x <= z.x1);
  function puffsStep(st, dt) {
    for (const q of st.puffs.slice()) {
      q.t += dt; q.spin += dt * 6;
      const u = clamp(q.t / q.T, 0, 1);
      q.x = lerp(q.x0, q.tx, u); q.y = lerp(q.y0, q.ty, u) - Math.sin(u * Math.PI) * q.arc;
      if (Math.random() < dt * 30) st.parts.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, t: 0, life: 0.4, r: 3 + Math.random() * 3, kind: q.gold ? 'gold' : 'trail' });
      const w = !q.gold && windAt(st, q.x);
      if (w && w.s === 'blow') {
        // blown away! the flag stays for another try
        st.puffs.splice(st.puffs.indexOf(q), 1);
        q.mark.puffing = false;
        st.blownBits.push({ x: q.x, y: q.y, vx: 260 + Math.random() * 80, vy: -90 - Math.random() * 60, t: 0 });
        st.stats.blown++;
        pop(st, q.x, q.y - 26, 'Whoosh! Blown away!', '#ffffff', 17);
        Sfx.play('cloudbridgeWhoosh');
        const g = st.gaps[w.z.gap];
        if (g) { g.blown++; if (g.blown >= CB.goldBlown && !g.gold) goldGap(st, g, 'wind'); }
        continue;
      }
      if (u >= 1) {
        st.puffs.splice(st.puffs.indexOf(q), 1);
        const m = q.mark, i = st.marks.indexOf(m);
        if (i >= 0) st.marks.splice(i, 1);
        const gp = gapNear(st, (m.x0 + m.x1) / 2), gold = q.gold || !!(gp && gp.gold);
        const c = { x0: m.x0, x1: m.x1, top: m.top, h: CB.bh, life: gold ? CB.goldLife : CB.life, max: gold ? CB.goldLife : CB.life, gold, state: 'forming', t: 0, seed: (st.cloudN++ * 7) % 97, by: q.by };
        st.clouds.push(c);
        st.progressT = 0;
        for (let k = 0; k < 8; k++) st.parts.push({ x: lerp(c.x0, c.x1, Math.random()), y: c.top + 8, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 60, t: 0, life: 0.5, r: 4 + Math.random() * 3, kind: gold ? 'gold' : 'trail' });
        Sfx.play('cloudbridgePlop', q.by);
      }
    }
    for (const b of st.blownBits) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 40 * dt; }
    st.blownBits = st.blownBits.filter(b => b.t < 1.6);
  }
  function cloudsStep(st, dt) {
    for (const c of st.clouds.slice()) {
      c.t += dt;
      if (c.state === 'forming') {
        const busy = G.players.some(p => p.alive && p.x < c.x1 - 2 && p.x + p.w > c.x0 + 2 && p.y < c.top + c.h && p.y + p.h > c.top + 0.5);
        if (!busy) c.state = 'solid';
      }
      const sun = inSun(st, (c.x0 + c.x1) / 2);
      c.sun = sun;
      c.life -= dt * (sun && !c.gold ? CB.sunK : 1);
      if (c.life <= 0) {
        st.clouds.splice(st.clouds.indexOf(c), 1);
        for (let k = 0; k < 10; k++) st.parts.push({ x: lerp(c.x0, c.x1, Math.random()), y: c.top + 8 + Math.random() * 10, vx: (Math.random() - 0.5) * 140, vy: -30 - Math.random() * 90, t: 0, life: 0.55, r: 3 + Math.random() * 4, kind: c.gold ? 'gold' : 'trail' });
        Sfx.play('cloudbridgePop');
        // whoever stood on it drops
        for (const p of G.players) if (st.pl[p.id].ground === c) { p.grounded = false; st.pl[p.id].ground = null; }
      }
    }
    for (const m of st.marks) m.t += dt;
    // flags left far behind both players fade away
    st.marks = st.marks.filter(m => m.puffing || G.players.some(p => Math.abs(p.x + p.w / 2 - (m.x0 + m.x1) / 2) < 900));
  }

  /* ---------- the cloud lift: rises while someone stands on it, sinks when empty ---------- */
  function liftsStep(st, dt) {
    for (const L of st.lifts) {
      const riders = G.players.filter(p => p.alive && st.pl[p.id].ground === L);
      L.riders = riders.length;
      L.emptyT = riders.length ? 0 : L.emptyT + dt;
      L.rideT = riders.length ? (L.rideT || 0) + dt : 0;
      // someone on the island below walking into its side calls it down (even with a rider: nobody waits forever)
      const callers = G.players.filter(p => p.alive && !riders.includes(p) && p.grounded && st.pl[p.id].ground && st.pl[p.id].ground.kind === 'isle' &&
        Math.abs(st.pl[p.id].ground.x1 - L.x0) < 2 && p.x + p.w > L.x0 - 1.5 && p.input.right && L.top < L.low - 0.5);
      L.callT = callers.length ? (L.callT || 0) + dt : 0;
      if (L.callT > 0.25) L.called = true;
      // (once called it comes all the way down, unless the one who called walked away from its foot)
      const atFoot = G.players.some(p => p.alive && !riders.includes(p) && p.x + p.w > L.x0 - 90 && p.x < L.x0 + 2 && p.y + p.h <= L.low + 2);
      if (L.top >= L.low - 0.5 || !atFoot) L.called = false;
      let want = 0;
      if (L.called && L.top < L.low) want = CB.liftV;
      else if (riders.length && L.rideT > CB.liftDelay && L.top > L.high) want = -CB.liftV;
      else if (!riders.length && L.emptyT > CB.liftWait && L.top < L.low) want = CB.liftV;
      if (st.state !== 'play') want = 0;
      const ny = clamp(L.top + want * dt, L.high, L.low), dy = ny - L.top;
      L.top = ny; L.vy = dt > 0 ? dy / dt : 0;
      if (dy) {
        for (const p of riders) p.y += dy;
        // a player in the column above it gets lifted (never squashed)
        for (const p of G.players) {
          if (!p.alive || riders.includes(p) || !overX(p, L)) continue;
          if (p.y + p.h > L.top && p.y < L.bottom) {
            if (p.y + p.h - L.top < 30) { p.y = L.top - p.h; p.vy = Math.min(p.vy, 0); }
            else p.x = p.x + p.w / 2 < (L.x0 + L.x1) / 2 ? L.x0 - p.w : L.x1;
          }
        }
      }
      if (want && Math.floor(G.time * 4) !== Math.floor((G.time - dt) * 4)) Sfx.play('cloudbridgeLift');
    }
  }

  /* ---------- stars, gold, news, pops ---------- */
  function starsStep(st, dt) {
    for (const s of st.stars) {
      s.t += dt;
      if (s.got) continue;
      for (const p of G.players) {
        if (!p.alive) continue;
        const nx = clamp(s.x, p.x, p.x + p.w), ny = clamp(s.y, p.y, p.y + p.h);
        if (Math.hypot(nx - s.x, ny - s.y) < CB.starR) {
          s.got = true; s.by = p.id; st.stats.stars++;
          pop(st, s.x, s.y - 20, 'Star!', C.gold, 22);
          Sfx.play('cloudbridgeStar', p.id);
          for (let k = 0; k < 12; k++) st.parts.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, t: 0, life: 0.6, r: 2 + Math.random() * 2, kind: 'gold' });
          break;
        }
      }
    }
  }
  function goldGap(st, g, why) {
    g.gold = true; g.goldWhy = why;
    st.goldUsed.push(why);
    news(st, why === 'wind' ? 'Gold puffs! The wind can’t blow them away at this gap' : 'Gold clouds! At this gap they last much longer now', true, 5);
    pop(st, (g.x0 + g.x1) / 2, Math.min(st.isles[g.a].top, st.isles[g.b].top) - 70, why === 'wind' ? 'Gold puffs!' : 'Gold clouds!', C.gold, 24);
    Sfx.play('cloudbridgeGold');
    // the clouds already there turn gold too
    for (const c of st.clouds) { const gp = gapNear(st, (c.x0 + c.x1) / 2); if (gp === g && !c.gold) { c.gold = true; c.life = Math.max(c.life, CB.goldLife * 0.6); c.max = CB.goldLife; } }
  }
  function news(st, s, gold, life, quiet) {
    if (quiet && st.news && st.news.s === s) { st.news.t = Math.min(st.news.t, 0.3); return; }
    st.news = { s, gold: !!gold, t: 0, life: life || CB.newsLife };
  }
  function pop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); if (st.pops.length > 14) st.pops.shift(); }

  /* ---------- what's ahead: the gap the team is on, chains of walkable surfaces ---------- */
  const wx = (st, p) => { const P = st.pl[p.id]; if (P.boing) return P.boing.sx; return p.x + p.w / 2 + (st.inTick ? 0 : st.camX); };
  // the first gap not yet crossed by both (null once both have crossed every gap)
  function curGap(st) {
    const lo = Math.min(st.pl[0].best, st.pl[1].best);
    return st.gaps.find(g => g.b > lo) || null;
  }
  // walking from surface s in direction dir: the farthest surface reached without a jump over a gap (cloud steps,
  // walking down, the auto-step up; a rainbow spring links to the high island next to it). Returns { end, path }.
  function chain(st, s, dir, list) {
    const all = list || surfaces(st), path = [s];
    let cur = s;
    for (let n = 0; n < 40; n++) {
      let nx = null;
      for (const q of all) {
        if (q === cur || path.includes(q)) continue;
        const touch = dir > 0 ? Math.abs(q.x0 - cur.x1) <= 12 : Math.abs(q.x1 - cur.x0) <= 12;
        // (a rainbow spring boings you up onto the high island just after it)
        const boing = cur.kind === 'isle' && cur.spring != null && dir > 0 && q.x0 - cur.x1 >= -12 && q.x0 - cur.x1 <= 100 && q.top < cur.top - CB.stepUp && q.top > cur.top - 250;
        if (!touch && !boing) continue;
        if (q.top < cur.top - CB.stepUp && !boing) continue;
        if (q.top > cur.top + 260) continue;
        if (!nx || q.top < nx.top) nx = q;
      }
      if (!nx) break;
      path.push(nx); cur = nx;
    }
    return { end: cur, path };
  }
  const reaches = (ch, target) => ch.path.includes(target);

  /* ---------- the stretch's goal ---------- */
  const onGoal = (st, p) => { const P = st.pl[p.id]; return p.alive && !P.boing && p.grounded && P.ground === st.goalIsle; };
  function goalCheck(st) {
    if (!G.players.every(p => onGoal(st, p))) return;
    st.stats.stretchT[st.k] = G.time - st.segStart;
    const gi = st.goalIsle, fx = flagX(st);
    if (st.final) {
      st.state = 'end'; st.endT = 0; st.stats.time = G.time;
      pop(st, fx, gi.top - 170, 'The Cloud Castle!', C.gold, 32);
      Sfx.play('cloudbridgeWin');
    } else {
      st.state = 'clear'; st.clearT = 0;
      pop(st, fx, gi.top - 130, 'Stretch clear!', C.gold, 30);
      Sfx.play('cloudbridgeClear');
    }
    for (let i = 0; i < 26; i++) confetti(fx, gi.top - 90);
  }
  const flagX = st => (st.goalIsle.castle ? st.goalIsle.x0 + 150 : st.goalIsle.x0 + (st.goalIsle.x1 - st.goalIsle.x0) * 0.62);

  /* ---------- hints: what each player should do now (the chips over the heads and the stuck hint) ---------- */
  function job(st, id) {
    if (st.state !== 'play') return null;
    const p = G.players[id], P = st.pl[id];
    if (P.boing || !p.alive) return null;
    const g = curGap(st), caller = id === st.caller, o = 1 - id;
    if (!g) return onGoal(st, p) ? { k: 'onFlag' } : { k: 'toFlag' };
    const A = st.isles[g.a], B = st.isles[g.b], across = P.best >= g.b, oAcross = st.pl[o].best >= g.b;
    const ground = P.ground;
    // a lift raised next to this island (someone rides it): walking into its side calls it down
    const liftUp = ground && ground.kind === 'isle' && st.lifts.some(L => Math.abs(ground.x1 - L.x0) < 2 && L.top < L.low - 30 && L.riders && P.best < L.i);
    if (caller) {
      if (P.aim) return { k: 'aiming' };
      if (!across) {
        if (ground && reaches(chain(st, ground, 1), B)) return { k: 'walkOn' };
        const wait = st.marks.find(m => !m.puffing);
        if (wait) { const op = G.players[o]; return st.pl[o].boing || target(st, Object.assign({}, op, { x: op.x + (st.inTick ? 0 : st.camX) })) === wait ? { k: 'waitPuff' } : { k: 'tooFar' }; }
        if (st.puffs.length) return { k: 'waitPuff' };
        if (liftUp) return { k: 'liftCall' };
        const s = ground && spot(st, Object.assign({}, p, { x: p.x + (st.inTick ? 0 : st.camX), face: 1 }), 0);
        if (s && !s.why) return { k: 'call' };
        return { k: 'toEdge' };
      }
      if (!oAcross) {
        const og = st.pl[o].ground;
        if (og && reaches(chain(st, og, 1), B)) return { k: 'waitB' };
        return { k: 'callBack' };
      }
      return { k: 'toEdge' };
    }
    // the builder
    if (!across) {
      const wait = st.marks.find(m => !m.puffing);
      if (wait) {
        const pp = Object.assign({}, p, { x: p.x + (st.inTick ? 0 : st.camX) });
        if (target(st, pp)) { const w = windAt(st, (wait.x0 + wait.x1) / 2); return w && w.s !== 'calm' && !g.gold ? { k: 'wind' } : { k: 'puff' }; }
        return { k: 'closer' };
      }
      if (liftUp) return { k: 'liftCall' };
      if (ground && reaches(chain(st, ground, 1), B)) return { k: 'cross' };
      if (oAcross) return { k: 'waitCall' };
      return { k: 'follow' };
    }
    return { k: 'toEdge2' };
  }
  function jobText(st, id, j) {
    const nm = NAMES[1 - id], cpu = isCpu(1 - id), a = key(id, 'act');
    switch (j.k) {
      case 'toEdge': return ['Walk ahead to the edge ▶', id === st.caller ? 'Then call a cloud' : ''];
      case 'toEdge2': return ['Keep going ▶', ''];
      case 'call': return ['Press ' + a + ': call a cloud here!', 'Hold ' + a + ' + ' + key(id, 'up') + ' / ' + key(id, 'down') + ' to aim'];
      case 'aiming': return ['Aim: ' + key(id, 'up') + ' higher, ' + key(id, 'down') + ' lower', 'Let go of ' + a + ' to call'];
      case 'waitPuff': return ['Now ' + nm + ' puffs a cloud there', 'Then walk on'];
      case 'tooFar': return ['Wait for ' + nm + ' to come closer', nm + ' can only puff so far'];
      case 'walkOn': return ['Walk on! Clouds melt', 'Call the next one at the edge'];
      case 'callBack': return ['Turn ' + key(id, 'back') + ' and call clouds for ' + nm + '!', nm + ' has to cross too'];
      case 'waitB': return ['Wait for ' + nm + ' to cross', ''];
      case 'puff': return ['Press ' + a + ': puff a cloud!', 'It flies to the flag'];
      case 'wind': return ['Wind! Puff when it stops', 'The puff gets blown away'];
      case 'closer': return ['Walk closer to the flag!', 'Then press ' + a];
      case 'cross': return ['Cross now! It melts!', 'Keep close to ' + nm];
      case 'waitCall': return ['Wait for a flag from ' + nm, cpu ? nm + ' calls clouds back to you' : nm + ': turn round and call!'];
      case 'follow': return ['Stay close to ' + nm, 'Puff when a flag shows'];
      case 'liftCall': return ['Walk into the lift ▶', 'It comes down to fetch you'];
      case 'toFlag': return ['Both to the flag!', ''];
      case 'onFlag': return ['Wait here for ' + nm, ''];
      default: return null;
    }
  }
  function help(st, dt) {
    st.progressT += dt;
    if (st.progressT > CB.stuckHint && st.state === 'play') {
      st.progressT = 0;
      for (const id of [0, 1].filter(i => !isCpu(i))) {
        const j = job(st, id), tx = j && jobText(st, id, j);
        if (tx && tx[0]) { news(st, 'Hint for ' + NAMES[id] + ': ' + tx[0], true, 5); st.stats.hints++; break; }
      }
    }
  }

  /* ---------- the camera and the leash ---------- */
  function camera(st, dt, snap) {
    const xs = G.players.map(p => wx(st, p));
    let tx = (xs[0] + xs[1]) / 2 - W / 2 + 60;
    if (st.state === 'end') tx = st.goalIsle.x0 - 260;
    tx = clamp(tx, -40, Math.max(-40, st.len - W + 40));
    const lo = Math.min(xs[0], xs[1]), hi = Math.max(xs[0], xs[1]);
    tx = Math.min(tx, lo - 60); tx = Math.max(tx, hi + 60 - W);
    st.camX = snap ? tx : st.camX + (tx - st.camX) * Math.min(1, dt * 4);
  }
  function leash(st, xb, wasBoing) {
    // (a partner in a Boing counts from the spot the safety cloud bounces them back to)
    const pos = q => { const w = st.pl[q.id].boing; return w ? w.sx - q.w / 2 : q.x; };
    for (const p of G.players) {
      if (!p.alive || !p.grounded) continue;
      if (wasBoing && wasBoing[p.id]) continue;   // (just back from a Boing: the leash must not undo the come-back, which left them in mid-air to Boing again for ever)
      const o = other(p), ox = pos(o);
      if (Math.abs(p.x - ox) <= CB.maxSep) continue;
      const away = Math.abs(p.x - ox) > Math.abs(xb[p.id] - ox) && Math.abs(p.x - xb[p.id]) > 0;
      if (!away) continue;
      p.x = xb[p.id]; p.vx = 0;
      const P = st.pl[p.id];
      if (P.waitCD <= 0) {
        P.waitCD = 3.5;
        pop(st, p.x + p.w / 2, p.y - 30, 'Wait for ' + NAMES[o.id] + '!', PCOL[o.id], 16);
        if (typeof cpuSay === 'function' && cpuOn(o.id)) cpuSay(o, 'Wait for me!');
      }
    }
  }

  /* ---------- the tick (ownStep) ---------- */
  function stepAll(st, dt) {
    const ps = G.players;
    for (const p of ps) p.x += st.camX;
    st.inTick = true;
    const n0 = G.particles.length;
    try { tick(st, dt); } finally {
      st.inTick = false;
      for (const p of ps) p.x -= st.camX;
      for (let i = n0; i < G.particles.length; i++) G.particles[i].x -= st.camX;
    }
  }
  function fx(st, dt) {
    for (const q of st.pops) q.t += dt;
    st.pops = st.pops.filter(q => q.t < 1.4);
    if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
    for (const q of st.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; }
    st.parts = st.parts.filter(q => q.t < q.life);
    if (st.parts.length > 260) st.parts.splice(0, st.parts.length - 260);
    for (const s of st.isles) if (s.springT != null) s.springT += dt;
  }
  function tick(st, dt) {
    const ps = G.players;
    st.tick++;
    st.windT += dt;
    fx(st, dt);
    if (st.state === 'clear' || st.state === 'end') {
      for (const p of ps) { p.pendingAct = false; p.pendingJump = false; const P = st.pl[p.id]; P.aim = null; playerTick(st, p, dt); }
      puffsStep(st, dt);
      if (st.state === 'clear') { st.clearT += dt; if (st.clearT >= CB.clearT) st.goNext = true; }
      else endStep(st, dt);
      camera(st, dt);
      return;
    }
    if (G.introT > CB.introHold) { for (const p of ps) { p.pendingAct = false; p.pendingJump = false; } camera(st, dt); return; }
    if (!st.started) { st.started = true; if (st.room.news) news(st, st.room.news, false, 5); }
    for (const p of ps) { const P = st.pl[p.id]; P.waitCD -= dt; }
    liftsStep(st, dt);
    for (const p of ps) act(st, p, dt);
    const xb = ps.map(p => p.x), wasBoing = ps.map(p => !!st.pl[p.id].boing);
    for (const p of ps) playerTick(st, p, dt);
    leash(st, xb, wasBoing);
    puffsStep(st, dt);
    cloudsStep(st, dt);
    starsStep(st, dt);
    // warn once about wind and sun as they come into view
    for (const z of st.zones) {
      if (z.told || z.x0 > st.camX + W) continue;
      z.told = true;
      if (z.kind === 'wind' && !st.toldWind) { st.toldWind = true; news(st, 'Windy gap! Puff when the windsock droops', false, 4.5); }
      if (z.kind === 'sun' && !st.toldSun) { st.toldSun = true; news(st, 'Sunny! Clouds melt fast in the sun rays', false, 4.5); }
    }
    // a gap the team has been working on for a long time turns gold (only while both are playing)
    const g = curGap(st);
    if (g !== st.gapNow) { st.gapNow = g; st.gapT = 0; }
    const away = typeof CPU !== 'undefined' && [0, 1].some(id => !cpuOn(id) && CPU.idle[id] > 12);
    if (g && !g.gold && !away) { st.gapT += dt; if (st.gapT > CB.goldSlow) goldGap(st, g, 'slow'); }
    goalCheck(st);
    help(st, dt);
    camera(st, dt);
  }
  // the end of the last stretch: the castle gate opens, then the results
  function endStep(st, dt) {
    st.endT += dt;
    const gi = st.goalIsle, fxx = flagX(st);
    if (st.endT > 0.6 && !st.gateSound) { st.gateSound = true; Sfx.play('cloudbridgeGate'); }
    if (Math.random() < dt * 8) confetti(fxx + (Math.random() - 0.5) * 380, 60);   // (world x: the tick moves new particles on screen)
    for (const p of G.players) if (st.endT > 1.2 && p.grounded && Math.random() < dt * 1.4) { p.vy = -360; p.grounded = false; }
    if (st.endT >= CB.finT && !st.cleared) {
      st.cleared = true;
      G.level.goal = { x: fxx, y: gi.top - 60 };   // (world x, as above)
      levelClear();
    }
  }

  /* ---------- action labels: each player's touch button and legend show their own job ---------- */
  let labelEls = null;
  function actLabels(st) {
    try {
      if (!labelEls || !labelEls.every(o => document.contains(o.el))) labelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
        return { el, id };
      });
      const word = id => (id < 0 ? 'call / puff' : id === st.caller ? 'call' : 'puff');
      let changed = false;
      for (const o of labelEls) { const want = word(o.id); if (o.el.textContent !== want) { o.el.textContent = want; changed = true; } }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay as the framework set them */ }
  }

  /* ---------- a stretch (room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.room = def; st.final = k === (def.roomCount || 1) - 1;
    st.caller = def.caller || 0; st.builder = 1 - st.caller; st.look = def.look || 'meadow';
    compile(st, def);
    st.clouds = []; st.marks = []; st.puffs = []; st.blownBits = []; st.parts = []; st.pops = []; st.news = null;
    st.markN = 0; st.cloudN = 0; st.windT = 0; st.toldWind = false; st.toldSun = false; st.gapNow = null; st.gapT = 0;
    st.state = 'play'; st.goNext = false; st.clearT = 0; st.endT = 0; st.started = false; st.progressT = 0; st.segStart = G.time;
    st.stats.starsTotal += st.stars.length;
    st.pl = [0, 1].map(() => ({ boing: null, cp: 0, best: 0, ground: null, aim: null, noCD: 0, cd: 0, holdT: 0, squeezeT: 0, waveT: 0, stepCD: 0, springT: 9, waitCD: 0, chipKey: '', chipT: 0, chipAt: 0 }));
    const i0 = st.isles[0], sx = [];
    sx[st.builder] = i0.x0 + 90; sx[st.caller] = i0.x0 + 170;
    G.players.forEach((p, i) => {
      const input = p.input;
      Object.assign(p, makePlayer(i), { x: sx[i] - PW / 2, y: i0.top - PH, grounded: true, face: 1, input, prevJump: true, prevAct: true });
    });
    st.pl.forEach(P => { P.ground = i0; });
    st.camX = 0;
    st.inTick = true; camera(st, 0, true); st.inTick = false;
    for (const p of G.players) p.x -= st.camX;
    actLabels(st);
  }
  function setup(st, L) {
    st.stats = { boings: [0, 0], puffs: [0, 0], calls: [0, 0], squeezes: [0, 0], blown: 0, stars: 0, starsTotal: 0, hints: 0, time: 0, stretchT: [] };
    st.goldUsed = []; st.tick = 0;
    room(st, L, 0);
  }

  MODES.cloudbridge = {
    CB,
    medals: { bronze: 'Reach the castle', goals: [{ key: 'time', gold: 210, silver: 330 }, { key: 'boings', gold: 3, silver: 10, word: 'Boing' }] },
    medalValues() { const s = G.mst.stats; return s ? { time: s.time || G.time, boings: s.boings[0] + s.boings[1] } : {}; },
    spot, target, nozzle, markC, chain, reaches, surfaces, curGap, windAt, windState, wx, groundOf, topFor, inSun, onGoal, job,
    setup(st, L) { setup(st, L); },
    room(k, L) { room(G.mst, L, k); },
    step(dt) {
      const st = G.mst;
      if (!st.isles) return;
      stepAll(st, dt);
      if (st.goNext) {
        st.goNext = false;
        const L = G.level;
        if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear();
        return;
      }
      if (st.tick % 15 === 0) actLabels(st);
    },
    draw() { const st = G.mst; if (st.isles) drawWorld(st); },
    drawTop() { const st = G.mst; if (st.isles) drawTop(st); },
    hud() { const st = G.mst; if (st.isles) drawHud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const b = s.boings[0] + s.boings[1];
      const words = b === 0 ? 'Not one Boing! Master bridge builders!' : b <= 3 ? 'Puff, step, puff, step: lovely teamwork!' : 'Lots of Boings, and you made it to the castle together!';
      const gold = st.goldUsed.length ? ' · Gold help: ' + [...new Set(st.goldUsed.map(k => (k === 'wind' ? 'Gold puffs' : 'Gold clouds')))].join(', ') : '';
      return [
        { label: 'Boings', values: s.boings.slice() },
        { label: 'Clouds puffed', values: s.puffs.slice() },
        { label: 'Clouds called', values: s.calls.slice() },
        words + ' Stars: ' + s.stars + ' of ' + s.starsTotal + (s.blown ? ' · Blown away: ' + s.blown : '') + gold,
      ];
    },
  };

  /* ===================================== drawing ===================================== */
  const LOOK = {
    meadow: { grass: '#8fe3a0', grassD: '#4fb276', rock: '#a29fd6', rockD: '#7c78bc', rockE: '#5c5898', flower: ['#ff8fc7', '#ffe07a', '#ffffff'] },
    stairs: { grass: '#a8eab0', grassD: '#5fbf80', rock: '#b6a4dc', rockD: '#8e7cc2', rockE: '#6a5aa0', flower: ['#ffb3d9', '#ffffff', '#c6a8ff'] },
    windy: { grass: '#9fe2c0', grassD: '#55b08c', rock: '#9aa6d8', rockD: '#7482bc', rockE: '#56609a', flower: ['#ffffff', '#ffe07a', '#9fd8ff'] },
    sunny: { grass: '#b8eb8a', grassD: '#7cbc52', rock: '#c4a8d8', rockD: '#9c80bc', rockE: '#76609a', flower: ['#ffd36b', '#ff9a7a', '#ffffff'] },
  };
  let skyG = null, skyLook = '';
  function drawWorld(st) {
    const t = G.clock, lk = LOOK[st.look] || LOOK.meadow;
    drawSky(st, t);
    ctx.save(); ctx.translate(-st.camX, 0);
    for (const z of st.zones) if (z.kind === 'sun' && z.x1 > st.camX - 100 && z.x0 < st.camX + W + 100) drawSunRays(st, z, t);
    for (const s of st.isles) if (s.x1 > st.camX - 140 && s.x0 < st.camX + W + 140) { if (s.kind === 'lift') drawLift(st, s, lk, t); else drawIsle(st, s, lk, t); }
    for (const z of st.zones) if (z.kind === 'wind' && z.x1 > st.camX - 100 && z.x0 < st.camX + W + 100) drawWind(st, z, t);
    for (const sg of st.signs) if (sg.x > st.camX - 200 && sg.x < st.camX + W + 200) drawSign(st, sg);
    const gi = st.goalIsle;
    if (gi.castle) drawCastle(st, gi, t); else drawFlag(flagX(st), gi.top, t);
    for (const m of st.marks) drawMark(st, m, t);
    for (const c of st.clouds) drawCloud(st, c, t);
    for (const s of st.stars) drawStar(s, t);
    ctx.restore();
  }
  function drawSky(st, t) {
    if (!skyG || skyLook !== st.look) {
      skyLook = st.look;
      skyG = ctx.createLinearGradient(0, 0, 0, H);
      const top = st.look === 'sunny' ? '#62b8f0' : st.look === 'windy' ? '#6aaee6' : '#5ab4f2';
      skyG.addColorStop(0, top); skyG.addColorStop(0.62, '#bfe0fb'); skyG.addColorStop(1, '#fff4e0');
    }
    ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, H);
    // the sun (bigger and warmer in the last stretch)
    const sx = 800 - (st.camX * 0.01) % 30, sy = 96, sun = st.look === 'sunny';
    ctx.fillStyle = 'rgba(255,236,170,' + (sun ? 0.4 : 0.26) + ')'; circle(sx, sy, sun ? 110 : 84); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,200,0.6)'; circle(sx, sy, sun ? 70 : 54); ctx.fill();
    ctx.fillStyle = '#fff6d0'; circle(sx, sy, sun ? 48 : 38); ctx.fill();
    if (sun) { // a friendly face
      ctx.fillStyle = '#c98a3a'; circle(sx - 14, sy - 6, 3.4); ctx.fill(); circle(sx + 14, sy - 6, 3.4); ctx.fill();
      ctx.strokeStyle = '#c98a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy + 4, 14, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,140,120,0.4)'; circle(sx - 24, sy + 6, 5); ctx.fill(); circle(sx + 24, sy + 6, 5); ctx.fill();
    }
    // far floating islands (slow parallax)
    const far = st.camX * 0.18;
    for (let k = -1; k < 8; k++) {
      const span = 1400, x = ((k * 230 - far) % span + span) % span - 150, y = 230 + (hash(k + 40, 3) % 70);
      const w = 60 + hash(k, 9) % 50;
      ctx.fillStyle = 'rgba(200,196,236,0.55)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.quadraticCurveTo(x + w * 0.7, y + 18, x + w * 0.5, y + 34); ctx.quadraticCurveTo(x + w * 0.3, y + 18, x, y); ctx.fill();
      ctx.fillStyle = 'rgba(176,226,190,0.7)'; rr(x - 2, y - 4, w + 4, 7, 3); ctx.fill();
    }
    // the far Cloud Castle in the last stretch
    if (st.look === 'sunny') {
      const cx = 620 - st.camX * 0.06;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(cx - 40, 150, 80, 50); ctx.fillRect(cx - 60, 130, 20, 70); ctx.fillRect(cx + 40, 130, 20, 70); ctx.fillRect(cx - 12, 110, 24, 40);
      ctx.fillStyle = 'rgba(255,170,200,0.6)';
      for (const [x, y, w] of [[cx - 60, 130, 20], [cx + 40, 130, 20], [cx - 12, 110, 24]]) { ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + w / 2, y - 22); ctx.lineTo(x + w + 3, y); ctx.fill(); }
      cloudShape(cx, 205, 2.2, 'rgba(255,255,255,0.7)');
    }
    // drifting clouds
    for (let k = 0; k < 7; k++) {
      const span = 1500, x = ((k * 241 - st.camX * (0.08 + (k % 3) * 0.04) - t * (6 + k)) % span + span) % span - 200, y = 50 + (k % 4) * 44 + (hash(k, 5) % 24);
      cloudShape(x, y, 0.6 + (k % 3) * 0.25, 'rgba(255,255,255,' + (0.5 + (k % 2) * 0.25) + ')');
    }
    // the soft cloud sea far below (the safety clouds live there)
    const off = (st.camX * 0.5) % 120;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let k = -1; k < 11; k++) { const x = k * 120 - off; circle(x, 540, 56 + (k % 3) * 8); ctx.fill(); }
    ctx.fillStyle = 'rgba(236,232,255,0.9)'; ctx.fillRect(0, 528, W, 12);
  }
  function cloudShape(x, y, s, col) {
    ctx.fillStyle = col;
    circle(x, y, 18 * s); ctx.fill(); circle(x + 20 * s, y - 8 * s, 22 * s); ctx.fill(); circle(x + 42 * s, y, 16 * s); ctx.fill();
    rr(x - 10 * s, y - 2 * s, 66 * s, 16 * s, 8 * s); ctx.fill();
  }
  function drawIsle(st, s, lk, t) {
    const x0 = s.x0, x1 = s.x1, y = s.top, w = x1 - x0, depth = Math.min(150, 50 + w * 0.22);
    // the rock body, tapering to a point
    ctx.fillStyle = lk.rock;
    ctx.beginPath(); ctx.moveTo(x0, y + 4); ctx.lineTo(x1, y + 4);
    ctx.quadraticCurveTo(x1 - 4, y + depth * 0.45, x0 + w * 0.6, y + depth * 0.85);
    ctx.quadraticCurveTo(x0 + w * 0.5, y + depth * 1.05, x0 + w * 0.42, y + depth * 0.85);
    ctx.quadraticCurveTo(x0 + 4, y + depth * 0.45, x0, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lk.rockD;
    ctx.beginPath(); ctx.moveTo(x0 + w * 0.5, y + 10); ctx.lineTo(x1 - 2, y + 10);
    ctx.quadraticCurveTo(x1 - 6, y + depth * 0.45, x0 + w * 0.6, y + depth * 0.85);
    ctx.quadraticCurveTo(x0 + w * 0.52, y + depth * 0.98, x0 + w * 0.5, y + depth * 0.7); ctx.closePath(); ctx.fill();
    // little rock stripes and a dangling crystal
    ctx.fillStyle = lk.rockE;
    for (let k = 0; k < Math.floor(w / 70); k++) { const rx = x0 + 24 + k * 70 + (hash(s.seed, k) % 20); rr(rx, y + 22 + (k % 2) * 14, 22, 4, 2); ctx.fill(); }
    ctx.fillStyle = '#e6dcff'; const cxr = x0 + w * 0.47;
    ctx.beginPath(); ctx.moveTo(cxr - 5, y + depth * 0.9); ctx.lineTo(cxr + 5, y + depth * 0.9); ctx.lineTo(cxr, y + depth * 1.05 + 8); ctx.fill();
    // the grass top
    ctx.fillStyle = lk.grassD; rr(x0 - 3, y - 2, w + 6, 14, 6); ctx.fill();
    ctx.fillStyle = lk.grass; rr(x0 - 3, y - 3, w + 6, 10, 5); ctx.fill();
    for (let k = 0; k < w / 16; k++) { ctx.fillStyle = lk.grassD; const gx = x0 + 6 + k * 16 + (hash(s.seed, k + 50) % 8); ctx.beginPath(); ctx.moveTo(gx, y + 9); ctx.lineTo(gx + 4, y + 16); ctx.lineTo(gx + 8, y + 9); ctx.fill(); }
    // flowers, bushes and the odd round tree
    for (let k = 0; k < Math.floor(w / 46); k++) {
      const h = hash(s.seed, k + 7), fx = x0 + 14 + (h % Math.max(1, w - 28));
      if (Math.abs(fx - (s.spring || -999)) < 30) continue;
      if (s.flag && Math.abs(fx - flagX(st)) < 30) continue;
      if (h % 7 === 0 && w > 200 && !s.castle) {
        ctx.fillStyle = '#9a6a4a'; ctx.fillRect(fx - 3, y - 26, 6, 24);
        ctx.fillStyle = lk.grassD; circle(fx, y - 34, 16); ctx.fill(); ctx.fillStyle = lk.grass; circle(fx - 4, y - 38, 11); ctx.fill();
      } else if (h % 3 === 0) {
        ctx.fillStyle = lk.grassD; circle(fx, y - 4, 8); ctx.fill(); circle(fx + 8, y - 3, 6); ctx.fill();
      } else {
        ctx.strokeStyle = lk.grassD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx, y - 9); ctx.stroke();
        ctx.fillStyle = lk.flower[h % lk.flower.length]; circle(fx, y - 11, 3.4); ctx.fill();
        ctx.fillStyle = '#ffe07a'; circle(fx, y - 11, 1.3); ctx.fill();
      }
    }
    if (s.spring != null) drawSpring(s.spring, y, s.springT || 9, t);
  }
  function drawSpring(x, y, k, t) {
    const sq = k < 0.3 ? Math.sin(k / 0.3 * Math.PI) * 10 : 0;
    const cols = ['#ff6b6b', '#ffb347', '#ffe066', '#7ddc7d', '#6bb7ff', '#b38bff'];
    // a rainbow coil
    for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i]; rr(x - 15, y - 6 - i * (4 + sq * 0.15), 30, 4, 2); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; rr(x - 18, y - 32 - sq * 0.9, 36, 7, 3.5); ctx.fill();
    ctx.strokeStyle = '#ff8fc7'; ctx.lineWidth = 2; rr(x - 18, y - 32 - sq * 0.9, 36, 7, 3.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(t * 5)) + ')'; circle(x + 10, y - 40, 2); ctx.fill();
  }
  function drawLift(st, s, lk, t) {
    // a puffy cloud pillar with an island lid
    const x0 = s.x0, x1 = s.x1, w = x1 - x0, y = s.top;
    // (the pillar reaches down into the cloud sea; it looks the same however high the lid is)
    for (let k = 0; y + 14 + k * 22 < H + 30; k++) {
      const yy = y + 14 + k * 22, wob = Math.sin(t * 2 + k * 1.1) * 3;
      ctx.fillStyle = '#dfe2f8'; circle(x1 - 14 - wob, yy + 10, 18); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(x0 + 16 + wob, yy, 18); ctx.fill(); circle((x0 + x1) / 2, yy + 4, 21); ctx.fill();
    }
    ctx.fillStyle = lk.rock; rr(x0 - 2, y + 2, w + 4, 16, 6); ctx.fill();
    ctx.fillStyle = lk.grassD; rr(x0 - 4, y - 2, w + 8, 12, 6); ctx.fill();
    ctx.fillStyle = lk.grass; rr(x0 - 4, y - 3, w + 8, 8, 4); ctx.fill();
    // up / down arrows that light when it moves
    const up = s.vy < -1, down = s.vy > 1;
    ctx.fillStyle = up ? C.gold : 'rgba(120,110,190,0.45)';
    ctx.beginPath(); ctx.moveTo((x0 + x1) / 2 - 10, y + 44); ctx.lineTo((x0 + x1) / 2, y + 32); ctx.lineTo((x0 + x1) / 2 + 10, y + 44); ctx.fill();
    ctx.fillStyle = down ? C.gold : 'rgba(120,110,190,0.45)';
    ctx.beginPath(); ctx.moveTo((x0 + x1) / 2 - 10, y + 52); ctx.lineTo((x0 + x1) / 2, y + 64); ctx.lineTo((x0 + x1) / 2 + 10, y + 52); ctx.fill();
  }
  // a sign's words with each player's own keys ({Ca} {Cu} the caller's action and ▲, {Ba} the builder's action);
  // a sign that names the computer's keys shows its other words instead (what the computer does)
  function signText(st, sg) {
    const who = /\{C[au]\}/.test(sg.raw) ? st.caller : /\{Ba\}/.test(sg.raw) ? st.builder : -1;
    if (who >= 0 && isCpu(who) && sg.alt) return sg.alt;
    return sg.raw.replace(/\{Ca\}/g, key(st.caller, 'act')).replace(/\{Cu\}/g, key(st.caller, 'up')).replace(/\{Ba\}/g, key(st.builder, 'act'));
  }
  function drawSign(st, sg) {
    const tx = signText(st, sg);
    let fs = 12;
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const tw = ctx.measureText(tx).width;
    if (tw > 280) { fs = Math.max(9, Math.floor(fs * 280 / tw)); ctx.font = '700 ' + fs + 'px ' + FONT; }
    const w = ctx.measureText(tx).width + 18, h = 22, x = sg.x - w / 2, y = sg.y - 58;
    ctx.fillStyle = '#9a6a42'; ctx.fillRect(sg.x - 3, y + h, 6, sg.y - y - h);
    ctx.fillStyle = '#f2d9a8'; rr(x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = '#9a6a42'; ctx.lineWidth = 2; rr(x, y, w, h, 6); ctx.stroke();
    text(tx, sg.x, y + h / 2 + 0.5, fs, '#5a3a22', 'center', 'body');
  }
  function drawFlag(x, y, t) {
    ctx.fillStyle = '#7a6a8a'; ctx.fillRect(x - 2, y - 92, 4, 92);
    ctx.fillStyle = C.gold; circle(x, y - 94, 4); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x + 2, y - 88);
    for (let k = 0; k <= 8; k++) ctx.lineTo(x + 2 + k * 5, y - 88 + Math.sin(t * 6 + k * 0.8) * 2.5);
    for (let k = 8; k >= 0; k--) ctx.lineTo(x + 2 + k * 5, y - 62 + Math.sin(t * 6 + k * 0.8) * 2.5);
    ctx.closePath(); ctx.fill();
    starPath(x + 22, y - 75 + Math.sin(t * 6 + 3) * 2, 6, 2.6); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
  function drawCastle(st, s, t) {
    const x = s.x0 + 230, y = s.top, open = st.state === 'end' ? clamp((st.endT - 0.5) / 1.2, 0, 1) : 0;
    // walls and towers
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 10, y - 120, 220, 120);
    ctx.fillStyle = '#e6e2fa'; ctx.fillRect(x - 10, y - 30, 220, 30);
    for (const [tx, tw, th] of [[x - 40, 46, 170], [x + 194, 46, 170], [x + 78, 54, 210]]) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(tx, y - th, tw, th);
      ctx.fillStyle = '#ff9fc4'; ctx.beginPath(); ctx.moveTo(tx - 8, y - th); ctx.lineTo(tx + tw / 2, y - th - 46); ctx.lineTo(tx + tw + 8, y - th); ctx.fill();
      ctx.fillStyle = '#9fd0f0'; rr(tx + tw / 2 - 7, y - th + 24, 14, 20, 7); ctx.fill();
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(tx + tw / 2, y - th - 46); ctx.lineTo(tx + tw / 2, y - th - 66); ctx.lineTo(tx + tw / 2 + 16, y - th - 60 + Math.sin(t * 6 + tx) * 2); ctx.lineTo(tx + tw / 2, y - th - 54); ctx.fill();
    }
    for (let k = 0; k < 9; k++) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 10 + k * 25, y - 132, 14, 14); }
    // the gate
    ctx.fillStyle = '#b58ad6'; rr(x + 78, y - 76, 54, 76, 26); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; rr(x + 82, y - 72, 46, 72, 22); ctx.fill();
    ctx.fillStyle = '#8a62b0';
    const gw = 23 * (1 - open);
    if (gw > 0.5) { ctx.fillRect(x + 82, y - 60, gw, 60); ctx.fillRect(x + 128 - gw, y - 60, gw, 60); }
    // puffy clouds round its feet
    for (let k = 0; k < 6; k++) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; circle(x - 40 + k * 52, y + 2, 20); ctx.fill(); }
    drawFlag(flagX(st), y, t);
  }
  function drawSunRays(st, z, t) {
    ctx.save();
    const cx = (z.x0 + z.x1) / 2, w = z.x1 - z.x0;
    for (let k = 0; k < 4; k++) {
      const a = 0.12 + 0.06 * Math.sin(t * 1.6 + k * 1.7), x = z.x0 + (k + 0.5) * w / 4;
      ctx.fillStyle = 'rgba(255,214,110,' + a + ')';
      ctx.beginPath(); ctx.moveTo(x - 30 + 60, 0); ctx.lineTo(x + 40 + 60, 0); ctx.lineTo(x + 26, 520); ctx.lineTo(x - 26, 520); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,230,150,0.18)'; ctx.fillRect(z.x0, 0, w, 520);
    // a little sun badge over the gap
    const by = 150 + Math.sin(t * 2) * 3;
    ctx.fillStyle = '#ffd36b'; circle(cx, by, 13); ctx.fill();
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 17, by + Math.sin(a) * 17); ctx.lineTo(cx + Math.cos(a) * 23, by + Math.sin(a) * 23); ctx.stroke(); }
    ctx.fillStyle = '#c98a3a'; circle(cx - 4, by - 2, 1.6); ctx.fill(); circle(cx + 4, by - 2, 1.6); ctx.fill();
    ctx.restore();
  }
  function drawWind(st, z, t) {
    const w = windState(st, z), g = st.gaps[z.gap], A = st.isles[g.a];
    // the windsock on the island before the gap: droops in the calm, lifts in a gust
    const px = A.x1 - 22, py = A.top;
    const lift = w.s === 'blow' ? 1 : w.s === 'warn' ? 0.35 + 0.25 * Math.sin(t * 9) : 0;
    ctx.fillStyle = '#8a7a9a'; ctx.fillRect(px - 2, py - 70, 4, 70);
    ctx.save(); ctx.translate(px + 2, py - 66); ctx.rotate(lerp(1.25, 0.05, lift) + Math.sin(t * (w.s === 'blow' ? 14 : 3)) * 0.06);
    const segs = ['#ff6b6b', '#ffffff', '#ff6b6b', '#ffffff'];
    for (let k = 0; k < 4; k++) { ctx.fillStyle = segs[k]; ctx.beginPath(); ctx.moveTo(k * 9, -7 + k * 0.8); ctx.lineTo(k * 9 + 9, -6.2 + k * 0.8); ctx.lineTo(k * 9 + 9, 6.2 - k * 0.8); ctx.lineTo(k * 9, 7 - k * 0.8); ctx.fill(); }
    ctx.restore();
    if (g.gold) return;
    // gust streaks across the gap
    if (w.s === 'blow' || w.s === 'warn') {
      const n = w.s === 'blow' ? 10 : 3;
      ctx.strokeStyle = 'rgba(255,255,255,' + (w.s === 'blow' ? 0.85 : 0.45) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let k = 0; k < n; k++) {
        const span = z.x1 - z.x0 + 200, xx = z.x0 - 100 + ((t * 520 + k * 97) % span), yy = 150 + ((k * 61) % 260);
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + 30, yy - 8, xx + 60, yy); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
  }
  function drawCloud(st, c, t) {
    const left = c.life, wob = left < CB.wobble ? Math.sin(t * 34 + c.seed) * (1.6 + (CB.wobble - left) * 1.2) : 0;
    const thin = left < 0.8 ? clamp(left / 0.8, 0.25, 1) : 1;
    const born = clamp(c.t / 0.16, 0, 1);
    const x0 = c.x0 + wob, w = c.x1 - c.x0, y = c.top, h = c.h * thin;
    ctx.save();
    ctx.globalAlpha = (c.state === 'forming' ? 0.55 : 1) * (0.4 + 0.6 * born);
    const body = c.gold ? '#fff1b0' : c.sun ? '#fffaf0' : '#ffffff', shade = c.gold ? '#f0cc5a' : '#d8dcf6';
    ctx.fillStyle = shade; rr(x0, y + 3, w, h, Math.min(10, h / 2)); ctx.fill();
    ctx.fillStyle = body; rr(x0, y, w, h - 4 * thin, Math.min(10, h / 2)); ctx.fill();
    const bumps = Math.max(1, Math.round(w / 22));
    for (let k = 0; k < bumps; k++) { const bx = x0 + (k + 0.5) * w / bumps; circle(bx, y + 3, Math.min(10, w / bumps / 2 + 1) * (0.8 + 0.2 * thin)); ctx.fill(); }
    if (c.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x0, y - 4, w, h + 6, 10); ctx.stroke(); if (Math.sin(t * 5 + c.seed) > 0.6) { ctx.fillStyle = '#ffffff'; starPath(x0 + w * 0.7, y - 2, 4, 1.6); ctx.fill(); } }
    // a sleepy little face that worries as it melts
    if (w > 40 && thin > 0.6) {
      ctx.fillStyle = 'rgba(90,80,140,0.55)';
      const fx = x0 + w / 2, fy = y + h * 0.5;
      if (left < CB.wobble) { circle(fx - 7, fy - 1, 1.8); ctx.fill(); circle(fx + 7, fy - 1, 1.8); ctx.fill(); ctx.beginPath(); ctx.ellipse(fx, fy + 4, 2.4, 2, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(90,80,140,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(fx - 7, fy - 1, 2.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(fx + 7, fy - 1, 2.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(fx, fy + 2, 3, 0.2, Math.PI - 0.2); ctx.stroke(); }
    }
    // melt drips in the sun
    if (c.sun && !c.gold) { ctx.fillStyle = 'rgba(160,200,255,0.8)'; const dy = (t * 50 + c.seed * 3) % 26; circle(x0 + w * 0.3, y + h + dy, 2); ctx.fill(); }
    ctx.restore();
  }
  function drawMark(st, m, t) {
    const x0 = m.x0, w = m.x1 - m.x0, y = m.top, col = PCOL[m.by];
    ctx.save();
    ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; rr(x0 + 2, y, w - 4, CB.bh, 9); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(x0 + 2, y, w - 4, CB.bh, 9); ctx.fill();
    // the bobbing flag ping
    const fx = x0 + w / 2, bob = Math.sin(t * 5 + m.id) * 4, fy = y - 12 + bob;
    const ring = (t * 1.4 + m.id * 0.3) % 1;
    ctx.strokeStyle = 'rgba(255,255,255,' + (1 - ring) * 0.8 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(fx, y + CB.bh / 2, 10 + ring * 26, 4 + ring * 9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#6a5a7a'; ctx.fillRect(fx - 1.5, fy - 30, 3, 30);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(fx + 1.5, fy - 30);
    for (let k = 0; k <= 4; k++) ctx.lineTo(fx + 1.5 + k * 4.5, fy - 30 + Math.sin(t * 8 + k) * 1.5);
    for (let k = 4; k >= 0; k--) ctx.lineTo(fx + 1.5 + k * 4.5, fy - 17 + Math.sin(t * 8 + k) * 1.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(fx, fy - 31, 2.6); ctx.fill();
    ctx.restore();
  }
  function starPath(x, y, ro, ri) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }
  function drawStar(s, t) {
    if (s.got) return;
    const y = s.y + Math.sin(t * 3) * 3;
    ctx.fillStyle = 'rgba(255,215,90,0.3)'; circle(s.x, y, 22 + Math.sin(t * 4) * 2); ctx.fill();
    ctx.fillStyle = C.gold; starPath(s.x, y, 14, 6); ctx.fill();
    ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2; starPath(s.x, y, 14, 6); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(s.x - 4, y - 4, 2); ctx.fill();
  }
  // the cloud machine: a little bellows on a box, carried by the builder
  function drawMachine(x, y, face, sq, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    const squeeze = sq > 0 ? Math.sin((1 - sq / 0.32) * Math.PI) : 0;
    // the box
    ctx.fillStyle = '#f6efdf'; rr(-6, -2, 18, 14, 4); ctx.fill();
    ctx.strokeStyle = '#8a6a9a'; ctx.lineWidth = 1.5; rr(-6, -2, 18, 14, 4); ctx.stroke();
    ctx.fillStyle = col; circle(3, 5, 3); ctx.fill();
    // bellows folds (squash on a squeeze)
    const bw = 12 - squeeze * 5, bx = 12;
    ctx.fillStyle = '#ff9fc4'; ctx.strokeStyle = '#c0628a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(bx, -4);
    const folds = 4;
    for (let k = 0; k <= folds; k++) ctx.lineTo(bx + k * bw / folds, k % 2 ? -1 : -5);
    ctx.lineTo(bx + bw, 13);
    for (let k = folds; k >= 0; k--) ctx.lineTo(bx + k * bw / folds, k % 2 ? 10 : 14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // the funnel
    ctx.fillStyle = '#e8c070'; ctx.beginPath(); ctx.moveTo(bx + bw, 2); ctx.lineTo(bx + bw + 8, -2); ctx.lineTo(bx + bw + 8, 12); ctx.lineTo(bx + bw, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a07a30'; ctx.stroke();
    // the handle on top
    ctx.strokeStyle = '#8a6a9a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(3, -2, 5, Math.PI, 0); ctx.stroke();
    ctx.restore();
  }
  // the caller's little "here!" pointer flag
  function drawPointer(x, y, face, wave, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(face * (-0.35 - (wave > 0 ? Math.sin(wave * 20) * 0.3 : 0)));
    ctx.fillStyle = '#6a5a7a'; ctx.fillRect(-1.2, -26, 2.4, 26);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(1, -26); ctx.lineTo(1 + 14 * face, -21 + Math.sin(t * 7) * 1.2); ctx.lineTo(1, -16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  function drawTop(st) {
    const t = G.clock, bg = big();
    ctx.save(); ctx.translate(-st.camX, 0);
    // players in a Boing: the safety cloud and the bounce
    for (const p of G.players) {
      const w = st.pl[p.id].boing;
      if (!w) continue;
      const a = clamp(Math.min(w.t / 0.25, (CB.boingT - w.t) / 0.4), 0, 1), sq = w.t > 0.5 && w.t < 0.75 ? Math.sin((w.t - 0.5) / 0.25 * Math.PI) : 0;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff';
      ctx.save(); ctx.translate(w.x0, CB.cushionY); ctx.scale(1 + sq * 0.15, 1 - sq * 0.25);
      circle(-30, 4, 22); ctx.fill(); circle(0, -6, 28); ctx.fill(); circle(30, 4, 22); ctx.fill(); rr(-50, 0, 100, 24, 12); ctx.fill();
      ctx.fillStyle = 'rgba(90,80,140,0.55)'; circle(-9, -4, 2.4); ctx.fill(); circle(9, -4, 2.4); ctx.fill();
      ctx.strokeStyle = 'rgba(90,80,140,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 2, 6, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,140,170,0.4)'; circle(-17, 2, 4); ctx.fill(); circle(17, 2, 4); ctx.fill();
      ctx.restore(); ctx.restore();
      const q = boingPos(st, w);
      drawPlayer(Object.assign({}, p, { alive: true, x: q.x - PW / 2, y: q.y - PH / 2, w: PW, h: PH, vx: 0, vy: w.t > 0.7 ? -200 : 200, sx: 1 + q.sq, sy: 1 - q.sq * 0.6, stun: 0 }));
    }
    // reach lines from the cloud machine to the flags
    const b = G.players[st.builder], B = st.pl[st.builder];
    if (b.alive && !B.boing && st.state === 'play') {
      const n = nozzle(st, { x: b.x + st.camX, y: b.y, w: b.w, face: b.face });
      for (const m of st.marks) {
        if (m.puffing) continue;
        const c = markC(m), ok = dist(n, c) <= CB.range;
        ctx.save(); ctx.setLineDash(ok ? [2, 6] : [8, 8]); ctx.strokeStyle = ok ? 'rgba(255,255,255,0.85)' : 'rgba(255,110,110,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.quadraticCurveTo((n.x + c.x) / 2, Math.min(n.y, c.y) - 40, c.x, c.y); ctx.stroke(); ctx.restore();
        break;
      }
    }
    // the props: the builder's cloud machine, the caller's pointer flag
    for (const p of G.players) {
      if (!p.alive) continue;
      const P = st.pl[p.id], x = p.x + st.camX + p.w / 2;
      if (p.id === st.builder) drawMachine(x + p.face * 2, p.y + 9, p.face, P.squeezeT, t, PCOL[p.id]);
      else drawPointer(x - p.face * 6, p.y + 12, p.face, P.waveT, t, PCOL[p.id]);
    }
    // the aim ghost
    const cp = G.players[st.caller], CP = st.pl[st.caller];
    if (CP.aim && CP.aim.t > CB.aimShow && cp.alive) {
      const s = spot(st, Object.assign({}, cp, { x: cp.x + st.camX }), CP.aim.off);
      if (!s.why) {
        ctx.save(); ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 10);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; rr(s.x0 + 2, s.top, s.x1 - s.x0 - 4, CB.bh, 9); ctx.fill();
        ctx.strokeStyle = PCOL[st.caller]; ctx.lineWidth = 3; rr(s.x0 + 2, s.top, s.x1 - s.x0 - 4, CB.bh, 9); ctx.stroke();
        ctx.restore();
        text(CP.aim.off < 0 ? '▲' : CP.aim.off > 0 ? '▼' : '●', (s.x0 + s.x1) / 2, s.top + CB.bh / 2 + 1, 14, PCOL[st.caller], 'center', 'body');
      }
    }
    // puffs flying, blown bits, little particles
    for (const q of st.puffs) {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.sin(q.spin) * 0.2);
      ctx.fillStyle = q.gold ? '#fff1b0' : '#ffffff';
      circle(-7, 2, 8); ctx.fill(); circle(0, -4, 10); ctx.fill(); circle(8, 2, 7); ctx.fill();
      if (q.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; circle(0, -2, 13); ctx.stroke(); }
      ctx.restore();
    }
    for (const bb of st.blownBits) {
      ctx.save(); ctx.globalAlpha = clamp(1 - bb.t / 1.6, 0, 1); ctx.fillStyle = '#ffffff';
      circle(bb.x - 6, bb.y, 6 + bb.t * 6); ctx.fill(); circle(bb.x + 6, bb.y - 3, 5 + bb.t * 5); ctx.fill(); ctx.restore();
    }
    for (const q of st.parts) {
      const a = clamp(1 - q.t / q.life, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = q.kind === 'gold' ? C.gold : q.kind === 'air' ? 'rgba(220,230,255,0.9)' : '#ffffff';
      circle(q.x, q.y, q.r * (0.6 + 0.4 * a)); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // pops
    for (const q of st.pops) {
      const size = q.size * (bg ? 1.3 : 1);
      ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, st.camX + w / 2 + 6, st.camX + W - w / 2 - 6), y = Math.max(100, q.y - q.t * 26);
      ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.4 - q.t) / 0.4), 0, 1);
      bigText(q.s, x, y, Math.round(size), q.col);
      ctx.restore();
    }
    ctx.restore();
    // hint chips over each person
    if (st.state === 'play' && G.introT <= CB.introHold) {
      const boxes = [];
      for (const p of G.players) {
        const bb = isCpu(p.id) && typeof CPU !== 'undefined' && CPU.bubbles[p.id];
        if (!bb || bb.t <= 0 || !p.alive) continue;
        ctx.font = '700 ' + (bg ? 19 : 13) + 'px ' + FONT;
        const bw = ctx.measureText(bb.text).width + (bg ? 22 : 16), bh = bg ? 30 : 22;
        const bx = clamp(p.x + p.w / 2 - bw / 2, 4, W - bw - 4), by = clamp(p.y - 22 - bh, 4, H - bh - 4);
        boxes.push({ x0: bx, y0: by, x1: bx + bw, y1: by + bh + 6 });
      }
      for (const p of G.players) {
        if (!p.alive || isCpu(p.id)) continue;
        const P = st.pl[p.id], j = job(st, p.id);
        const k = j ? j.k : '';
        if (k !== P.chipKey) { P.chipKey = k; P.chipAt = G.time; }
        P.chipT = G.time - (P.chipAt || 0);
        const lines = j && jobText(st, p.id, j);
        if (!lines || !lines[0]) continue;
        const urgent = k === 'call' || k === 'puff' || k === 'callBack' || k === 'aiming' || k === 'wind' || k === 'cross' || k === 'closer' || k === 'waitCall' || k === 'liftCall';
        // (someone who has done the job a few times sees the "press" chips only when they wait too long)
        const done = p.id === st.caller ? st.stats.calls[p.id] : st.stats.puffs[p.id];
        if (urgent && done >= 4 && (k === 'call' || k === 'puff' || k === 'cross') && P.chipT < 2.5) continue;
        if (!urgent && !(P.chipT > CB.chipAgain || (st.k === 0 && P.chipT < 4))) continue;
        ctx.save(); if (P.chipT > CB.chipAgain) ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 5);
        boxes.push(chip(NAMES[p.id] + ': ' + lines[0], lines[1], p.x + p.w / 2, p.y - 30, PCOL[p.id], boxes));
        ctx.restore();
      }
    }
    if (st.state === 'end') {
      const k = clamp((st.endT - 0.8) / 0.3, 0, 1);
      if (k > 0) {
        bigText('Welcome to the Cloud Castle!', W / 2, 160, bg ? 40 : 38, C.gold, 0.6 + 0.4 * k);
        if (st.endT > 1.4) { pill(W / 2, 188, bg ? 390 : 320, 32, 'center'); text('Every bridge built together!', W / 2, 204, bg ? 21 : 17, C.paper, 'center', 'body'); }
      }
    }
  }
  function chip(t1, t2, x, y, col, avoid) {
    const z = big() ? 1.45 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
    ctx.font = '700 ' + f1 + 'px ' + FONT;
    let w = ctx.measureText(t1).width;
    if (t2) { ctx.font = '700 ' + f2 + 'px ' + FONT; w = Math.max(w, ctx.measureText(t2).width); }
    w = Math.min(W - 16, w + 22 * z); const h = (t2 ? 38 : 22) * z;
    const x0 = clamp(x - w / 2, 8, W - 8 - w);
    let y0 = clamp(y - h, 92, H - 8 - h);
    for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = b.y0 - h - 6 >= 92 ? b.y0 - h - 6 : b.y1 + 6;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y0, w, h, 10 * z); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x0, y0, w, h, 10 * z); ctx.stroke();
    text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
    if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
    return { x0, y0, x1: x0 + w, y1: y0 + h };
  }

  /* ---------- the HUD ---------- */
  function drawHud(st) {
    const bg = big(), fs = bg ? 20 : 14, h = bg ? 40 : 28;
    const bo = st.stats.boings[0] + st.stats.boings[1];
    const got = st.stars.filter(s => s.got).length;
    const parts = [[fmtTime(G.time), C.paper], ['Boings ' + bo, bo ? '#ffe9a8' : C.paper]];
    if (st.stars.length) parts.push(['★ ' + got + '/' + st.stars.length, got ? C.gold : C.paper]);
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs;
    const w = ws.reduce((a, b) => a + b, 0) + gap * (parts.length - 1) + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    let x = x0 + 15;
    parts.forEach((q, i) => { text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap; });
    // the stretch map: islands, gaps, Pip, Bo and the flag
    const mw = bg ? 220 : 280, mh = bg ? 30 : 24, mx = W / 2 - mw / 2 + (bg ? 40 : 10), my = 12;
    ctx.fillStyle = 'rgba(28,26,54,0.72)'; rr(mx - 10, my, mw + 20, mh + 4, (mh + 4) / 2); ctx.fill();
    const sx = v => mx + clamp(v / Math.max(1, st.len), 0, 1) * mw, ry = my + mh / 2 + 5;
    for (const s of st.isles) { ctx.fillStyle = s === st.goalIsle ? '#ffd27a' : s.kind === 'lift' ? '#ffffff' : '#8fe3a0'; rr(sx(s.x0), ry - 2 - (380 - s.top) * 0.03, Math.max(2, sx(s.x1) - sx(s.x0)), 5, 2); ctx.fill(); }
    for (const g of st.gaps) if (g.gold) { ctx.fillStyle = C.gold; ctx.fillRect(sx(g.x0), ry + 4, Math.max(2, sx(g.x1) - sx(g.x0)), 2); }
    G.players.forEach((p, i) => {
      const xx = sx(wx(st, p));
      ctx.fillStyle = PCOL[i]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(xx, ry - 7 + (i ? 1 : -1), bg ? 6 : 4.5); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = C.gold; starPath(sx(flagX(st)), ry - 9, 5, 2.2); ctx.fill();
    // gold help chips under the time pill
    const chips = [];
    if (st.gaps.some(g => g.gold && g.goldWhy !== 'wind')) chips.push('GOLD CLOUDS');
    if (st.gaps.some(g => g.gold && g.goldWhy === 'wind')) chips.push('GOLD PUFFS');
    let cy2 = 12 + h + 6;
    for (const c of chips) {
      const fs2 = bg ? 15 : 11;
      ctx.font = '700 ' + fs2 + 'px ' + FONT;
      const w2 = ctx.measureText(c).width + 20;
      pill(W - 14, cy2, w2, fs2 + 10, 'right');
      text(c, W - 24, cy2 + (fs2 + 10) / 2 + 0.5, fs2, C.gold, 'right', 'body');
      cy2 += fs2 + 14;
    }
    // a wind warning sign while a windy gap is on screen
    if (st.state === 'play') {
      const z = st.zones.find(q => q.kind === 'wind' && !st.gaps[q.gap].gold && q.x0 < st.camX + W - 60 && q.x1 > st.camX + 60);
      if (z) {
        const ws2 = windState(st, z), sw = bg ? 230 : 190, sh = bg ? 58 : 46, bx = W - 20 - sw, by = cy2 + 6;
        const name = ws2.s === 'blow' ? 'WIND! Wait…' : ws2.s === 'warn' ? 'Wind coming!' : 'Calm: puff now!';
        const col = ws2.s === 'calm' ? '#7ddc9d' : ws2.s === 'warn' ? '#ffd36b' : '#ff8a8a';
        ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(bx, by, sw, sh, 12); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2; rr(bx, by, sw, sh, 12); ctx.stroke();
        text(name, bx + sw / 2, by + sh * 0.36, bg ? 19 : 15, col, 'center', 'body');
        const cyc = ws2.s === 'calm' ? CB.calm : ws2.s === 'warn' ? CB.warn : CB.blow;
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx + 14, by + sh - 16, sw - 28, 7, 3.5); ctx.fill();
        ctx.fillStyle = col; rr(bx + 14, by + sh - 16, Math.max(7, (sw - 28) * ws2.left / cyc), 7, 3.5); ctx.fill();
      }
    }
    // job panels, bottom corners
    for (const id of [0, 1]) {
      const caller = id === st.caller, cpu = isCpu(id);
      const t1 = NAMES[id] + (cpu ? ' (computer)' : '') + ' · ' + (caller ? 'CALLER' : 'BUILDER');
      const t2 = cpu ? (caller ? 'calls where the clouds go' : 'puffs the clouds') : (caller ? key(id, 'act') + ': call a cloud' : key(id, 'act') + ': puff a cloud');
      const pf = bg ? 17 : 13, pf2 = bg ? 15 : 12;
      ctx.font = '700 ' + pf + 'px ' + FONT;
      const pw = Math.max(ctx.measureText(t1).width, (ctx.font = '700 ' + pf2 + 'px ' + FONT, ctx.measureText(t2).width)) + 44;
      const ph = bg ? 50 : 40, px = id === 0 ? 12 : W - 12 - pw, py = H - ph - 10;
      ctx.fillStyle = 'rgba(28,26,54,0.72)'; rr(px, py, pw, ph, 12); ctx.fill();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2; rr(px, py, pw, ph, 12); ctx.stroke();
      // icon: a flag or a puff
      const ix = px + 18, iy = py + ph / 2;
      if (caller) { ctx.fillStyle = '#d9d3ef'; ctx.fillRect(ix - 5, iy - 11, 2.4, 22); ctx.fillStyle = PCOL[id]; ctx.beginPath(); ctx.moveTo(ix - 3, iy - 11); ctx.lineTo(ix + 9, iy - 6); ctx.lineTo(ix - 3, iy - 1); ctx.fill(); }
      else { ctx.fillStyle = '#ffffff'; circle(ix - 5, iy + 2, 5); ctx.fill(); circle(ix, iy - 3, 6); ctx.fill(); circle(ix + 6, iy + 2, 5); ctx.fill(); }
      text(t1, px + 34, py + ph * 0.32, pf, PCOL[id], 'left', 'body');
      text(t2, px + 34, py + ph * 0.72, pf2, C.paper, 'left', 'body');
    }
    // news
    const n = st.news;
    if (n && G.mode === 'play') {
      const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = bg ? 19 : 14, nh = bg ? 34 : 26, ny = bg ? 84 : 80;
      ctx.font = '700 ' + nfs + 'px ' + FONT;
      const nw = Math.min(W - 40, ctx.measureText(n.s).width + 32);
      const nx = bg ? W / 2 - 40 : W / 2;
      ctx.save(); ctx.globalAlpha = a;
      const px = pill(nx, ny, nw, nh, 'center');
      if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
      text(n.s, nx, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
      ctx.restore();
    }
  }

  /* ---------- sounds ---------- */
  Sfx.extra.cloudbridgeCall = function (p) { this.tone(880 * p, 0.07, 'triangle', 0.045, 1100 * p); this.tone(1320 * p, 0.09, 'triangle', 0.035, null, 0.07); };
  Sfx.extra.cloudbridgeAim = function (p) { this.tone(700 * p, 0.04, 'triangle', 0.03); };
  Sfx.extra.cloudbridgePuff = function (p) { this.tone(220 * p, 0.18, 'sine', 0.05, 520 * p); this.tone(1400, 0.08, 'triangle', 0.012, 2200, 0.03); };
  Sfx.extra.cloudbridgePfft = function (p) { this.tone(300 * p, 0.08, 'sine', 0.02, 200 * p); };
  Sfx.extra.cloudbridgePlop = function (p) { this.tone(520 * p, 0.1, 'sine', 0.05, 780 * p); this.tone(1040 * p, 0.08, 'sine', 0.03, null, 0.06); };
  Sfx.extra.cloudbridgePop = function () { this.tone(900, 0.06, 'sine', 0.035, 300); };
  Sfx.extra.cloudbridgeWhoosh = function () { this.tone(500, 0.35, 'sawtooth', 0.012, 1400); this.tone(300, 0.3, 'sine', 0.025, 900, 0.05); };
  Sfx.extra.cloudbridgeFall = function (p) { this.tone(700 * p, 0.4, 'sine', 0.045, 240 * p); };
  Sfx.extra.cloudbridgeBoing = function (p) { this.tone(200 * (p || 1), 0.28, 'sine', 0.06, 700 * (p || 1)); };
  Sfx.extra.cloudbridgeSpring = function (p) { this.tone(260 * p, 0.3, 'sine', 0.06, 900 * p); this.tone(520 * p, 0.25, 'triangle', 0.025, 1500 * p, 0.04); };
  Sfx.extra.cloudbridgeStar = function (p) { [988 * p, 1319 * p, 1568 * p].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.05)); };
  Sfx.extra.cloudbridgeLift = function () { this.tone(330, 0.06, 'sine', 0.018, 360); };
  Sfx.extra.cloudbridgeNo = function () { this.tone(260, 0.1, 'triangle', 0.03, 200); };
  Sfx.extra.cloudbridgeGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
  Sfx.extra.cloudbridgeClear = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.055, null, i * 0.08)); };
  Sfx.extra.cloudbridgeGate = function () { this.tone(196, 0.5, 'triangle', 0.05, 262); this.tone(392, 0.4, 'triangle', 0.03, 523, 0.2); };
  Sfx.extra.cloudbridgeWin = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, null, i * 0.1)); };
})();
