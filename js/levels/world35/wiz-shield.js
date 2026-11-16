/* Pip & Bo - Level 35-1 Moonwick Academy: class 8 'shield' (Shield Charm, spell Shield). */
'use strict';

/* ===== 35-1 class 8: Shield Charm (WIZ_PHASES.shield) ============================================================
   The practice range, scrolling right: 3 galleries of enchanted armor that fling sparks and pots. One holds the
   bubble, the other fights from inside it.

   THE TWO JOBS (room field `first` is the first SHIELDER; they swap at each gallery door)
   - SHIELDER (action word "shield"): HOLD the action for a gold bubble (WIZSH.r px round) centred on them. Its
     strength drains while held (WIZSH.drain s from full) and each hit off the thick patch takes a chunk; it refills
     in WIZSH.refill s when let go. At empty it pops ("Crack!") and needs the full refill. The thick patch faces the
     armor, or UP while up is held (for pots): a hit on it costs nothing and bounces the spark back at its thrower.
   - ZAPPER (action word "zap"): UP / DOWN aim the wand in 5 steps (an aim line shows it); the action fires a bolt
     (WIZSH.rest s rest), but only from inside the bubble: outside it the wand fizzles. 3 bolts in an armor's glowing
     chest gem and it falls into a clattering heap (its gate opens).
   Neither jumps here. HAZARDS (all telegraphed): sparks, aimed by a line of light WIZSH.warn s ahead; pots lobbed in
   an arc with a shadow where they land (step out of it, or the up-tilted patch stops them). The captain (gallery 3)
   keeps a shield over its gem that only opens for WIZSH.capOpen s when a bounced spark hits it.
   FAILS: a hit outside the bubble knocks that wizard back behind the gallery's pillar (no Oops); both knocked back
   inside 5 s is an Oops. GOLD HELP after WIZ.goldAfter Oops in a gallery: the bubble drains at half speed.
   Stats (st.stats.shield): bolts, blocks, knocks.   Names: wizSh* / WIZSH*. */
const WIZSH = {
  floor: 430, gal: 1300, r: 72, drain: 5, refill: 3, hit: 0.2, potHit: 0.4,
  rest: 0.3, bolt: 640, aims: [-0.4, -0.2, -0.08, 0, 0.1], gemR: 24, gemHits: 3, capHits: 5,
  spark: 360, warn: 0.9, pot: { t: 1.3, warn: 1.2 }, capOpen: 4, both: 5,
  every: [2.4, 2.0, 1.8],
};
const WIZSH_NEWS = ['Gallery 1: one suit of armor. Shield up, then zap its gem!', 'Gallery 2: two of them, one up high, and it throws pots. Tilt the shield UP for pots!', 'Gallery 3: the captain! Bounce a spark off the thick patch to open its shield.'];

function wizShSetup(st, L) {
  const ph = st.ph;
  ph.sh = L.def.first || 0; ph.zp = 1 - ph.sh;
  ph.t = 0; ph.gal = 0; ph.bar = 1; ph.popped = false; ph.on = false; ph.aim = 2; ph.restT = 0; ph.knockAt = [-99, -99];
  ph.gold = false; ph.done = false; ph.swapT = 0; ph.shots = []; ph.bolts = [];
  wizShGallery(st, 0);
  const s = wizStats(st); Object.assign(s, { bolts: s.bolts || 0, blocks: s.blocks || 0, knocks: s.knocks || 0 });
  Object.assign(st.hm, { x: 760, y: 110, s: 0.75, face: -1, pose: 'talk' });
  wizSay(st, 'Shield Charm! One shields, one zaps from inside the bubble.', 3);
}
function wizShGallery(st, g) {
  const ph = st.ph, K = WIZSH, F = K.floor, b = g * K.gal;
  ph.gal = g; ph.base = b; ph.shots = []; ph.bolts = [];
  ph.pillar = { x0: b + 230, x1: b + 262, y0: F - 150 };
  ph.door = b + 1220;
  ph.solids = [{ x0: -40, y0: F, x1: 3 * K.gal + 400, y1: F + 300, kind: 'floor' }, { x0: b - 40, y0: -400, x1: b, y1: 800, kind: 'edge' }, { x0: b + K.gal - 20, y0: -400, x1: b + K.gal + 20, y1: 800, kind: 'edge' }];
  const arm = (x, y, cap) => ({ x, y, hits: 0, down: false, cap: !!cap, open: 0, t: 1.5 + Math.random(), warn: 0, tx: 0, ty: 0, kind: 'spark', fall: 0 });
  if (g === 0) ph.armors = [arm(b + 800, F), arm(b + 1000, F)];
  else if (g === 1) { ph.armors = [arm(b + 760, F), arm(b + 1040, F - 120), arm(b + 1130, F)]; ph.solids.push({ x0: b + 990, y0: F - 120, x1: b + 1100, y1: F - 104, kind: 'shelf' }); }
  else ph.armors = [arm(b + 960, F, true)];
  for (const a of ph.armors) { a.gate = { x0: a.x - 30, y0: a.y - 90, x1: a.x + 30, y1: a.y, kind: 'armor', armor: a }; if (a.y === F) ph.solids.push(a.gate); }
  ph.armors.forEach((a, i) => { a.t += i * 0.9; });
  const ps = G.players, s = ps[ph.sh], z = ps[ph.zp];
  ph.bar = 1; ph.popped = false; ph.on = false; ph.aim = 2;
  Object.assign(s, { x: b + 150 - s.w / 2, y: F - s.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true });
  Object.assign(z, { x: b + 120 - z.w / 2, y: F - z.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true });
  st.cam = { x: b, y: 0 };
  wizNews(st, WIZSH_NEWS[g]);
}
const wizShGem = a => ({ x: a.x - 14, y: a.y - (a.cap ? 62 : 52) });
const wizShLive = ph => ph.armors.filter(a => !a.down);
const wizShIn = (ph, p) => ph.on && Math.hypot(p.x + p.w / 2 - wizShC(ph).x, p.y + p.h / 2 - wizShC(ph).y) < WIZSH.r - 6;
function wizShC(ph) { const s = G.players[ph.sh]; return { x: s.x + s.w / 2, y: s.y + s.h / 2 - 6 }; }
function wizShMouth(ph) { const z = G.players[ph.zp]; return { x: z.x + z.w / 2 + 12, y: z.y + 6 }; }
// the plan: where the ZAPPER should stand and aim for the nearest live gem, when the SHIELDER holds the bubble
function wizShSpot(ph) {
  const a = wizShLive(ph)[0]; if (!a) return null;
  const g = wizShGem(a), K = WIZSH, my = WIZSH.floor - 26 + 6;
  let best = null;
  K.aims.forEach((s, i) => {
    const dy = g.y - my;
    let dx = s === 0 ? (Math.abs(dy) < K.gemR - 4 ? 380 : null) : dy / s;
    if (dx == null || dx < 200 || dx > 560) return;
    const x = g.x - dx - 12;
    if (x < ph.pillar.x1 + 30) return;
    if (!best || Math.abs(dx - 380) < Math.abs(best.dx - 380)) best = { x, aim: i, dx };
  });
  return best ? { x: best.x, aim: best.aim, a } : { x: g.x - 380, aim: 2, a };
}
function wizShPlan(st) {
  const ph = st.ph, K = WIZSH, ps = G.players, s = ps[ph.sh], z = ps[ph.zp], out = [null, null];
  const scx = s.x + s.w / 2, zcx = z.x + z.w / 2, live = wizShLive(ph);
  const flying = ph.shots.some(o => !o.back);
  if (!live.length) { out[ph.sh] = { why: 'door', x: ph.door - 20, hold: flying }; out[ph.zp] = { why: 'door', x: ph.door - 40 }; return out; }
  const spot = wizShSpot(ph), rest = ph.popped || (ph.bar < 0.25 && !ph.on);
  // incoming: a warning line or a pot shadow aimed near us
  const danger = ph.armors.some(a => !a.down && a.warn > 0 && Math.abs(a.tx - scx) < 120) || ph.shots.some(o => o.kind === 'spark' && !o.back && o.x - scx < 260);
  const pot = ph.shots.some(o => o.kind === 'pot' && Math.abs(o.tx - scx) < K.r + 20);
  const ready = Math.abs(zcx - spot.x) < 12 && Math.abs(scx - zcx) < 30;
  const capShut = spot.a.cap && spot.a.open <= 0;
  if (rest) {
    out[ph.sh] = { why: 'rest', x: ph.pillar.x0 - 30 };
    out[ph.zp] = { why: 'rest', x: ph.pillar.x0 - 50 };
  } else {
    out[ph.sh] = { why: 'shield', x: Math.max(ph.pillar.x1 + 30, Math.min(spot.x, zcx) + 4),   // (beside the ZAPPER, wherever they are)
      hold: danger || pot || (ready && !capShut) || (capShut && danger), up: pot && !danger };
    out[ph.zp] = { why: 'aim', x: spot.x, aim: spot.aim, tap: ph.aim < spot.aim ? 'down' : ph.aim > spot.aim ? 'up' : (wizShIn(ph, z) && !capShut && ph.restT <= 0 ? 'act' : null) };
  }
  return out;
}
function wizShKnock(st, p, word) {
  const ph = st.ph, K = WIZSH;
  wizStats(st).knocks++;
  ph.knockAt[p.id] = ph.t;
  const o = G.players[1 - p.id];
  if (ph.t - ph.knockAt[o.id] < K.both) {
    ph.knockAt = [-99, -99];
    for (const q of G.players) { const to = { x: ph.pillar.x0 - 30 - (q.id === ph.zp ? 26 : 0), y: K.floor }; if (q !== p || !wizOops(st, q, { word: 'Oops! Both down!', kind: 'shield', to })) Object.assign(q, { x: to.x - q.w / 2, y: to.y - q.h, vx: 0, vy: 0 }); }
    const n = wizMiss(st, 'g' + ph.gal);
    if (n >= WIZ.goldAfter && wizGoldOnce(st, 'sh' + ph.gal, 'Gold bubble! It drains at half speed now.')) ph.gold = true;
  } else {
    wizPop(st, p.x + p.w / 2, p.y - 20, word, '#ffffff', 18);
    Object.assign(p, { x: ph.pillar.x0 - 30 - p.w / 2, y: K.floor - p.h - 2, vx: 0, vy: -200, grounded: false });
    puff(p.x + p.w / 2, p.y, 6, 'rgba(255,220,120,0.8)');
  }
  Sfx.play('wizShKnock');
}
function wizShStep(st, dt) {
  const ph = st.ph, K = WIZSH, F = K.floor, ps = G.players, s = ps[ph.sh], z = ps[ph.zp];
  ph.t += dt;
  if (st.idle) { wizShCoast(st, dt); return; }
  if (ph.swapT > 0) {
    ph.swapT -= dt;
    for (const p of ps) { p.vx = 0; p.pendingAct = false; p.pendingJump = false; }
    if (ph.swapT <= 0) { [ph.sh, ph.zp] = [ph.zp, ph.sh]; wizShGallery(st, ph.gal + 1); wizSwap(st); }
    wizShCam(st, dt); return;
  }
  // --- the bubble ---
  const want = !!s.input.act && !ph.popped;
  if (want && !ph.on) Sfx.play('wizShUp');
  ph.on = want;
  if (ph.on) { ph.bar -= dt / K.drain * (ph.gold ? 0.5 : 1); if (ph.bar <= 0) wizShPop(st); }
  else { ph.bar = Math.min(1, ph.bar + dt / K.refill); if (ph.popped && ph.bar >= 1) { ph.popped = false; Sfx.play('wizShReady'); } }
  ph.tilt = ph.on && wizUp(s) ? 'up' : 'fwd';
  s.pendingAct = false;
  // --- the ZAPPER's aim and bolt ---
  const upNow = wizUp(z), dnNow = !!z.input.down;
  if (upNow && !ph.upWas) { ph.aim = Math.max(0, ph.aim - 1); Sfx.play('wizShAim'); }
  if (dnNow && !ph.dnWas) { ph.aim = Math.min(4, ph.aim + 1); Sfx.play('wizShAim'); }
  ph.upWas = upNow; ph.dnWas = dnNow;
  ph.restT = Math.max(0, ph.restT - dt);
  if (z.pendingAct) {
    z.pendingAct = false;
    const m = wizShMouth(ph);
    if (ph.restT > 0) { /* resting */ }
    else if (!wizShIn(ph, z)) { wizPop(st, m.x, m.y - 20, 'Fizzle! Get in the bubble.', '#ffffff', 14); Sfx.play('wizShFizz'); ph.restT = K.rest; }
    else { const a = Math.atan(K.aims[ph.aim]); ph.bolts.push({ x: m.x, y: m.y, vx: Math.cos(a) * K.bolt, vy: Math.sin(a) * K.bolt, t: 0 }); ph.restT = K.rest; wizStats(st).bolts++; Sfx.play('wizShZap'); }
  }
  // --- moving (no jumps in the range) ---
  for (const p of ps) {
    p.pendingJump = false;
    const slow = p === s && ph.on ? 0.55 : 1;
    wizBody(p, dt, ph.solids, { ctl: (q, d) => { const real = q.input; q.input = Object.assign({}, real, { jump: false, up: false }); try { control(q, d); q.vx *= slow; } finally { q.input = real; } } });
    // (the pillar: walk past it, it only stops sparks)
    if (p.x < st.cam.x) p.x = st.cam.x; else if (p.x > st.cam.x + W - p.w) p.x = st.cam.x + W - p.w;
  }
  wizShArmors(st, dt);
  wizShShots(st, dt);
  // the door
  if (!wizShLive(ph).length && ps.every(p => p.x + p.w / 2 > ph.door - 60)) {
    if (ph.gal >= 2) { if (!ph.done) { ph.done = true; wizPhaseDone(st, { say: 'Not a scratch on either of you. The Shield Charm is yours!' }); } }
    else if (ph.swapT <= 0) { ph.swapT = 1.2; wizSay(st, 'Swap! New gallery, new jobs.', 2.4); }
  }
  wizShCam(st, dt);
  wizShHints(st);
}
function wizShPop(st) {
  const ph = st.ph, c = wizShC(ph);
  ph.on = false; ph.popped = true; ph.bar = 0;
  wizPop(st, c.x, c.y - 60, 'Crack!', '#ffd23f', 20); Sfx.play('wizShCrack');
  for (let i = 0; i < 10; i++) puff(c.x + Math.cos(i) * WIZSH.r, c.y + Math.sin(i) * WIZSH.r, 4, 'rgba(255,220,100,0.8)');
}
function wizShArmors(st, dt) {
  const ph = st.ph, K = WIZSH, F = K.floor, ps = G.players;
  for (const a of ph.armors) {
    if (a.down) { a.fall = Math.min(1, a.fall + dt * 3); continue; }
    a.open = Math.max(0, a.open - dt);
    if (a.warn > 0) {
      a.warn -= dt;
      if (a.warn <= 0) {
        const g = wizShGem(a);
        if (a.kind === 'pot') ph.shots.push({ kind: 'pot', x: a.x - 20, y: a.y - 80, x0: a.x - 20, y0: a.y - 80, tx: a.tx, ty: F, t: 0, T: K.pot.t, from: a });
        else { const d = Math.hypot(a.tx - g.x, a.ty - g.y) || 1; ph.shots.push({ kind: 'spark', x: g.x, y: g.y, vx: (a.tx - g.x) / d * K.spark, vy: (a.ty - g.y) / d * K.spark, from: a, t: 0 }); Sfx.play('wizShSpark'); }
      }
      continue;
    }
    if ((a.t -= dt) <= 0) {
      a.t = K.every[ph.gal] * Math.max(1, wizShLive(ph).length * 0.8) * (0.85 + Math.random() * 0.3);   // (several armors share the volley)
      const p = ps[Math.random() < 0.5 ? 0 : 1];
      a.kind = ph.gal > 0 && Math.random() < 0.35 ? 'pot' : 'spark';
      a.tx = p.x + p.w / 2; a.ty = p.y + p.h / 2;
      a.warn = a.kind === 'pot' ? K.pot.warn : K.warn;
      Sfx.play('wizShWarn');
    }
  }
}
function wizShShots(st, dt) {
  const ph = st.ph, K = WIZSH, F = K.floor, ps = G.players, c = wizShC(ph);
  // bolts: into gems (the captain's only while its shield is open)
  for (const b of ph.bolts) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt;
    for (const a of ph.armors) {
      if (a.down || b.dead) continue;
      const g = wizShGem(a);
      if (Math.hypot(b.x - g.x, b.y - g.y) < K.gemR) {
        b.dead = true;
        if (a.cap && a.open <= 0) { wizPop(st, g.x, g.y - 30, 'Clang! Shield shut.', '#ffffff', 14); Sfx.play('wizShClang'); continue; }
        a.hits++; burst(g.x, g.y, '#7fd0ff', 8); Sfx.play('wizShHit');
        if (a.hits >= (a.cap ? K.capHits : K.gemHits)) { a.down = true; a.gate.off = true; wizPop(st, a.x, a.y - 110, 'Clatter!', '#ffd23f', 20); Sfx.play('wizShFall'); }
      } else if (b.x > a.x - 30 && b.x < a.x + 30 && b.y > a.y - 90 && b.y < a.y) { b.dead = true; puff(b.x, b.y, 4, 'rgba(180,220,255,0.8)'); }
    }
    if (b.t > 2 || b.y > F) b.dead = true;
  }
  ph.bolts = ph.bolts.filter(b => !b.dead);
  // sparks and pots
  for (const o of ph.shots) {
    if (o.kind === 'spark') {
      o.x += o.vx * dt; o.y += o.vy * dt; o.t += dt;
      if (o.back) {
        // bounced back at its thrower
        const a = o.from, g = wizShGem(a);
        if (!a.down && Math.hypot(o.x - g.x, o.y - g.y) < 34) { o.dead = true; if (a.cap) { a.open = K.capOpen; wizPop(st, a.x, a.y - 110, 'Its shield opens!', '#ffd23f', 18); Sfx.play('wizShClang'); } else burst(g.x, g.y, '#ffd23f', 6); }
      } else {
        // the pillar stops it; the bubble blocks it; a wizard outside the bubble is knocked back
        if (o.x > ph.pillar.x0 && o.x < ph.pillar.x1 && o.y > ph.pillar.y0) { o.dead = true; puff(o.x, o.y, 4, 'rgba(255,200,80,0.8)'); continue; }
        const d = Math.hypot(o.x - c.x, o.y - c.y);
        if (ph.on && d < K.r) {
          const ang = Math.atan2(o.y - c.y, o.x - c.x), onPatch = ph.tilt === 'up' ? ang < -Math.PI / 4 && ang > -3 * Math.PI / 4 : Math.abs(ang) < Math.PI / 3;
          wizStats(st).blocks++;
          if (onPatch) { o.back = true; o.t = 0; o.vx = -o.vx; o.vy = -o.vy; Sfx.play('wizShBounce'); wizSparks(o.x, o.y, 'shield', 6); }
          else { o.dead = true; ph.bar -= K.hit; Sfx.play('wizShBlock'); if (ph.bar <= 0) wizShPop(st); }
          continue;
        }
        for (const p of ps) if (!o.dead && o.x > p.x - 4 && o.x < p.x + p.w + 4 && o.y > p.y - 4 && o.y < p.y + p.h + 4 && !wizShIn(ph, p)) { o.dead = true; wizShKnock(st, p, 'Zap! Back to the pillar.'); }
      }
      if (o.t > 3 || o.x < st.cam.x - 40 || o.y > F + 10) o.dead = true;
    } else {
      o.t += dt;
      const k = Math.min(1, o.t / o.T);
      o.x = o.x0 + (o.tx - o.x0) * k; o.y = o.y0 + (o.ty - o.y0) * k - Math.sin(k * Math.PI) * 220;
      const d = Math.hypot(o.x - c.x, o.y - c.y);
      if (ph.on && d < K.r && k > 0.5) {
        o.dead = true; wizStats(st).blocks++;
        if (ph.tilt === 'up') { Sfx.play('wizShBounce'); wizPop(st, o.x, o.y - 10, 'Smash!', '#ffd23f', 14); }
        else { ph.bar -= K.potHit; Sfx.play('wizShBlock'); if (ph.bar <= 0) wizShPop(st); }
        burst(o.x, o.y, '#c08a5a', 8);
        continue;
      }
      if (k >= 1) {
        o.dead = true; burst(o.x, F - 6, '#c08a5a', 10); Sfx.play('wizShPot');
        for (const p of ps) if (Math.abs(p.x + p.w / 2 - o.tx) < 26 && !wizShIn(ph, p)) wizShKnock(st, p, 'Bonk! A pot.');
      }
    }
  }
  ph.shots = ph.shots.filter(o => !o.dead);
}
function wizShHints(st) {
  const ph = st.ph, P = wizShPlan(st), S = P[ph.sh], Z = P[ph.zp];
  if (!st.hints[ph.sh] && S.hold && !ph.on) wizHint(st, ph.sh, 'Hold ' + wizKey(ph.sh, 'act') + ': shield up!', { cpu: 'Shield up!', life: 1.4 });
  if (!st.hints[ph.zp]) {
    if (Z.tap === 'up' || Z.tap === 'down') wizHint(st, ph.zp, 'Aim at the gem: ' + wizKey(ph.zp, 'up') + ' / ' + wizKey(ph.zp, 'down'), { cpu: 'Aiming...' });
    else if (Z.tap === 'act') wizHint(st, ph.zp, 'Zap! ' + wizKey(ph.zp, 'act'), { cpu: 'Zap!', life: 1.2 });
  }
}
function wizShCam(st, dt) {
  const ph = st.ph, ps = G.players;
  const want = clamp((ps[0].x + ps[1].x) / 2 - W / 2 + 200, ph.base, ph.base + WIZSH.gal - W);
  st.cam.x += (want - st.cam.x) * Math.min(1, (dt || 0) * 3); st.cam.y = 0;
  const c = st.hm;
  c.x += (st.cam.x + 820 - c.x) * Math.min(1, (dt || 0) * 2); c.y = 100 + Math.sin(ph.t * 0.9) * 8; c.face = -1;
  if (c.pose === 'talk' && !st.say) c.pose = 'idle';
}
function wizShCoast(st, dt) {
  const ph = st.ph;
  if (!ph.armors) { wizCoast(dt); return; }
  for (const p of G.players) { p.vx = 0; p.vy = 0; p.pendingJump = false; p.pendingAct = false; }
  ph.on = false;
  wizShCam(st, dt || 0);
}

/* ---------- drawing ---------- */
function wizShDrawBack(st) {
  const ph = st.ph, cx = st.cam.x, F = WIZSH.floor, t = G.clock;
  const g = ctx.createLinearGradient(0, 0, 0, F); g.addColorStop(0, '#3e3050'); g.addColorStop(1, '#54426a');
  ctx.fillStyle = g; ctx.fillRect(cx - 40, 0, W + 80, H);
  // stone courses on the hall wall
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let y = 40, r = 0; y < F; y += 36, r++) {
    ctx.moveTo(cx - 40, y); ctx.lineTo(cx + W + 40, y);
    for (let x = Math.floor((cx - 40) / 80) * 80 + (r % 2) * 40; x < cx + W + 40; x += 80) { ctx.moveTo(x, y); ctx.lineTo(x, y + 36); }
  }
  ctx.stroke();
  for (let x = Math.floor((cx - 100) / 200) * 200; x < cx + W + 200; x += 200) {
    // a buttress between the windows, lit on one side
    ctx.fillStyle = '#5a4a6a'; ctx.fillRect(x + 20, 60, 160, F - 60);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 20, 60, 6, F - 60);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 174, 60, 6, F - 60);
    ctx.fillStyle = '#6a5a7c'; ctx.fillRect(x + 14, 52, 172, 10);
    // the arched window: night sky, a few stars, mullions and a stone sill
    ctx.fillStyle = '#2a2040'; rr(x + 64, 104, 72, 122, 36); ctx.fill();
    ctx.save(); rr(x + 70, 110, 60, 110, 30); ctx.clip();
    const wg = ctx.createLinearGradient(0, 110, 0, 220); wg.addColorStop(0, '#1e1a4a'); wg.addColorStop(1, '#5a3e7a'); ctx.fillStyle = wg; ctx.fillRect(x + 70, 110, 60, 110);
    for (let s = 0; s < 5; s++) { const h = hash(x + s, 3); ctx.fillStyle = 'rgba(255,248,220,0.7)'; ctx.fillRect(x + 72 + h % 56, 116 + (h >> 6) % 90, 2, 2); }
    ctx.restore();
    ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 100, 110); ctx.lineTo(x + 100, 220); ctx.moveTo(x + 70, 160); ctx.lineTo(x + 130, 160); ctx.stroke();
    ctx.fillStyle = '#7a6a8c'; ctx.fillRect(x + 62, 220, 76, 8); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 62, 228, 76, 3);
    // a hanging banner with the academy star
    const bx = x + 100, sw = reduceMotion ? 0 : Math.sin(t * 1.2 + x) * 2;
    ctx.fillStyle = '#8a3a4a'; ctx.beginPath(); ctx.moveTo(bx - 22, 252); ctx.lineTo(bx + 22, 252); ctx.lineTo(bx + 22 + sw, 330); ctx.lineTo(bx + sw, 316); ctx.lineTo(bx - 22 + sw, 330); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(bx + 14, 252, 8, 70);
    ctx.fillStyle = '#d9a441'; ctx.fillRect(bx - 26, 248, 52, 5);
    wizDrawStar(bx + sw / 2, 282, 9, '#ffd36a');
    // a torch on the buttress edge, with a warm pool of light
    const tx = x + 200, fl = reduceMotion ? 0 : Math.sin(t * 10 + x) * 2;
    const tg = ctx.createRadialGradient(tx, 176, 2, tx, 176, 70); tg.addColorStop(0, 'rgba(255,190,100,0.3)'); tg.addColorStop(1, 'rgba(255,190,100,0)');
    ctx.fillStyle = tg; circle(tx, 176, 70); ctx.fill();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(tx - 3, 182, 6, 22); ctx.fillStyle = '#3a3040'; ctx.fillRect(tx - 7, 180, 14, 5);
    ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(tx - 6, 182); ctx.quadraticCurveTo(tx, 160 - fl, tx + 6, 182); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(tx - 3, 182); ctx.quadraticCurveTo(tx, 170 - fl, tx + 3, 182); ctx.fill();
  }
  // the wooden floor: planks with joints, a skirting shadow and the long red runner
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(cx - 40, F - 6, W + 80, 6);
  ctx.fillStyle = '#6a4a3a'; ctx.fillRect(cx - 40, F, W + 80, H - F); ctx.fillStyle = '#8a6a4a'; ctx.fillRect(cx - 40, F, W + 80, 8);
  ctx.fillStyle = 'rgba(255,230,180,0.25)'; ctx.fillRect(cx - 40, F, W + 80, 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (const y of [F + 20, F + 56, F + 76]) { ctx.moveTo(cx - 40, y); ctx.lineTo(cx + W + 40, y); }
  for (let x = Math.floor((cx - 40) / 120) * 120; x < cx + W + 40; x += 120) { ctx.moveTo(x, F + 8); ctx.lineTo(x, F + 20); ctx.moveTo(x + 60, F + 56); ctx.lineTo(x + 60, F + 76); }
  ctx.stroke();
  ctx.fillStyle = '#9a3a3a'; ctx.fillRect(cx - 40, F + 30, W + 80, 18);
  ctx.fillStyle = '#d9a441'; ctx.fillRect(cx - 40, F + 31, W + 80, 2); ctx.fillRect(cx - 40, F + 45, W + 80, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(cx - 40, F + 48, W + 80, 3);
}
function wizShDrawArmor(a, t) {
  const g = wizShGem(a), s = a.cap ? 1.25 : 1;
  ctx.save(); ctx.translate(a.x, a.y);
  if (a.down) { ctx.rotate(a.fall * 0.2); ctx.globalAlpha = 0.85; }
  ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  const steel = '#b8c0d0', dk = '#7a8296';
  if (a.down) {
    ctx.fillStyle = steel; for (const [x, y, r] of [[-20, -8, 10], [0, -10, 12], [18, -7, 9], [6, -22, 9]]) { circle(x, y, r); ctx.fill(); ctx.stroke(); }
    ctx.restore(); return;
  }
  ctx.fillStyle = dk; ctx.fillRect(-16, -30, 10, 30); ctx.fillRect(6, -30, 10, 30); ctx.strokeRect(-16, -30, 10, 30); ctx.strokeRect(6, -30, 10, 30);
  ctx.fillStyle = steel; rr(-22, -74, 44, 46, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = steel; rr(-14, -98, 28, 26, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.fillRect(-9, -88, 18, 4);
  ctx.fillStyle = a.warn > 0 ? '#ff6a4a' : '#ffd0a0'; circle(-4, -86, 2); ctx.fill(); circle(4, -86, 2); ctx.fill();
  ctx.fillStyle = '#d04a4a'; ctx.beginPath(); ctx.moveTo(0, -98); ctx.quadraticCurveTo(10, -116, 2, -122); ctx.quadraticCurveTo(-4, -110, 0, -98); ctx.fill();
  ctx.restore();
  // the gem (and the captain's shield over it)
  const pulse = 0.7 + 0.3 * Math.sin(t * 6);
  ctx.fillStyle = a.hits ? '#ff9a6a' : '#7fd0ff'; ctx.globalAlpha = pulse; circle(g.x, g.y, 8); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < a.hits; i++) { ctx.fillStyle = '#ffd23f'; circle(a.x - 16 + i * 10, a.y - 110 * s, 3); ctx.fill(); }
  if (a.cap && a.open <= 0) { ctx.fillStyle = '#8a92a6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(g.x - 10, g.y, 22); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd23f'; circle(g.x - 10, g.y, 6); ctx.fill(); }
}
function wizShDraw(st) {
  const ph = st.ph, K = WIZSH, t = G.clock, F = K.floor, ps = G.players;
  for (const r of ph.solids) if (r.kind === 'shelf') { ctx.fillStyle = '#7a5a3a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
  // the pillar (cover and the gallery's flag)
  const pl = ph.pillar; ctx.fillStyle = '#8a7a9a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(pl.x0, pl.y0, pl.x1 - pl.x0, F - pl.y0); ctx.strokeRect(pl.x0, pl.y0, pl.x1 - pl.x0, F - pl.y0);
  ctx.fillRect(pl.x0 - 6, pl.y0 - 10, pl.x1 - pl.x0 + 12, 12); ctx.strokeRect(pl.x0 - 6, pl.y0 - 10, pl.x1 - pl.x0 + 12, 12);
  wizDrawFlag(pl.x0 - 14, F, true);
  // the door
  ctx.fillStyle = wizShLive(ph).length ? '#4a2a2a' : '#7a5a3a'; rr(ph.door - 26, F - 96, 52, 96, 22); ctx.fill(); ctx.stroke();
  for (const a of ph.armors) {
    wizShDrawArmor(a, t);
    // the warning: a line of light to the target, or a shadow where the pot lands
    if (a.warn > 0 && !a.down) {
      const g = wizShGem(a), k = 1 - a.warn / (a.kind === 'pot' ? K.pot.warn : K.warn);
      if (a.kind === 'pot') { ctx.fillStyle = 'rgba(0,0,0,' + (0.2 + 0.3 * k) + ')'; ctx.beginPath(); ctx.ellipse(a.tx, F, 14 + 12 * k, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.save(); ctx.strokeStyle = 'rgba(255,230,140,' + (0.25 + 0.5 * k) + ')'; ctx.lineWidth = 2 + 2 * k; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(a.tx, a.ty); ctx.stroke(); ctx.restore(); }
    }
  }
  // the ZAPPER's aim line
  const z = ps[ph.zp], m = wizShMouth(ph), am = Math.atan(K.aims[ph.aim]), zx = m.x + st.cam.x, zy = m.y + st.cam.y;
  ctx.save(); ctx.strokeStyle = 'rgba(127,208,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(zx, zy); ctx.lineTo(zx + Math.cos(am) * 120, zy + Math.sin(am) * 120); ctx.stroke(); ctx.restore();
  void z;
}
function wizShDrawTop(st) {
  const ph = st.ph, K = WIZSH, t = G.clock;
  if (!ph.armors) return;
  for (const b of ph.bolts) { ctx.fillStyle = '#bfe8ff'; circle(b.x, b.y, 5); ctx.fill(); ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.stroke(); }
  for (const o of ph.shots) {
    if (o.kind === 'spark') { ctx.fillStyle = o.back ? '#ffd23f' : '#ff8a3a'; circle(o.x, o.y, 6 + Math.sin(t * 30) * 1.5); ctx.fill(); }
    else { ctx.fillStyle = '#c08a5a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(o.x, o.y, 11); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#8a5a3a'; ctx.fillRect(o.x - 6, o.y - 14, 12, 5); }
  }
  // the bubble and its thick patch; the strength bar over the SHIELDER
  const c0 = wizShC(ph), c = { x: c0.x + st.cam.x, y: c0.y + st.cam.y };
  if (ph.on) {
    ctx.save(); ctx.fillStyle = 'rgba(255,214,90,0.16)'; ctx.strokeStyle = 'rgba(255,214,90,0.8)'; ctx.lineWidth = 2.5; circle(c.x, c.y, K.r); ctx.fill(); ctx.stroke();
    const a0 = ph.tilt === 'up' ? -3 * Math.PI / 4 : -Math.PI / 3, a1 = ph.tilt === 'up' ? -Math.PI / 4 : Math.PI / 3;
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(c.x, c.y, K.r, a0, a1); ctx.stroke(); ctx.restore();
  }
  const s = G.players[ph.sh], bx = s.x + s.w / 2 + st.cam.x - 22, by = s.y + st.cam.y - 44;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, by, 44, 6); ctx.fillStyle = ph.popped ? '#ff6a4a' : '#ffd23f'; ctx.fillRect(bx, by, 44 * Math.max(0, ph.bar), 6);
}

WIZ_PHASES.shield = {
  setup(st, L) { wizShSetup(st, L); },
  step(st, dt) { wizShStep(st, dt); },
  coast(st, dt) { wizShCoast(st, dt); },
  plan(st) { return wizShPlan(st); },
  labels(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.sh ? 'shield' : 'zap')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.sh ? 'Shield!' : 'Zap!')); },
  jobKeys(st) { return st.ph.sh === 1 ? ['zapper', 'shielder'] : ['shielder', 'zapper']; },
  legend(st) { const ph = st.ph, z = k => (k ? '<kbd>↑</kbd><kbd>↓</kbd> aim, then zap' : '<kbd>W</kbd><kbd>S</kbd> aim, then zap'); return { pip: ph.sh === 0 ? 'hold to shield' : z(0), bo: ph.sh === 1 ? 'hold to shield' : z(1), pad: 'shielder holds the action, zapper aims with up / down,' }; },
  hudText(st) { const ph = st.ph; return 'Gallery ' + (ph.gal + 1) + ' of 3'; },
  progress(st) { const ph = st.ph; return { n: ph.gal, of: 3 }; },
  drawBack(st) { wizShDrawBack(st); },
  draw(st) { wizShDraw(st); },
  drawTop(st) { wizShDrawTop(st); },
  statLine(st) { const s = st.stats.shield; return s && s.blocks ? s.blocks + ' blocks, ' + s.bolts + ' bolts' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizShUp = function () { this.tone(500, 0.12, 'sine', 0.03, 900); };
Sfx.extra.wizShReady = function () { this.tone(880, 0.08, 'triangle', 0.03); };
Sfx.extra.wizShCrack = function () { this.tone(1200, 0.2, 'sawtooth', 0.03, 200); };
Sfx.extra.wizShAim = function () { this.tone(1000, 0.03, 'square', 0.015); };
Sfx.extra.wizShZap = function () { this.tone(1400, 0.1, 'square', 0.025, 700); };
Sfx.extra.wizShFizz = function () { this.tone(300, 0.1, 'sawtooth', 0.015, 150); };
Sfx.extra.wizShWarn = function () { this.tone(1600, 0.05, 'triangle', 0.015); };
Sfx.extra.wizShSpark = function () { this.tone(900, 0.08, 'sawtooth', 0.02, 1500); };
Sfx.extra.wizShBlock = function () { this.tone(400, 0.08, 'triangle', 0.03); };
Sfx.extra.wizShBounce = function () { this.tone(700, 0.1, 'triangle', 0.035, 1400); };
Sfx.extra.wizShHit = function () { this.tone(660, 0.08, 'square', 0.03, 990); };
Sfx.extra.wizShClang = function () { this.tone(1800, 0.2, 'triangle', 0.025, 1700); };
Sfx.extra.wizShFall = function () { [300, 220, 260, 180].forEach((f, i) => this.tone(f, 0.08, 'square', 0.03, null, i * 0.08)); };
Sfx.extra.wizShKnock = function () { this.tone(200, 0.12, 'square', 0.035, 120); };
Sfx.extra.wizShPot = function () { this.tone(150, 0.15, 'sawtooth', 0.03, 80); };

/* ---------- the room ---------- */
wizRoom('shield', {
  jobs: {
    shielder: { title: 'Shielder', act: 'shield', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> tilt the shield up',
      howTo: ['Hold shield for the bubble. Let go to let it refill.'] },
    zapper: { title: 'Zapper', act: 'zap', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd><kbd>S</kbd> aim',
      howTo: ['Zap from inside the bubble. Three hits on a glowing gem.'] },
  },
  act: { label: 'shield', labels: ['shield', 'zap'] },
  tip: 'The shielder holds the action for the bubble; the zapper aims with up / down and zaps from inside it!',
  legend: { pip: 'hold to shield', bo: '<kbd>↑</kbd><kbd>↓</kbd> aim, then zap', pad: 'shielder holds the action, zapper aims with up / down,' },
  map: WIZ_EMPTY_MAP,
});
