/* Pip & Bo - Level 35-1 Moonwick Academy: class 9 'portal' (Portal Class, spell Door). */
'use strict';

/* ===== 35-1 class 9: Portal Class (WIZ_PHASES.portal) ============================================================
   Up the inside of the clock tower, where the stairs fell down long ago: 7 ledges, scrolling up. One draws a door
   here and a door there; the other jumps through.

   THE TWO JOBS (room field `first` is the first DRAWER; they swap on ledges 3 and 5)
   - DRAWER (action word "door"): a glowing chalk ring sits on one of the chalk plates within WIZPO.reach px; UP and
     DOWN move it to the previous / next plate (left to right); walking off, it jumps to the plate nearest the DRAWER. The action stamps a door on it: the first press is
     the IN door (indigo), the second the OUT door (silver), a third clears both. Doors last WIZPO.life s. The DRAWER
     can't use their own doors ("Not you!") and doesn't jump; they walk and climb the ladders.
   - JUMPER (action word "pull"): walks into the IN door and comes out of the OUT door with their speed; a PAD (a
     door on the floor) is entered by falling onto it, and a pad OUT door shoots them straight up as fast as they
     fell in (a little faster). On the new ledge the JUMPER pulls the rope that lowers a ladder for the DRAWER. Both
     on the ledge is the flag.
   LEDGES (odd ones on the left, even on the right, overlapping where the ladder goes): 1 a plain hop up; 2 a swinging pendulum across the IN door (time the walk-in); 3 a drop onto a low pad
   that launches up; 4 the OUT plate rides a gear back and forth; 5 the clock hand sweeps the wall and wipes any door
   it passes (it ticks faster as it nears one); 6 a long way across; 7 a launch into the bell at the top.
   FAILS: a fall lands back on the ledge's hay pile: an Oops only on the third fall from that ledge. GOLD HELP after
   WIZ.goldAfter Oops in one part: doors last WIZPO.goldLife s and the right two plates glow gold.
   Stats (st.stats.portal): doors, trips, falls.   Names: wizPo* / WIZPO*. */
const WIZPO = {
  floor: 430, rise: 170, reach: 330, life: 8, goldLife: 16, climb: 150, padBoost: 1.18, padMin: 600,
  pend: { len: 150, amp: 0.95, period: 2.6, r: 20 }, hand: { len: 310, period: 9, w: 16 }, gear: { x0: 520, x1: 760, period: 6 },
};
const wizPoY = i => WIZPO.floor - WIZPO.rise * i;
const WIZPO_NEWS = ['The clock tower: draw an IN door and an OUT door. Jumper, walk on through!', 'Ledge 3: drop onto the low pad to shoot up out of the high one!', 'Ledge 5: the clock hand wipes any door it passes. Wait for it to go by!'];

function wizPoSetup(st, L) {
  const ph = st.ph, K = WIZPO, F = K.floor;
  ph.dr = L.def.first || 0; ph.jp = 1 - ph.dr;
  ph.t = 0; ph.step = 1; ph.selQ = null; ph.inD = null; ph.outD = null; ph.doorT = 0; ph.gold = false; ph.done = false; ph.swapT = 0;
  ph.falls = 0; ph.roped = false; ph.climbing = false; ph.bell = 0;
  // the ledges (one-way: a ladder goes up through them)
  const S = ph.solids = [{ x0: 40, y0: -2000, x1: 80, y1: 800, kind: 'wall' }, { x0: 880, y0: -2000, x1: 920, y1: 800, kind: 'wall' }, { x0: 40, y0: F, x1: 920, y1: F + 300, kind: 'floor', ledge: 0 }];
  const span = i => (i === 7 ? [80, 880] : i % 2 ? [80, 600] : [360, 880]);   // (they overlap 360..600: the ladders)
  for (let i = 1; i <= 7; i++) { const [a, b] = span(i); S.push({ x0: a, y0: wizPoY(i), x1: b, y1: wizPoY(i) + 16, kind: 'ledge', one: true, ledge: i }); }
  // the plates: { x, y (the surface), pad }; per step the right IN and OUT, decoys around them
  const P = ph.plates = [], pl = (x, i, pad, o = {}) => { const q = Object.assign({ x, y: wizPoY(i), ledge: i, pad: !!pad, k: P.length }, o); P.push(q); return q; };
  const steps = ph.steps = [null];
  const add = (inP, outP, o = {}) => steps.push(Object.assign({ inP, outP, rope: o.rope, ladder: 480 }, o));
  // 1: a plain hop up
  pl(700, 0); add(pl(200, 0), pl(300, 1), { rope: 140 }); pl(160, 1);
  // 2: the pendulum over the IN door
  add(pl(220, 1), pl(640, 2), { rope: 840, pend: { x: 220, y: wizPoY(1) - 170 } }); pl(400, 1); pl(520, 2);
  // 3: drop onto the low pad, out of the high pad
  add(pl(275, 1, true), pl(482, 2, true), { rope: 120, launch: true }); pl(700, 2); pl(250, 3);
  // 4: the OUT plate rides a gear
  add(pl(200, 3), pl(K.gear.x0, 4, false, { gear: true }), { rope: 840 }); pl(380, 3);
  // 5: the clock hand
  add(pl(760, 4), pl(300, 5), { rope: 140, hand: { x: 480, y: (wizPoY(4) + wizPoY(5)) / 2, a: 0.5 } }); pl(600, 4); pl(180, 5);
  // 6: a long way across
  add(pl(150, 5), pl(680, 6), { rope: 620 }); pl(300, 5); pl(540, 6);
  // 7: the launch into the bell
  add(pl(275, 5, true), pl(482, 6, true), { rope: null, launch: true, bell: { x: 482, y: wizPoY(7) - 56 } }); pl(760, 6);
  ph.ladders = [];
  const ps = G.players, d = ps[ph.dr], j = ps[ph.jp];
  Object.assign(d, { x: 440 - d.w / 2, y: F - d.h, vx: 0, vy: 0, grounded: true, face: -1, alive: true });
  Object.assign(j, { x: 360 - j.w / 2, y: F - j.h, vx: 0, vy: 0, grounded: true, face: -1, alive: true });
  st.cam = { x: 0, y: 0 };
  const s = wizStats(st); Object.assign(s, { doors: s.doors || 0, trips: s.trips || 0, falls: s.falls || 0 });
  Object.assign(st.hm, { x: 820, y: 110, s: 0.75, face: -1, pose: 'talk' });
  wizSay(st, 'Portal Class! One draws the doors, one jumps through.', 3);
  wizNews(st, WIZPO_NEWS[0]);
}
const wizPoStep_ = ph => ph.steps[Math.min(ph.step, 7)];
const wizPoLife = st => (st.ph.gold ? WIZPO.goldLife : WIZPO.life);
// where a plate is right now (the gear plate rides back and forth)
function wizPoAt(ph, q) {
  if (!q.gear) return { x: q.x, y: q.y };
  const K = WIZPO.gear, k = 0.5 - 0.5 * Math.cos(ph.t * Math.PI * 2 / K.period);
  return { x: K.x0 + (K.x1 - K.x0) * k, y: q.y };
}
// the plates the DRAWER can reach (on this step's ledges: the one below too for a launch), left to right
function wizPoReach(ph) {
  const d = G.players[ph.dr], cx = d.x + d.w / 2, cy = d.y + d.h / 2;
  return ph.plates.filter(q => { if (q.ledge > ph.step || q.ledge < ph.step - (wizPoStep_(ph).launch ? 2 : 1)) return false; const a = wizPoAt(ph, q); return Math.hypot(a.x - cx, a.y - 12 - cy) < WIZPO.reach; }).sort((a, b) => wizPoAt(ph, a).x - wizPoAt(ph, b).x || a.y - b.y);
}
// the plate under the chalk ring: it stays put while in reach, else it jumps to the plate nearest the DRAWER
function wizPoSelQ(ph, reach) {
  if (ph.selQ && reach.includes(ph.selQ)) return ph.selQ;
  const d = G.players[ph.dr], cx = d.x + d.w / 2;
  let best = null, bd = 1e9;
  for (const q of reach) { const a = wizPoAt(ph, q), k = Math.hypot(a.x - cx, (a.y - d.y - d.h) * 0.5); if (k < bd) { bd = k; best = q; } }
  return (ph.selQ = best);
}
// the clock hand's angle now, and whether it lies over a point
function wizPoHandA(ph, h) { return h.a + ph.t * Math.PI * 2 / WIZPO.hand.period; }
function wizPoHandHits(ph, h, x, y) {
  const a = wizPoHandA(ph, h), ex = Math.cos(a), ey = Math.sin(a), dx = x - h.x, dy = y - 20 - h.y, along = dx * ex + dy * ey;
  return along > 0 && along < WIZPO.hand.len && Math.abs(dx * ey - dy * ex) < WIZPO.hand.w;
}
// seconds until the hand reaches a point (going round)
function wizPoHandEta(ph, h, x, y) {
  const a = ((wizPoHandA(ph, h) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), b = ((Math.atan2(y - 20 - h.y, x - h.x)) + Math.PI * 2) % (Math.PI * 2);
  return (((b - a) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * WIZPO.hand.period;
}
function wizPoPend(ph, sp) { const P = WIZPO.pend, a = P.amp * Math.sin(ph.t * Math.PI * 2 / P.period); return { x: sp.pend.x + Math.sin(a) * P.len, y: sp.pend.y + Math.cos(a) * P.len, a }; }
function wizPoPendClear(ph, sp, x0, y, x1) {
  const R = WIZPO.pend.r + 16, T = Math.abs(x1 - x0) / 200 + 0.1;
  for (let t = 0; t <= T; t += 0.04) { const b = wizPoPend({ t: ph.t + t }, sp), x = x0 + Math.sign(x1 - x0) * Math.min(Math.abs(x1 - x0), 200 * t); if (Math.hypot(x - b.x, y - b.y) < R) return false; }
  return true;
}
function wizPoPlan(st) {
  const ph = st.ph, K = WIZPO, out = [null, null], ps = G.players, d = ps[ph.dr], j = ps[ph.jp], sp = wizPoStep_(ph);
  const dcx = d.x + d.w / 2, jcx = j.x + j.w / 2, from = ph.step - 1, onLedge = (p, i) => p.grounded && Math.abs(p.y + p.h - wizPoY(i)) < 3;
  if (ph.done) return [{ why: 'wait', x: dcx }, { why: 'wait', x: jcx }];
  const jUp = onLedge(j, ph.step) || (j.grounded && j.y + j.h < wizPoY(ph.step) + 3);
  // the DRAWER
  let D;
  if (ph.roped && !onLedge(d, ph.step)) D = { why: 'climb', x: sp.ladder, up: Math.abs(dcx - sp.ladder) < 8 };
  else if (jUp) D = { why: 'wait', x: dcx };
  else {
    const reach = wizPoReach(ph), wantIn = !ph.inD || ph.inD.q !== sp.inP, wantOut = !wantIn && (!ph.outD || ph.outD.q !== sp.outP);
    const target = wantIn ? sp.inP : wantOut ? sp.outP : null;
    // a stand spot between the two plates, on the DRAWER's ledge
    const [lx0, lx1] = from === 0 ? [100, 860] : from % 2 ? [100, 560] : [400, 860];
    const ta = wizPoAt(ph, sp.inP), tb = wizPoAt(ph, sp.outP), sx = clamp((ta.x + tb.x) / 2, lx0, lx1);
    D = { why: 'draw', x: dcx };   // (stay put while the plate is in reach)
    if (ph.inD && ph.outD && (ph.inD.q !== sp.inP || ph.outD.q !== sp.outP)) D.tap = 'act';   // (wrong pair: clear it)
    else if (target) {
      const idx = reach.indexOf(target), cur = reach.indexOf(wizPoSelQ(ph, reach));
      let ok = true;
      // the clock hand: only stamp when it's well away from both plates
      if (sp.hand) ok = [ta, tb].every(a => wizPoHandEta(ph, sp.hand, a.x, a.y) > (wantIn ? 2.6 : 1.2));
      if (idx < 0) D.x = sx;
      else if (idx !== cur) D.tap = idx > cur ? 'down' : 'up';
      else if (ok) D.tap = 'act';
      D.want = target;
    } else if (ph.inD && ph.outD && Math.min(ph.inD.t, ph.outD.t) < 2.5 && !ph.inside) D.tap = 'act';   // (running out: clear and stamp again)
  }
  // the JUMPER
  let J;
  const both = ph.inD && ph.outD && ph.inD.q === sp.inP && ph.outD.q === sp.outP;
  if (!jUp && !j.grounded && j.vy < -200) J = { why: 'fly', x: jcx };
  else if (jUp) J = sp.rope != null && !ph.roped ? { why: 'rope', x: sp.rope, tap: Math.abs(jcx - sp.rope) < 16 ? 'act' : null } : { why: 'wait', x: jcx };
  else if (!both || Math.min(ph.inD.t, ph.outD.t) < 1.5) J = { why: 'wait', x: sp.launch ? 600 : clamp(wizPoAt(ph, sp.inP).x + (wizPoAt(ph, sp.inP).x < 480 ? 90 : -90), 110, 850) };
  else {
    const ia = wizPoAt(ph, sp.inP);
    if (sp.launch) J = { why: 'drop', x: ia.x };
    else {
      J = { why: 'through', x: ia.x };
      // the pendulum: walk in only if the whole walk to the door stays clear of the bob
      if (sp.pend && !wizPoPendClear(ph, sp, jcx, j.y + j.h / 2, ia.x)) J = { why: 'wait', x: ia.x + (ia.x < 480 ? 110 : -110) };
    }
  }
  out[ph.dr] = D; out[ph.jp] = J;
  return out;
}
function wizPoStamp(st) {
  const ph = st.ph, reach = wizPoReach(ph), d = G.players[ph.dr];
  if (ph.inD && ph.outD) { ph.inD = ph.outD = null; Sfx.play('wizPoClear'); wizPop(st, d.x + d.w / 2, d.y - 24, 'Wiped!', '#ffffff', 14); return; }
  const q = wizPoSelQ(ph, reach);
  if (!q) { wizPop(st, d.x + d.w / 2, d.y - 24, 'No plate in reach!', '#ffffff', 14); return; }
  if (ph.inD && ph.inD.q === q) return;
  const door = { q, t: wizPoLife(st) };
  if (!ph.inD) ph.inD = door; else ph.outD = door;
  if (ph.outD) ph.inD.t = ph.outD.t = wizPoLife(st);
  wizStats(st).doors++; Sfx.play(ph.outD ? 'wizPoOut' : 'wizPoIn');
  const a = wizPoAt(ph, q); wizSparks(a.x, a.y - 20, 'door', 10);
}
// through the doors: out of the OUT door with the speed they went in
function wizPoGo(st, p, speed, vx0) {
  const ph = st.ph, K = WIZPO, o = ph.outD.q, a = wizPoAt(ph, o);
  wizStats(st).trips++; Sfx.play('wizPoWhoosh');
  puff(p.x + p.w / 2, p.y + p.h / 2, 8, 'rgba(111,108,255,0.8)');
  if (o.pad) Object.assign(p, { x: a.x - p.w / 2, y: a.y - p.h - 4, vx: 0, vy: -Math.max(K.padMin, speed * K.padBoost), grounded: false, jumping: false });
  else Object.assign(p, { x: a.x - p.w / 2 + (vx0 >= 0 ? 14 : -14), y: a.y - p.h, vy: 0, vx: vx0, grounded: true });
  p.offT = 0.1; ph.inside = 0.4;
  puff(a.x, a.y - 20, 8, 'rgba(220,220,240,0.9)');
}
function wizPoFall(st, p) {
  const ph = st.ph, i = ph.step - 1, y = wizPoY(i), x = i === 0 ? 300 : i % 2 ? 300 : 660;
  ph.falls++; wizStats(st).falls++;
  const to = { x, y };
  if (ph.falls >= 3) {
    ph.falls = 0;
    if (!wizOops(st, p, { word: 'Oops! Third fall.', kind: 'fall', to })) Object.assign(p, { x: to.x - p.w / 2, y: to.y - p.h, vx: 0, vy: 0 });
    const n = wizMiss(st, 'p' + Math.floor((ph.step - 1) / 2.4));
    if (n >= WIZ.goldAfter && wizGoldOnce(st, 'po' + Math.floor((ph.step - 1) / 2.4), 'Gold chalk! Doors last ' + WIZPO.goldLife + ' s and the right plates glow.')) ph.gold = true;
  } else { wizPop(st, p.x + p.w / 2, p.y - 20, 'Poof! The hay pile.', '#ffe08a', 16); Object.assign(p, { x: to.x - p.w / 2, y: to.y - p.h - 2, vx: 0, vy: -150, grounded: false }); }
  Sfx.play('wizPoHay');
}
function wizPoStep(st, dt) {
  const ph = st.ph, K = WIZPO, ps = G.players, d = ps[ph.dr], j = ps[ph.jp], sp = wizPoStep_(ph);
  ph.t += dt;
  if (st.idle) { wizPoCoast(st, dt); return; }
  if (ph.swapT > 0) {
    ph.swapT -= dt;
    for (const p of ps) { p.vx = 0; p.pendingAct = false; p.pendingJump = false; }
    if (ph.swapT <= 0) { [ph.dr, ph.jp] = [ph.jp, ph.dr]; ph.selQ = null; wizSwap(st); }
    wizPoCam(st, dt); return;
  }
  // doors run out; the clock hand wipes them
  for (const k of ['inD', 'outD']) { const o = ph[k]; if (!o) continue; if (ph.outD) o.t -= dt; if (o.t <= 0) { ph.inD = ph.outD = null; Sfx.play('wizPoClear'); break; } }
  if (sp.hand) for (const k of ['inD', 'outD']) { const o = ph[k]; if (!o) continue; const a = wizPoAt(ph, o.q); if (wizPoHandHits(ph, sp.hand, a.x, a.y)) { ph.inD = ph.outD = null; Sfx.play('wizPoClear'); wizPop(st, a.x, a.y - 50, 'Swept away!', '#ffffff', 14); break; } }
  ph.inside = Math.max(0, (ph.inside || 0) - dt);
  // --- the DRAWER: the ring (up / down), the stamp ---
  const onLadder = ph.roped && Math.abs(d.x + d.w / 2 - sp.ladder) < 14 && d.y + d.h > wizPoY(ph.step) - 2 && d.y + d.h <= wizPoY(ph.step - 1) + 2;
  const upNow = wizUp(d), dnNow = !!d.input.down;
  if (!onLadder) {
    const reach = wizPoReach(ph), n = reach.length, i = reach.indexOf(wizPoSelQ(ph, reach));
    if (n && upNow && !ph.upWas) { ph.selQ = reach[(i + n - 1) % n]; Sfx.play('wizPoTick'); }
    if (n && dnNow && !ph.dnWas) { ph.selQ = reach[(i + 1) % n]; Sfx.play('wizPoTick'); }
  }
  ph.upWas = upNow; ph.dnWas = dnNow;
  if (d.pendingAct) { d.pendingAct = false; wizPoStamp(st); }
  // --- moving: the DRAWER walks or climbs; the JUMPER walks and jumps ---
  if (onLadder && (upNow || dnNow)) {
    d.vx = 0; d.vy = 0; d.x = sp.ladder - d.w / 2; d.y += (upNow ? -1 : 1) * K.climb * dt; d.grounded = false;
    if (d.y + d.h <= wizPoY(ph.step)) { d.y = wizPoY(ph.step) - d.h; d.grounded = true; }
  } else if (onLadder && !d.grounded && d.y + d.h < wizPoY(ph.step - 1) - 2) { d.vx = 0; d.vy = 0; }   // (hanging on)
  else wizBody(d, dt, ph.solids, { ctl: (q, dd) => { const real = q.input; q.input = Object.assign({}, real, { jump: false, up: false, down: false }); q.pendingJump = false; try { control(q, dd); } finally { q.input = real; } } });
  const vy0 = j.vy, vx0 = j.vx, g0 = j.grounded;
  if (j.pendingAct && ph.roped === false && sp.rope != null) {
    if (Math.abs(j.x + j.w / 2 - sp.rope) < 22 && j.grounded && Math.abs(j.y + j.h - wizPoY(ph.step)) < 4) { ph.roped = true; Sfx.play('wizPoRope'); wizPop(st, sp.rope, wizPoY(ph.step) - 50, 'The ladder drops!', '#ffd23f', 16); }
  }
  j.pendingAct = false;
  wizBody(j, dt, ph.solids);
  // the DRAWER walking into a door: not for them
  if (ph.inD && ph.outD) for (const k of ['inD', 'outD']) { const a = wizPoAt(ph, ph[k].q); if (!ph[k].q.pad && Math.abs(d.x + d.w / 2 - a.x) < 10 && Math.abs(d.y + d.h - a.y) < 4 && !ph.saidNot) { ph.saidNot = 1.5; wizPop(st, a.x, a.y - 56, 'Not you!', '#ffffff', 14); } }
  ph.saidNot = Math.max(0, (ph.saidNot || 0) - dt);
  // the JUMPER into the IN door (a door: walking in; a pad: landing on it)
  if (ph.inD && ph.outD && ph.inside <= 0) {
    const a = wizPoAt(ph, ph.inD.q), jcx = j.x + j.w / 2, feet = j.y + j.h;
    if (ph.inD.q.pad) { if (j.grounded && !g0 && Math.abs(jcx - a.x) < 32 && Math.abs(feet - a.y) < 4) wizPoGo(st, j, Math.abs(vy0), vx0); }
    else if (Math.abs(jcx - a.x) < 10 && Math.abs(feet - a.y) < 6) wizPoGo(st, j, Math.hypot(vx0, vy0), vx0 || (j.face || 1) * 120);
  }
  // the pendulum knocks the JUMPER back
  if (sp.pend) { const b = wizPoPend(ph, sp); if (Math.hypot(j.x + j.w / 2 - b.x, j.y + j.h / 2 - b.y) < K.pend.r + 12) { knock(j, (j.x + j.w / 2 < b.x ? -1 : 1) * 320, -260, 0.35, 0); Sfx.play('wizPoBong'); wizPop(st, b.x, b.y - 30, 'Bong!', '#ffffff', 16); } }
  // the bell
  if (sp.bell && !ph.done && Math.hypot(j.x + j.w / 2 - sp.bell.x, j.y - sp.bell.y) < 36) { ph.bell = 1; ph.roped = true; Sfx.play('wizPoBell'); wizPop(st, sp.bell.x, sp.bell.y - 40, 'DONG!', '#ffd23f', 26); }
  // a fall below the ledge they came from
  if (j.grounded && j.ground && j.ground.ledge != null && j.ground.ledge < ph.step - 1) wizPoFall(st, j);
  if (d.grounded && d.ground && d.ground.ledge != null && d.ground.ledge < ph.step - 1) wizPoFall(st, d);
  for (const p of ps) { if (p.x < 80) p.x = 80; if (p.x > 880 - p.w) p.x = 880 - p.w; }
  // the flag: both on the new ledge
  const up = p => p.grounded && p.ground && p.ground.ledge === ph.step;
  if (ph.roped && up(d) && (up(j) || sp.bell)) {
    if (ph.step >= 7) { if (!ph.done) { ph.done = true; wizPhaseDone(st, { say: 'DONG! Right to the top. The Door spell is yours!' }); } }
    else {
      ph.step++; ph.roped = false; ph.falls = 0; ph.inD = ph.outD = null; ph.selQ = null; Sfx.play('wizPoFlag');
      if (ph.step === 3) wizNews(st, WIZPO_NEWS[1]); else if (ph.step === 5) wizNews(st, WIZPO_NEWS[2]);
      if (ph.step === 4 || ph.step === 6) { ph.swapT = 1.2; wizSay(st, 'Swap! The jumper draws now.', 2.4); }
    }
  }
  ph.ring = wizPoSelQ(ph, wizPoReach(ph));
  wizPoCam(st, dt);
  wizPoHints(st);
}
function wizPoHints(st) {
  const ph = st.ph, P = wizPoPlan(st), D = P[ph.dr], J = P[ph.jp];
  if (!st.hints[ph.dr]) {
    if (D.tap === 'up' || D.tap === 'down') wizHint(st, ph.dr, 'Move the chalk ring: ' + wizKey(ph.dr, 'up') + ' / ' + wizKey(ph.dr, 'down'), { cpu: 'Picking a plate...' });
    else if (D.tap === 'act' && D.want) wizHint(st, ph.dr, (D.want === wizPoStep_(ph).inP ? 'Stamp the IN door: ' : 'Stamp the OUT door: ') + wizKey(ph.dr, 'act'), { cpu: D.want === wizPoStep_(ph).inP ? 'IN door!' : 'OUT door!', life: 1.4 });
    else if (D.why === 'climb') wizHint(st, ph.dr, 'Climb the ladder: hold ' + wizKey(ph.dr, 'up'), { cpu: 'Climbing up!' });
  }
  if (!st.hints[ph.jp]) {
    if (J.why === 'through') wizHint(st, ph.jp, 'Walk into the indigo door!', { cpu: 'In I go!', life: 1.6 });
    else if (J.why === 'drop') wizHint(st, ph.jp, 'Drop onto the low pad!', { cpu: 'Geronimo!', life: 1.6 });
    else if (J.tap === 'act') wizHint(st, ph.jp, 'Pull the rope! ' + wizKey(ph.jp, 'act'), { cpu: 'Ladder coming down!', life: 1.4 });
  }
}
function wizPoCam(st, dt) {
  const ph = st.ph, ps = G.players;
  const want = Math.min(0, Math.min(wizPoY(ph.step) - 140, (ps[0].y + ps[1].y) / 2 - 300));
  const tgt = Math.max(want, Math.min(ps[0].y, ps[1].y) - 400) ;
  st.cam.x = 0; st.cam.y += (Math.min(0, Math.max(tgt, wizPoY(ph.step - 1) - H + 80)) - st.cam.y) * Math.min(1, (dt || 0) * 2.5);
  const c = st.hm;
  c.x = 820; c.y += (st.cam.y + 100 - c.y) * Math.min(1, (dt || 0) * 2); c.face = -1;
  if (c.pose === 'talk' && !st.say) c.pose = 'idle';
}
function wizPoCoast(st, dt) {
  const ph = st.ph;
  if (!ph.steps) { wizCoast(dt); return; }
  for (const p of G.players) { p.vx = 0; p.vy = 0; p.pendingJump = false; p.pendingAct = false; }
  wizPoCam(st, dt || 0);
}

/* ---------- drawing ---------- */
function wizPoDrawBack(st) {
  const cy = st.cam.y;
  ctx.fillStyle = '#3a3050'; ctx.fillRect(0, cy - 40, W, H + 80);
  // the tower's inner wall: stones, and the big clock face far behind
  ctx.fillStyle = '#463c5e'; for (let y = Math.floor((cy - 40) / 40) * 40; y < cy + H + 40; y += 40) for (let x = 80 + ((y / 40) % 2 ? 0 : 30); x < 880; x += 60) ctx.fillRect(x, y, 56, 36);
  ctx.fillStyle = '#2a2240'; ctx.fillRect(0, cy - 40, 80, H + 80); ctx.fillRect(880, cy - 40, 80, H + 80);
}
function wizPoDrawDoor(x, y, kind, t, life, pad) {
  ctx.save(); ctx.translate(x, y);
  const col = kind === 'in' ? '#6f6cff' : '#e0e0f0', a = life < 2 ? 0.5 + 0.5 * Math.sin(t * 16) : 1;
  ctx.globalAlpha = a; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  if (pad) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -2, 30, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(20,10,40,0.7)'; ctx.beginPath(); ctx.ellipse(0, -2, 20, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.fillStyle = col; rr(-15, -46, 30, 46, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(20,10,40,0.7)'; rr(-10, -40, 20, 40, 10); ctx.fill(); }
  ctx.restore();
}
function wizPoDraw(st) {
  const ph = st.ph, K = WIZPO, t = G.clock, sp = wizPoStep_(ph);
  ctx.lineJoin = 'round';
  for (const r of ph.solids) if (r.kind === 'ledge' || r.kind === 'floor') { ctx.fillStyle = '#7a5a3a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.kind === 'floor' ? 300 : 16); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.kind === 'floor' ? 300 : 16); ctx.fillStyle = '#e8c860'; for (let x = r.x0 + 10; x < r.x1 - 10; x += 60) { ctx.beginPath(); ctx.moveTo(x, r.y0); ctx.lineTo(x + 18, r.y0 - 6); ctx.lineTo(x + 36, r.y0); ctx.fill(); } }
  // the clock hand
  if (sp.hand) { ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#c8a040'; ctx.lineWidth = 6; circle(sp.hand.x, sp.hand.y, K.hand.len + 10); ctx.stroke(); ctx.fillStyle = '#c8a040'; for (let i = 0; i < 12; i++) { const q = i * Math.PI / 6; circle(sp.hand.x + Math.cos(q) * (K.hand.len - 8), sp.hand.y + Math.sin(q) * (K.hand.len - 8), i % 3 ? 5 : 9); ctx.fill(); } ctx.restore(); }
  if (sp.hand) { const a = wizPoHandA(ph, sp.hand); ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sp.hand.x, sp.hand.y); ctx.lineTo(sp.hand.x + Math.cos(a) * K.hand.len, sp.hand.y + Math.sin(a) * K.hand.len); ctx.stroke(); ctx.fillStyle = '#c8a040'; circle(sp.hand.x, sp.hand.y, 14); ctx.fill(); }
  // the plates, the ring, the doors
  const selq = ph.ring;   // (worked out in the step: here the players are in screen space)
  for (const q of ph.plates) {
    const a = wizPoAt(ph, q), gold = ph.gold && (q === sp.inP || q === sp.outP);
    const live = q.ledge <= ph.step && q.ledge >= ph.step - (sp.launch ? 2 : 1);
    ctx.strokeStyle = gold ? '#ffd23f' : live ? 'rgba(240,240,255,0.6)' : 'rgba(240,240,255,0.18)'; ctx.lineWidth = 2;
    if (q.pad) { ctx.beginPath(); ctx.ellipse(a.x, a.y - 2, 30, 7, 0, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.setLineDash([5, 4]); rr(a.x - 15, a.y - 46, 30, 46, 14); ctx.stroke(); ctx.setLineDash([]); }
    if (q.gear) { ctx.fillStyle = '#9a8a6a'; circle(a.x, a.y + 14, 10); ctx.fill(); }
  }
  if (ph.inD) { const a = wizPoAt(ph, ph.inD.q); wizPoDrawDoor(a.x, a.y, 'in', t, ph.outD ? ph.inD.t : 9, ph.inD.q.pad); }
  if (ph.outD) { const a = wizPoAt(ph, ph.outD.q); wizPoDrawDoor(a.x, a.y, 'out', t, ph.outD.t, ph.outD.q.pad); }
  if (selq && !ph.done) { const a = wizPoAt(ph, selq); ctx.save(); ctx.strokeStyle = WIZ_SPELLS.door.col; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); circle(a.x, a.y - 22, 30); ctx.stroke(); ctx.restore(); }
  // ropes, ladders, the pendulum, the bell
  if (sp.rope != null && !ph.roped) { const y = wizPoY(ph.step); ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sp.rope, y - 120); ctx.lineTo(sp.rope, y - 40); ctx.stroke(); ctx.fillStyle = '#ff8fd0'; circle(sp.rope, y - 36, 6); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); }
  if (ph.roped && !ph.done) { const y0 = wizPoY(ph.step), y1 = wizPoY(ph.step - 1); ctx.strokeStyle = '#a07040'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sp.ladder - 12, y0 - 10); ctx.lineTo(sp.ladder - 12, y1); ctx.moveTo(sp.ladder + 12, y0 - 10); ctx.lineTo(sp.ladder + 12, y1); for (let y = y0; y < y1; y += 18) { ctx.moveTo(sp.ladder - 12, y); ctx.lineTo(sp.ladder + 12, y); } ctx.stroke(); }
  if (sp.pend) { const b = wizPoPend(ph, sp); ctx.strokeStyle = '#8a7a6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sp.pend.x, sp.pend.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.fillStyle = '#c8a040'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(b.x, b.y, K.pend.r); ctx.fill(); ctx.stroke(); }
  if (sp.bell || ph.step === 7) { const b = ph.steps[7].bell, sw = Math.sin(t * 8) * ph.bell * 0.4; ctx.save(); ctx.translate(b.x, b.y - 30); ctx.rotate(sw); ctx.fillStyle = '#e0b040'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-26, 34); ctx.quadraticCurveTo(-24, 0, 0, -4); ctx.quadraticCurveTo(24, 0, 26, 34); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  // flags at each ledge's hay pile
  for (let i = 1; i <= 7; i++) { const x = i % 2 ? 110 : 850; wizDrawFlag(x, wizPoY(i), i < ph.step); }
}

WIZ_PHASES.portal = {
  setup(st, L) { wizPoSetup(st, L); },
  step(st, dt) { wizPoStep(st, dt); },
  coast(st, dt) { wizPoCoast(st, dt); },
  plan(st) { return wizPoPlan(st); },
  labels(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.dr ? 'door' : 'pull')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.dr ? 'Draw!' : 'Jump!')); },
  legend(st) { const ph = st.ph, c = k => (k ? '<kbd>↑</kbd><kbd>↓</kbd> pick a plate' : '<kbd>W</kbd><kbd>S</kbd> pick a plate'); return { pip: ph.dr === 0 ? c(0) : 'through the doors', bo: ph.dr === 1 ? c(1) : 'through the doors', pad: 'drawer: up / down picks a plate,' }; },
  hudText(st) { const ph = st.ph; return 'Ledge ' + Math.min(7, ph.step) + ' of 7'; },
  progress(st) { const ph = st.ph; return { n: ph.step - 1 + (ph.done ? 1 : 0), of: 7 }; },
  drawBack(st) { wizPoDrawBack(st); },
  draw(st) { wizPoDraw(st); },
  statLine(st) { const s = st.stats.portal; return s && s.trips ? s.trips + ' trips through the doors' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizPoTick = function () { this.tone(1100, 0.03, 'square', 0.015); };
Sfx.extra.wizPoIn = function () { this.tone(400, 0.15, 'sine', 0.035, 700); };
Sfx.extra.wizPoOut = function () { this.tone(700, 0.15, 'sine', 0.035, 1100); };
Sfx.extra.wizPoClear = function () { this.tone(500, 0.12, 'triangle', 0.02, 250); };
Sfx.extra.wizPoWhoosh = function () { this.tone(300, 0.25, 'sawtooth', 0.02, 1200); };
Sfx.extra.wizPoRope = function () { this.tone(200, 0.1, 'square', 0.03, 140); };
Sfx.extra.wizPoBong = function () { this.tone(180, 0.3, 'triangle', 0.04, 160); };
Sfx.extra.wizPoBell = function () { [523, 392, 523, 392].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.05, null, i * 0.3)); };
Sfx.extra.wizPoHay = function () { this.tone(240, 0.15, 'sine', 0.03, 180); };
Sfx.extra.wizPoFlag = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.03, null, i * 0.06)); };

/* ---------- the room ---------- */
wizRoom('portal', {
  act: { label: 'door', labels: ['door', 'pull'] },
  tip: 'The drawer picks a plate with up / down and stamps an IN door, then an OUT door. Jumper, walk on through!',
  legend: { pip: '<kbd>W</kbd><kbd>S</kbd> pick a plate', bo: 'through the doors', pad: 'drawer: up / down picks a plate,' },
  map: WIZ_EMPTY_MAP,
});
