/* Pip & Bo - Level 35-1 Moonwick Academy: class 4 'glow' (Light Spell, spell Glow). */
'use strict';

/* ===== 35-1 class 4: Light Spell (WIZ_PHASES.glow) ===============================================================
   The midnight cellars, pitch black, scrolling right. One carries the wand light; the other can only see, and only
   move properly, where the light falls. Ink shadows creep in from the dark.

   THE TWO JOBS (room field `first` is the first LIGHT; they swap in the two lantern rooms)
   - LIGHT (action word "flash"): the wand makes a circle of light WIZGLOW.r px across (about 190). HOLD UP (W / ↑ / ▲,
     the jump button: the LIGHT never jumps) to raise the wand (the circle lifts 120 px to light ledges above), HOLD
     DOWN to lower it. The action is a bright FLASH: the circle doubles for 0.6 s and every shadow in it puffs away
     (then WIZGLOW.flash.rest s rest). The LIGHT walks along the floor; pits and gates stop it.
   - FINDER (action word "pull"): outside the light the dark is sticky: they creep (WIZGLOW.creep px/s) and can't jump.
     Inside it they run and jump freely. They do the athletic work: jump up to ledges and pull levers that open gates
     and drop bridges over the pits for the LIGHT (a lever needs no light, only reaching it does).
   So the LIGHT can't pass a gate or a pit without the FINDER, and the FINDER can't jump without the LIGHT.

   HAZARDS. Ink shadows (blobs with two white eyes) slide in from the screen edges toward whoever stands in the dark or
   at the rim of the light; they can't come into the bright middle (standing still in the light is always safe). A
   shadow that touches a player grabs their feet for 1.5 s (no Oops); three grabs on one player inside 10 s is
   "Lights out!": an Oops, and both pop back to the last lantern post. Drips from the ceiling snuff the wand for 1 s
   (a ripple ring shows where first). Glow moths (part 3) follow the light and dim it by a third until flashed away.
   Falling into a pit: an Oops, back to the edge.

   COURSE: three parts, lantern posts as flags (every post the LIGHT passes is the safe spot):
     1 The Coal Cellar          gates with levers on ledges (one needs the wand raised: two ledges high)
     2 The Old Well             pits: jump over in the light, pull the far lever, the bridge drops; drips
     3 The Crypt of Lost Homework  shadows from both sides, glow moths, a gate, a pit, a gate, then the exit door,
                                where a much bigger shadow with the same white eyes watches from behind a grate.
   Jobs swap in the two lantern rooms (lit, everyone moves freely). GOLD HELP after WIZ.goldAfter Oops in one part: a gold
   candle, the light circle is 40% bigger for 30 s (announced).
   Stats (st.stats.glow): levers, flashes, puffed, grabs.   Names: wizGlow* / WIZGLOW*. */
const WIZGLOW = {
  floor: 430,
  r: 95,                        // the light's radius (the circle is about 190 px across)
  raise: 120, lower: 50, raiseV: 420,
  creep: 55,
  flash: { t: 0.6, rest: 4, k: 2 },
  grab: { t: 1.5, n: 3, win: 10 },
  shadow: { v: 72, repel: 0.78, push: 160, size: 16 },
  drip: { period: 4.2, warn: 1.1, snuff: 1 },
  moth: { every: 11, dim: 2 / 3 },
  gate: { w: 16, h: 470 },        // (up to the ceiling: nobody hops over a gate)
  goldT: 30, goldK: 1.4,
  // three parts built from a pattern (see wizGlowParts): g90 a gate with its lever on a ledge, g165 a gate with its
  // lever two ledges up (the wand raised), p a pit with its lever on the far side
  len: 3400, every: 430, first: 520,
  seq: [['g90', 'g165', 'g90', 'g165', 'g90', 'g165'], ['p', 'g165', 'p', 'g90', 'p', 'g165'], ['g90', 'p', 'g165', 'p', 'g165', 'p', 'g90']],
  shadowEvery: [6.5, 5, 3.2],
  gateRise: 0.9,
};
WIZGLOW.parts = WIZGLOW.seq.map((seq, k) => {
  const K = WIZGLOW, x0 = k * K.len, pt = { x0, x1: x0 + K.len, room: k < 2 ? [x0 + K.len - 240, x0 + K.len] : null, end: k === 2 ? x0 + K.len - 180 : null,
    shadowEvery: K.shadowEvery[k], sides: k === 2 ? 2 : 1, moths: k === 2, gates: [], pits: [], drips: [] };
  seq.forEach((o, i) => {
    const x = x0 + K.first + i * K.every;
    if (o === 'p') pt.pits.push({ x, w: 90 + 5 * k, lever: [x + 90 + 5 * k + 80, 0] });
    else if (o === 'g90') pt.gates.push({ x, lever: [x - 80, 90] });
    else pt.gates.push({ x, lever: [x - 80, 165], steps: [[x - 170, 85]] });
    if (k > 0 && i % 2 === 1) pt.drips.push(x + Math.round(K.every / 2));
  });
  return pt;
});
const WIZGLOW_NEWS = ['Part 1: The Coal Cellar. Light the way, pull the levers!', 'Part 2: The Old Well. Mind the pits and the drips!', 'Part 3: The Crypt of Lost Homework. Shadows from both sides!'];
const WIZGLOW_C = { wall: '#2a2238', wallLt: '#3a3050', floor: '#4a4058', floorLt: '#6a5e80', coal: '#1e1a26', wood: '#7a5230', woodDk: '#4a3018', brass: '#d9a441', ink: '#0c0814' };

function wizGlowSetup(st, L) {
  const ph = st.ph, K = WIZGLOW;
  ph.light = L.def.first || 0; ph.find = 1 - ph.light;
  ph.part = 0; ph.t = 0; ph.raise = 0; ph.flashT = 0; ph.flashCool = 0; ph.snuff = 0; ph.gold = 0; ph.done = false;
  ph.solids = []; ph.gates = []; ph.pits = []; ph.levers = []; ph.drips = []; ph.posts = []; ph.shadows = []; ph.moths = []; ph.spawnT = 3; ph.mothT = 6;
  ph.grabs = [[], []]; ph.grabT = [0, 0]; ph.safeX = [0, 0];
  const S = ph.solids, F = K.floor;
  S.push({ x0: -40, y0: -400, x1: 0, y1: 800, kind: 'wall' });
  // the floor, with pits cut out
  const cuts = [];
  K.parts.forEach((pt, k) => {
    for (const pi of pt.pits) {
      const p = { part: k, x0: pi.x, x1: pi.x + pi.w, down: false };
      ph.pits.push(p); cuts.push(p);
      const lv = { part: k, x: pi.lever[0], y: F - pi.lever[1], pit: p, pulled: false };
      ph.levers.push(lv);
      if (pi.lever[1]) S.push({ x0: lv.x - 48, y0: lv.y, x1: lv.x + 48, y1: lv.y + 12, one: true, kind: 'ledge' });
      p.bridge = { x0: p.x0 - 4, y0: F, x1: p.x1 + 4, y1: F + 14, kind: 'bridge', off: true };
      S.push(p.bridge);
    }
    for (const g of pt.gates) {
      const gt = { part: k, x: g.x, open: false, rect: { x0: g.x, y0: F - K.gate.h, x1: g.x + K.gate.w, y1: F, kind: 'gate' } };
      ph.gates.push(gt); S.push(gt.rect);
      const lv = { part: k, x: g.lever[0], y: F - g.lever[1], gate: gt, pulled: false };
      ph.levers.push(lv);
      if (g.lever[1]) S.push({ x0: lv.x - 48, y0: lv.y, x1: lv.x + 48, y1: lv.y + 12, one: true, kind: 'ledge' });
      for (const [sx, sh] of g.steps || []) S.push({ x0: sx - 60, y0: F - sh, x1: sx + 60, y1: F - sh + 12, one: true, kind: 'ledge' });
    }
    for (const dx of pt.drips) ph.drips.push({ part: k, x: dx, ph: (dx % 7) * 0.5, state: 'off' });
    ph.posts.push({ part: k, x: pt.x0 + 70, lit: k === 0 }, { part: k, x: Math.round((pt.x0 + (pt.room ? pt.room[0] : pt.end)) / 2 / 10) * 10, lit: false });
  });
  cuts.sort((a, b) => a.x0 - b.x0);
  let fx = 0;
  for (const c of cuts) { S.push({ x0: fx, y0: F, x1: c.x0, y1: F + 300, kind: 'floor' }); fx = c.x1; }
  S.push({ x0: fx, y0: F, x1: K.parts[2].x1 + 200, y1: F + 300, kind: 'floor' });
  S.push({ x0: K.parts[2].x1, y0: -400, x1: K.parts[2].x1 + 40, y1: 800, kind: 'wall' });
  ph.post = ph.posts[0];
  const ps = G.players;
  ps.forEach((p, i) => Object.assign(p, { x: (p.id === ph.light ? 120 : 175) - p.w / 2, y: F - p.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true }));
  ph.safeX = [ps[0].x, ps[1].x];
  st.cam = { x: 0, y: 0 };
  const s = wizStats(st); Object.assign(s, { levers: s.levers || 0, flashes: s.flashes || 0, puffed: s.puffed || 0, grabs: s.grabs || 0 });
  Object.assign(st.hm, { x: 700, y: 170, s: 0.8, face: -1, pose: 'talk' });
  wizSay(st, 'The Light Spell! Down to the cellars. Stay in the light, dears.', 3);
  wizNews(st, WIZGLOW_NEWS[0]);
}
const wizGlowPart = ph => WIZGLOW.parts[ph.part];
const wizGlowR = ph => WIZGLOW.r * (ph.gold > 0 ? WIZGLOW.goldK : 1) * (ph.snuff > 0 ? 0.25 : 1) * (ph.moths.some(m => m.on) ? WIZGLOW.moth.dim : 1) * (ph.flashT > 0 ? WIZGLOW.flash.k : 1);
function wizGlowCenter(ph) {
  const p = G.players[ph.light];
  return { x: p.x + p.w / 2 + (p.face || 1) * 12, y: p.y + p.h / 2 - 4 - ph.raise };
}
// lit zones: the lantern rooms (and the light circle)
const wizGlowRoomAt = x => WIZGLOW.parts.some(pt => pt.room && x > pt.room[0] && x < pt.room[1]);
function wizGlowLit(ph, p, k = 0.92) {
  if (wizGlowRoomAt(p.x + p.w / 2)) return true;
  const c = wizGlowCenter(ph);
  return Math.hypot(p.x + p.w / 2 - c.x, p.y + p.h / 2 - c.y) < wizGlowR(ph) * k;
}
// the first thing ahead that stops the LIGHT: a closed gate or an unbridged pit (with its lever)
function wizGlowNext(ph) {
  let best = null;
  for (const g of ph.gates) if (!g.open && g.part === ph.part && (!best || g.x < best.x)) best = { kind: 'gate', x: g.x, g };
  for (const p of ph.pits) if (!p.down && p.part === ph.part && (!best || p.x0 < best.x)) best = { kind: 'pit', x: p.x0, p };
  if (best) best.lever = ph.levers.find(l => (best.g && l.gate === best.g) || (best.p && l.pit === best.p));
  return best;
}
function wizGlowPlan(st) {
  const ph = st.ph, K = WIZGLOW, ps = G.players, lt = ps[ph.light], fd = ps[ph.find], out = [null, null];
  const pt = wizGlowPart(ph), nx = wizGlowNext(ph), lx = lt.x + lt.w / 2, fx = fd.x + fd.w / 2;
  const goal = pt.room ? (pt.room[0] + pt.room[1]) / 2 : pt.end + 40;
  // shadows close to the light: flash
  const c = wizGlowCenter(ph), R = wizGlowR(ph);
  const near = ph.shadows.some(s => !s.dead && Math.hypot(s.x - c.x, s.y - c.y) < R * 1.7) || ph.moths.some(m => m.on);
  const flash = near && ph.flashCool <= 0 && ph.flashT <= 0 ? 'act' : null;
  let ltX, hold = null, why;
  if (!nx) { ltX = goal - 30; why = 'walk'; out[ph.find] = { why: 'walk', x: goal + 30 }; }
  else {
    const lv = nx.lever, high = lv.y < K.floor - 120;
    if (nx.kind === 'gate') {
      ltX = Math.min(nx.x - 30, lv.x - 20); why = high ? 'raise' : 'light';
      if (high && Math.abs(fx - lv.x) < 160 && fd.y + fd.h < K.floor - 40) hold = 'up';   // (once they're up on the step)
      out[ph.find] = { why: lv.pulled ? 'walk' : 'lever', x: lv.x, y: lv.y, lever: lv, high };
    } else {
      ltX = nx.x - 22; why = 'edge';
      out[ph.find] = { why: 'lever', x: lv.x, y: lv.y, lever: lv, pit: nx.p, across: fx < nx.p.x1 };
    }
  }
  // lead by half a body, but never leave the finder in the dark: wait for them
  if (!wizGlowLit(ph, fd, 0.75) && Math.abs(fx - lx) > 40 && !(out[ph.find].pit && fx > out[ph.find].pit.x1)) ltX = clamp(ltX, fx - 40, fx + 40);
  if (ph.snuff <= 0) for (const d of ph.drips) if (d.state === 'warn' && Math.abs(d.x - ltX) < 30) ltX = d.x + (ltX < d.x ? -34 : 34);
  out[ph.light] = { why: flash ? 'flash' : why, x: ltX, hold, tap: flash };
  return out;
}
function wizGlowPull(st, lv) {
  const ph = st.ph;
  lv.pulled = true; wizStats(st).levers++; Sfx.play('wizGlowLever');
  wizPop(st, lv.x, lv.y - 40, 'Clunk!', '#ffd23f', 18);
  if (lv.gate) { lv.gate.rising = WIZGLOW.gateRise; Sfx.play('wizGlowGate'); }
  if (lv.pit) { lv.pit.down = true; lv.pit.bridge.off = false; Sfx.play('wizGlowGate'); }
}
function wizGlowLightsOut(st, p) {
  const ph = st.ph;
  if (!wizOops(st, p, { word: 'Lights out!', kind: 'dark', still: true })) return;
  const n = wizMiss(st, 'p' + ph.part);
  wizReact(st, 'calm', ['Hm. I really must clean down here.', 'Shadows are ticklish. And rude.', 'Flash them, dears!'][n % 3], 2.2);
  if (n >= WIZ.goldAfter && wizGoldOnce(st, 'candle' + ph.part, 'Gold candle! The light is 40% bigger for 30 s.')) ph.gold = WIZGLOW.goldT;
  else if (n > WIZ.goldAfter && n % 2 === 0) ph.gold = WIZGLOW.goldT;
  const x = ph.post.x;
  G.players.forEach(q => { Object.assign(q, { x: x + (q.id === ph.light ? 0 : 50) - q.w / 2, y: WIZGLOW.floor - q.h, vx: 0, vy: -200, grounded: false }); ph.grabT[q.id] = 0; ph.grabs[q.id] = []; });
  ph.shadows = []; ph.moths = [];
  puff(x, WIZGLOW.floor - 30, 10, 'rgba(255,240,200,0.8)');
}
function wizGlowStep(st, dt) {
  const ph = st.ph, K = WIZGLOW, ps = G.players, lt = ps[ph.light], fd = ps[ph.find];
  ph.t += dt;
  if (st.idle) { wizGlowCoast(st, dt); return; }
  ph.gold = Math.max(0, ph.gold - dt); ph.snuff = Math.max(0, ph.snuff - dt); ph.flashT = Math.max(0, ph.flashT - dt); ph.flashCool = Math.max(0, ph.flashCool - dt);
  // --- the LIGHT's wand ---
  const up = wizUp(lt), down = !!lt.input.down && !up;
  const want = up ? K.raise : down ? -K.lower : 0;
  ph.raise += clamp(want - ph.raise, -K.raiseV * dt, K.raiseV * dt);
  const flashP = lt.pendingAct; lt.pendingAct = false; lt.pendingJump = false;
  if (flashP) {
    if (ph.flashCool <= 0) {
      ph.flashT = K.flash.t; ph.flashCool = K.flash.rest + K.flash.t; wizStats(st).flashes++; Sfx.play('wizSpell_glow');
      const c = wizGlowCenter(ph), R = K.r * K.flash.k * (ph.gold > 0 ? K.goldK : 1);
      for (const s of ph.shadows) if (!s.dead && Math.hypot(s.x - c.x, s.y - c.y) < R + 10) { s.dead = 0.4; wizStats(st).puffed++; puff(s.x, s.y, 6, 'rgba(40,20,60,0.9)'); }
      for (const m of ph.moths) if (m.on) { m.on = false; burst(m.x, m.y, '#fff3c4', 6); }
    } else wizPop(st, lt.x + lt.w / 2, lt.y - 30, 'Recharging...', '#ffe9a0', 14);
  }
  // --- bodies ---
  for (const p of ps) ph.grabT[p.id] = Math.max(0, ph.grabT[p.id] - dt);
  const sol = wizGlowSolids(st);
  wizBody(lt, dt, sol, { ctl: (p, d) => {
    const real = p.input; p.input = Object.assign({}, real, { jump: false, up: false, down: false }); p.pendingJump = false;
    if (ph.grabT[p.id] > 0) p.input = NO_INPUT;
    try { control(p, d); } finally { p.input = real; }
  } });
  const litF = wizGlowLit(ph, fd);
  ph.findLit = litF;
  wizBody(fd, dt, sol, { ctl: (p, d) => {
    const real = p.input;
    if (ph.grabT[p.id] > 0) p.input = NO_INPUT;
    else if (!litF && p.grounded) { p.input = Object.assign({}, real, { jump: false }); p.pendingJump = false; }
    try { control(p, d); } finally { p.input = real; }
    if (!litF && p.grounded) p.vx = clamp(p.vx, -K.creep, K.creep);
  } });
  const pullP = fd.pendingAct; fd.pendingAct = false;
  if (pullP) {
    const lv = ph.levers.find(l => !l.pulled && Math.abs(fd.x + fd.w / 2 - l.x) < 42 && Math.abs(fd.y + fd.h - l.y) < 36);
    if (lv) wizGlowPull(st, lv);
  }
  // falls into a pit: back to the edge
  for (const p of ps) {
    if (p.grounded && p.ground && (p.ground.kind === 'floor' || p.ground.kind === 'bridge')) ph.safeX[p.id] = p.x;
    if (p.y > K.floor + 120) {
      const x = ph.safeX[p.id];
      wizOops(st, p, { word: 'Down the well!', kind: 'pit', to: { x: x + p.w / 2, y: K.floor - 2 } });
      if (p.y > K.floor + 120) Object.assign(p, { x, y: K.floor - p.h - 2, vx: 0, vy: 0 });
      if (p.id === ph.light) wizMiss(st, 'p' + ph.part);
    }
  }
  for (const g of ph.gates) if (g.rising > 0 && (g.rising -= dt) <= 0) { g.rising = 0; g.open = true; g.rect.off = true; }
  // --- posts, drips, moths, shadows ---
  for (const q of ph.posts) if (!q.lit && lt.x > q.x) { q.lit = true; ph.post = q; Sfx.play('wizTick'); }
  for (const q of ph.posts) if (q.lit && q.x > ph.post.x && q.x < lt.x) ph.post = q;
  wizGlowDrips(st, dt);
  wizGlowShadows(st, dt);
  // --- lantern rooms and the exit ---
  const pt = wizGlowPart(ph);
  if (pt.room && ps.every(p => p.x + p.w / 2 > pt.room[0] + 20 && p.x + p.w / 2 < pt.room[1] - 10)) {
    ph.part++; [ph.light, ph.find] = [ph.find, ph.light]; wizSwap(st); ph.raise = 0; ph.shadows = []; ph.moths = [];
    wizSay(st, ['A lantern room! Swap the wand, dears.', 'Swap again. The Crypt is next. Mind the shadows.'][ph.part - 1], 2.6);
    wizNews(st, WIZGLOW_NEWS[ph.part]); Sfx.play('wizGlowRoom');
    const q = ph.posts.find(p => p.part === ph.part); if (q) { q.lit = true; ph.post = q; }
  }
  if (pt.end && !ph.done && ps.every(p => p.x + p.w / 2 > pt.end - 40) && ph.gates.every(g => g.open)) {
    ph.done = true; wizStats(st).lit = true;
    wizPhaseDone(st, { say: 'Hm. I really must clean down here. Glow is yours!' });
  }
  wizGlowCam(st, dt);
  wizGlowHints(st);
}
function wizGlowSolids(st) {
  return st.ph.solids.concat([{ x0: st.cam.x - 40, y0: -400, x1: st.cam.x + 2, y1: 800, kind: 'edge' }, { x0: st.cam.x + W - 2, y0: -400, x1: st.cam.x + W + 40, y1: 800, kind: 'edge' }]);
}
function wizGlowDrips(st, dt) {
  const ph = st.ph, K = WIZGLOW, lt = G.players[ph.light];
  for (const d of ph.drips) {
    if (d.part !== ph.part) { d.state = 'off'; continue; }
    const c = (ph.t + d.ph) % K.drip.period, was = d.state;
    d.state = c > K.drip.period - K.drip.warn ? 'warn' : c < 0.35 ? 'drop' : 'off';
    if (d.state === 'drop' && was === 'warn') {
      Sfx.play('wizGlowPlink');
      if (Math.abs(lt.x + lt.w / 2 - d.x) < 26) { ph.snuff = K.drip.snuff; wizPop(st, d.x, lt.y - 30, 'Plink! Fzzt.', '#bfe0ff', 16); Sfx.play('wizGlowFizz'); }
    }
  }
}
function wizGlowShadows(st, dt) {
  const ph = st.ph, K = WIZGLOW, pt = wizGlowPart(ph), ps = G.players, c = wizGlowCenter(ph), R = wizGlowR(ph);
  // spawning from the screen edges (both edges in part 3)
  ph.spawnT -= dt;
  if (ph.spawnT <= 0 && ph.shadows.length < 6) {
    ph.spawnT = pt.shadowEvery * (0.8 + wizRand() * 0.4);
    const side = pt.sides === 2 && wizRand() < 0.5 ? 1 : -1;
    const x = side < 0 ? st.cam.x - 20 : st.cam.x + W + 20;
    if (!wizGlowRoomAt(x)) ph.shadows.push({ x, y: K.floor - 12, vx: 0, dead: 0, eye: wizRand() * 6 });
  }
  if (pt.moths) { ph.mothT -= dt; if (ph.mothT <= 0 && !ph.moths.some(m => m.on)) { ph.mothT = K.moth.every; ph.moths.push({ x: st.cam.x + W + 10, y: 150, on: true, a: 0 }); Sfx.play('wizGlowMoth'); } }
  for (const m of ph.moths) { if (!m.on) continue; m.a += dt * 6; m.x += (c.x + Math.cos(m.a) * 30 - m.x) * Math.min(1, dt * 2); m.y += (c.y - 40 + Math.sin(m.a * 1.3) * 20 - m.y) * Math.min(1, dt * 2); }
  ph.moths = ph.moths.filter(m => m.on);
  for (const s of ph.shadows) {
    if (s.dead) { s.dead -= dt; if (s.dead <= 0) s.gone = true; continue; }
    // the target: whoever is in the dark or at the light's rim (the nearest)
    let tgt = null, bd = 1e9;
    for (const p of ps) {
      const px = p.x + p.w / 2, py = p.y + p.h / 2;
      if (wizGlowRoomAt(px)) continue;
      const lit = Math.hypot(px - c.x, py - c.y) < R * K.shadow.repel;
      if (lit) continue;
      const d = Math.abs(px - s.x);
      if (d < bd) { bd = d; tgt = p; }
    }
    const dir = tgt ? Math.sign(tgt.x + tgt.w / 2 - s.x) : Math.sign(s.x - c.x) || 1;
    s.vx = dir * K.shadow.v * (tgt ? 1 : 0.6);
    s.x += s.vx * dt;
    // the bright middle pushes them out
    const d = Math.hypot(s.x - c.x, s.y - c.y);
    if (d < R * K.shadow.repel) s.x += Math.sign(s.x - c.x || 1) * K.shadow.push * dt * 2;
    if (Math.abs(s.x - (st.cam.x + W / 2)) > W) s.gone = true;
    // a touch grabs the feet
    for (const p of ps) {
      if (ph.grabT[p.id] > 0 || st.safe[p.id] > 0) continue;
      if (Math.abs(p.x + p.w / 2 - s.x) < p.w / 2 + 10 && p.y + p.h > s.y - 12) {
        ph.grabT[p.id] = K.grab.t; s.dead = 0.4; wizStats(st).grabs++;
        wizPop(st, p.x + p.w / 2, p.y - 20, 'Grabbed!', '#c9b8ff', 16); Sfx.play('wizGlowGrab');
        const g = ph.grabs[p.id]; g.push(ph.t); while (g.length && ph.t - g[0] > K.grab.win) g.shift();
        if (g.length >= K.grab.n) wizGlowLightsOut(st, p);
        else wizHint(st, p.id, p.id === ph.light ? 'Flash them away! ' + wizKey(p.id, 'act') : 'Stay in the light!', { cpu: 'Eek! My feet!' });
        break;
      }
    }
  }
  ph.shadows = ph.shadows.filter(s => !s.gone);
}
function wizGlowHints(st) {
  const ph = st.ph, P = wizGlowPlan(st);
  const l = P[ph.light], f = P[ph.find];
  if (!st.hints[ph.light]) {
    if (l.tap) wizHint(st, ph.light, 'Flash! ' + wizKey(ph.light, 'act'), { cpu: 'Flash!', life: 1.4 });
    else if (l.hold === 'up' && ph.raise < 60) wizHint(st, ph.light, 'Raise the light! Hold ' + wizKey(ph.light, 'up'), { cpu: 'Lighting the ledge!' });
  }
  if (!st.hints[ph.find] && f.lever && !f.lever.pulled) {
    const fd = G.players[ph.find];
    if (Math.abs(fd.x + fd.w / 2 - f.lever.x) < 30 && Math.abs(fd.y + fd.h - f.lever.y) < 30) wizHint(st, ph.find, 'Pull the lever! ' + wizKey(ph.find, 'act'), { cpu: 'Pulling!', life: 1.4 });
  }
}
function wizGlowCam(st, dt) {
  const ph = st.ph, ps = G.players;
  const mid = (ps[0].x + ps[1].x) / 2 + 11, lt = ps[ph.light];
  const want = clamp((mid * 0.4 + (lt.x + 11) * 0.6) - W / 2 + 80, 0, WIZGLOW.parts[2].x1 - W + 40);
  st.cam.x += (want - st.cam.x) * Math.min(1, (dt || 0) * 3); st.cam.y = 0;
  const c = st.hm;
  c.x += (st.cam.x + 780 - c.x) * Math.min(1, (dt || 0) * 2); c.y = 150 + Math.sin(ph.t * 0.9) * 10; c.face = -1;
  if (c.pose === 'talk' && !st.say) c.pose = 'idle';
}
function wizGlowCoast(st, dt) {
  const ph = st.ph;
  if (!ph.solids) { wizCoast(dt); return; }
  for (const p of G.players) { p.vx = 0; p.vy = 0; p.pendingJump = false; p.pendingAct = false; }
  wizGlowCam(st, dt || 0);
}

/* ---------- drawing ---------- */
let wizGlowCv = null;
function wizGlowDrawBack(st) {
  const ph = st.ph, cx = st.cam.x, t = G.clock, C2 = WIZGLOW_C, F = WIZGLOW.floor;
  wizScreen(st, () => {
    ctx.fillStyle = C2.wall; ctx.fillRect(0, 0, W, H);
    // (art pass, 2nd look) the cellar wall: coursed blocks, each its own tone with a lit top, specks, chips and
    // cracks, damp darkening low down (world-pinned chunks at the wall's own parallax)
    const off = Math.round(cx * 0.8);
    ctx.save(); ctx.translate(-off, 0);
    RICH.strip('wizglwall', off - 10, off + W + 10, 0, F, 240, (c, gx, w, h) => {
      RICH.flags(c, 0, 0, w, h, { col: C2.wallLt, mortar: '#1a1424', course: 34, len: 60, seed: 61, gx });
      const g = c.createLinearGradient(0, h * 0.55, 0, h); g.addColorStop(0, 'rgba(10,6,16,0)'); g.addColorStop(1, 'rgba(10,6,16,0.45)'); c.fillStyle = g; c.fillRect(0, h * 0.55, w, h * 0.45);
    });
    ctx.restore();
  });
  // coal heaps, barrels of homework, crypt niches
  for (let k = 0; k < 3; k++) {
    const pt = WIZGLOW.parts[k];
    for (let x = pt.x0 + 160; x < pt.x1 - 100; x += 380) {
      if (x < cx - 100 || x > cx + W + 100) continue;
      // (art pass, 2nd look) a coal heap of faceted lumps with glints; a stone arch; a crypt niche with old scrolls
      if (k === 0) RICH.pic('wizglcoal', 110, 52, c => {
        c.fillStyle = C2.coal; c.beginPath(); c.moveTo(0, 52); c.lineTo(50, 2); c.lineTo(110, 52); c.closePath(); c.fill();
        for (let q = 0; q < 46; q++) { const u = RICH.r(71, q), v = RICH.r(72, q), px = 10 + u * 90, top = 52 - 50 * (1 - Math.abs(px - 50) / (px < 50 ? 50 : 60)), py = top + 4 + v * (52 - top - 4), r = 3 + RICH.r(73, q) * 4;
          c.fillStyle = RICH.r(74, q) < 0.5 ? '#2a2434' : '#16121e'; c.beginPath(); c.moveTo(px - r, py); c.lineTo(px - r * 0.3, py - r * 0.8); c.lineTo(px + r, py - r * 0.3); c.lineTo(px + r * 0.6, py + r * 0.6); c.closePath(); c.fill();
          c.fillStyle = 'rgba(200,190,230,0.3)'; c.fillRect(px - r * 0.3, py - r * 0.6, r * 0.6, 1); }
      }, x - 60, F - 52);
      if (k === 1) { ctx.strokeStyle = '#3a3048'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(x, F - 10, 40, Math.PI, 0); ctx.stroke(); ctx.strokeStyle = '#5a4e6e'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, F - 10, 42, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke(); ctx.strokeStyle = '#2a2238'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let n = 1; n < 6; n++) { const a = Math.PI + n * Math.PI / 6; ctx.moveTo(x + Math.cos(a) * 37, F - 10 + Math.sin(a) * 37); ctx.lineTo(x + Math.cos(a) * 43, F - 10 + Math.sin(a) * 43); } ctx.stroke(); }
      if (k === 2) RICH.pic('wizglniche', 64, 94, c => {
        c.fillStyle = '#4a4060'; RICH.rr(c, 0, 0, 64, 94, 30); c.fill(); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(0, 30, 3, 60);
        c.fillStyle = '#1e1828'; RICH.rr(c, 4, 4, 56, 86, 26); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(4, 4, 56, 10);
        for (let n = 0; n < 4; n++) { const sx = 14 + n * 9, sy = 52 + (n % 2) * 6; c.fillStyle = '#e8e0c8'; c.fillRect(sx, sy, 7, 30); c.fillStyle = '#b8ac90'; c.fillRect(sx + 5, sy, 2, 30); c.fillStyle = '#c84a4a'; c.fillRect(sx, sy + 12, 7, 2); c.fillStyle = '#f8f4e8'; c.beginPath(); c.ellipse(sx + 3.5, sy, 3.5, 1.6, 0, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#5a4e6e'; c.fillRect(2, 82, 60, 6); c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(2, 82, 60, 1.2);
      }, x - 32, F - 122);
    }
    if (pt.room) {
      const [r0, r1] = pt.room;
      if (r1 > cx - 40 && r0 < cx + W + 40) {
        ctx.fillStyle = 'rgba(255,214,120,0.18)'; ctx.fillRect(r0, 0, r1 - r0, F);
        for (const lx of [r0 + 40, r1 - 40]) { ctx.fillStyle = '#3a3040'; ctx.fillRect(lx - 2, 222, 4, 14); ctx.fillStyle = C2.brass; ctx.fillRect(lx - 8, 200, 16, 22); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(lx - 8, 200, 3, 22); ctx.fillStyle = 'rgba(90,60,10,0.4)'; ctx.fillRect(lx + 4, 200, 4, 22); ctx.fillRect(lx - 8, 210, 16, 1.5); ctx.fillStyle = '#ffcf6a'; circle(lx, 196, 7 + Math.sin(t * 9 + lx) * 1); ctx.fill(); ctx.fillStyle = '#fff4d0'; circle(lx, 197, 3); ctx.fill(); }
      }
    }
  }
  // the floor and pits
  for (const r of ph.solids) {
    if (r.x1 < cx - 40 || r.x0 > cx + W + 40) continue;
    if (r.kind === 'floor') {
      // (art pass, 2nd look) cellar flagstones with a lit worn edge (world-pinned chunks, clipped to the floor)
      const a = Math.max(r.x0, cx - 40), b = Math.min(r.x1, cx + W + 40), hh = Math.min(Math.ceil(r.y1 - r.y0), 160);
      ctx.save(); ctx.beginPath(); ctx.rect(a, r.y0, b - a, r.y1 - r.y0); ctx.clip();
      RICH.strip('wizglfloor|' + hh, a, b, r.y0, hh, 256, (c, gx, w, h) => {
        RICH.flags(c, 0, 5, w, h - 5, { col: C2.floor, mortar: '#241c30', course: 26, len: 56, seed: 62, gx, fade: 0.5 });
        c.fillStyle = C2.floorLt; c.fillRect(0, 0, w, 5); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 0, w, 1.5); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, 5, w, 2);
      });
      if (r.y1 - r.y0 > hh) { ctx.fillStyle = '#241c30'; ctx.fillRect(a, r.y0 + hh, b - a, r.y1 - r.y0 - hh); }
      ctx.restore();
    }
  }
  for (const p of ph.pits) {
    if (p.x1 < cx - 40 || p.x0 > cx + W + 40) continue;
    ctx.fillStyle = '#050308'; ctx.fillRect(p.x0, F, p.x1 - p.x0, H - F);
  }
}
function wizGlowDraw(st) {
  const ph = st.ph, K = WIZGLOW, C2 = WIZGLOW_C, t = G.clock, cx = st.cam.x, F = K.floor;
  ctx.lineJoin = 'round';
  for (const r of ph.solids) {
    if (r.off || r.x1 < cx - 40 || r.x0 > cx + W + 40) continue;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
    // (art pass, 2nd look) a work table: a grained top with nails on two posts; a riveted iron gate with cross bars;
    // a plank bridge (all cached per size)
    if (r.kind === 'ledge') {
      for (const lx of [r.x0 + 6, r.x1 - 11]) RICH.pic('wizglleg|' + Math.round(F - r.y1), 5, F - r.y1, (c, w, h) => { RICH.wood(c, 0, 0, w, h, { col: C2.woodDk, vert: true, bw: 5, seed: 7, edge: false, knots: 0 }); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(w - 1.5, 0, 1.5, h); }, lx, r.y1);
      RICH.pic('wizglledge|' + Math.round(r.x1 - r.x0) + '|' + Math.round(r.y1 - r.y0), r.x1 - r.x0, r.y1 - r.y0, (c, w, h) => { RICH.wood(c, 0, 0, w, h, { col: C2.wood, seam: 60, seed: w, r: 3, lw: 1 }); c.fillStyle = 'rgba(255,226,170,0.35)'; c.fillRect(3, 1, w - 6, 1.5); }, r.x0, r.y0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; rr(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 3); ctx.stroke();
    }
    if (r.kind === 'gate') { const gt = ph.gates.find(g => g.rect === r), up = gt && gt.rising > 0 ? (1 - gt.rising / WIZGLOW.gateRise) * 300 : 0; ctx.save(); ctx.translate(0, -up);
      RICH.pic('wizglgate|' + Math.round(r.x1 - r.x0) + '|' + Math.round(r.y1 - r.y0), r.x1 - r.x0, r.y1 - r.y0, (c, w, h) => {
        RICH.metal(c, 0, 0, w, h, { col: '#3a3448', seed: 9, scratch: true, edge: false });
        for (let y = 10; y < h; y += 22) { c.fillStyle = '#8a8098'; c.fillRect(0, y - 1.5, w, 3); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, y - 1.5, w, 0.8); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y + 1.5, w, 1.5); for (let x = 4; x < w; x += 9) RICH.rivet(c, x, y, 1.1, '#8a8098'); }
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(w - 3, 0, 3, h); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(0, 0, 2, h);
      }, r.x0, r.y0);
      ctx.restore(); }
    if (r.kind === 'bridge') { RICH.pic('wizglbridge|' + Math.round(r.x1 - r.x0) + '|' + Math.round(r.y1 - r.y0), r.x1 - r.x0, r.y1 - r.y0, (c, w, h) => { RICH.wood(c, 0, 0, w, h, { col: C2.wood, vert: true, bw: 14, seed: 8, edge: false }); c.fillStyle = 'rgba(255,226,170,0.35)'; c.fillRect(0, 0, w, 1.5); for (let x = 7; x < w; x += 14) RICH.nail(c, x, h / 2, 1.1); }, r.x0, r.y0); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
  }
  // raised gates (open): just the top bit
  for (const g of ph.gates) if (g.open && g.x > cx - 40 && g.x < cx + W + 40) { ctx.fillStyle = '#3a3448'; ctx.fillRect(g.x, 0, WIZGLOW.gate.w, F - 300); }
  // pits' hanging bridges (up)
  for (const p of ph.pits) if (!p.down && p.x0 > cx - 100 && p.x0 < cx + W + 100) { ctx.strokeStyle = '#6e4622'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x1 + 4, F); ctx.lineTo(p.x1 + 4, F - 100); ctx.stroke(); RICH.pic('wizglupbridge', 8, 100, (c, w, h) => { RICH.wood(c, 0, 0, w, h, { col: C2.wood, vert: true, bw: 8, seed: 5, edge: false }); for (let y = 10; y < h; y += 22) RICH.nail(c, 4, y, 1); }, p.x1, F - 110); }
  for (const lv of ph.levers) if (lv.x > cx - 40 && lv.x < cx + W + 40) wizGlowDrawLever(lv);
  for (const q of ph.posts) if (q.x > cx - 60 && q.x < cx + W + 60) wizGlowDrawPost(q.x, F, q.lit);
  // drips
  for (const d of ph.drips) {
    if (d.x < cx - 40 || d.x > cx + W + 40) continue;
    ctx.fillStyle = '#5a5070'; ctx.fillRect(d.x - 10, 0, 20, 14); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(d.x - 10, 0, 3, 14); ctx.fillStyle = '#3a3448'; ctx.fillRect(d.x - 12, 10, 24, 4); ctx.fillStyle = '#2a2236'; ctx.fillRect(d.x - 3, 14, 6, 3);
    if (d.state === 'warn') { ctx.strokeStyle = 'rgba(190,224,255,0.8)'; ctx.lineWidth = 2; const u = (G.clock * 2) % 1; ctx.beginPath(); ctx.ellipse(d.x, F - 2, 10 + u * 22, 3 + u * 5, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (d.state === 'drop') { ctx.fillStyle = '#bfe0ff'; circle(d.x, 20 + ((ph.t * 1200) % (F - 20)), 4); ctx.fill(); }
  }
  // the big shadow behind the grate at the end
  const ex = K.parts[2].end;
  if (ex > cx - 200 && ex < cx + W + 200) {
    wizDoorArt(ex + 65, F, 70, 110, '#6a5040'); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(ex + 30, F - 110, 70, 110, 30); ctx.stroke();
    ctx.fillStyle = '#0a0610'; ctx.fillRect(ex + 120, F - 170, 120, 120);
    ctx.strokeStyle = '#8a8098'; ctx.lineWidth = 4; for (let x = ex + 128; x < ex + 240; x += 18) { ctx.beginPath(); ctx.moveTo(x, F - 170); ctx.lineTo(x, F - 50); ctx.stroke(); }
  }
}
function wizGlowDrawLever(lv) {
  const x = lv.x, y = lv.y;
  // (art pass, 2nd look) an iron lever box with bolts, a brass handle with a lit edge
  RICH.pic('wizgllever', 20, 8, c => { RICH.metal(c, 0, 0, 20, 8, { col: '#5a5070', r: 2, seed: 4, scratch: false, edge: false }); RICH.rivet(c, 3.5, 4, 1, '#5a5070'); RICH.rivet(c, 16.5, 4, 1, '#5a5070'); c.fillStyle = '#1a1424'; c.fillRect(7, 1, 6, 2); }, x - 10, y - 8);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(x - 10, y - 8, 20, 8, 2); ctx.stroke();
  ctx.strokeStyle = '#6a4e14'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + (lv.pulled ? 14 : -14), y - 28); ctx.stroke();
  ctx.strokeStyle = WIZGLOW_C.brass; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,245,200,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 0.8, y - 7); ctx.lineTo(x + (lv.pulled ? 14 : -14) - 0.8, y - 28); ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.fillStyle = lv.pulled ? '#9fe07f' : '#ff5f6d'; circle(x + (lv.pulled ? 14 : -14), y - 30, 5); ctx.fill(); ctx.stroke();
}
function wizGlowDrawPost(x, F, lit) {
  // (art pass, 2nd look) an iron lamp post with a lit edge and a foot, a brass lantern with glass panes and a cap
  ctx.fillStyle = '#3a3040'; ctx.fillRect(x - 3, F - 70, 6, 70); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 3, F - 70, 1.5, 70); ctx.fillStyle = '#2a2232'; ctx.fillRect(x - 7, F - 6, 14, 6);
  ctx.fillStyle = WIZGLOW_C.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(x - 9, F - 92, 18, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = lit ? 'rgba(255,230,160,0.55)' : 'rgba(40,30,50,0.75)'; ctx.fillRect(x - 6, F - 88, 5, 14); ctx.fillRect(x + 1, F - 88, 5, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 5.5, F - 87, 1, 12);
  ctx.fillStyle = '#8a6420'; ctx.beginPath(); ctx.moveTo(x - 10, F - 92); ctx.lineTo(x, F - 99); ctx.lineTo(x + 10, F - 92); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (lit) { ctx.fillStyle = '#ffcf6a'; circle(x, F - 81, 5 + Math.sin(G.clock * 9 + x) * 0.8); ctx.fill(); ctx.fillStyle = '#fff4d0'; circle(x, F - 81, 2); ctx.fill(); }
}
// the dark: everything outside the light circle (and the lantern rooms) under a near-black layer, with a soft edge
function wizGlowDrawTop(st) {
  const ph = st.ph, K = WIZGLOW, t = G.clock, cx = st.cam.x, F = K.floor;
  if (!ph.solids) return;
  if (!wizGlowCv) { wizGlowCv = document.createElement('canvas'); }
  if (wizGlowCv.width !== W || wizGlowCv.height !== H) { wizGlowCv.width = W; wizGlowCv.height = H; }
  // (between ticks the players are in screen coords: so is the centre; c is the same point in world coords)
  const g = wizGlowCv.getContext('2d'), cs = wizGlowCenter(ph), c = { x: cs.x + st.cam.x, y: cs.y + st.cam.y }, R = wizGlowR(ph), sx = cs.x, sy = cs.y;
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(6,3,14,0.97)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out';
  const gr = g.createRadialGradient(sx, sy, R * 0.55, sx, sy, R * 1.05);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.8, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, R * 1.05, 0, Math.PI * 2); g.fill();
  // (the wand's own glow around whoever holds it, even raised)
  { const lt = G.players[ph.light], lx = lt.x + lt.w / 2, ly = lt.y + lt.h / 2, gl = g.createRadialGradient(lx, ly, 10, lx, ly, 40); gl.addColorStop(0, 'rgba(0,0,0,0.9)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, 40, 0, Math.PI * 2); g.fill(); }
  for (const pt of K.parts) if (pt.room) { const r0 = pt.room[0] - st.cam.x, r1 = pt.room[1] - st.cam.x; if (r1 > 0 && r0 < W) { g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillRect(r0, 0, r1 - r0, H); } }
  // the lit lantern posts glow a little
  for (const q of ph.posts) if (q.lit) { const qx = q.x - st.cam.x; if (qx > -60 && qx < W + 60) { const gp = g.createRadialGradient(qx, F - 81, 4, qx, F - 81, 46); gp.addColorStop(0, 'rgba(0,0,0,0.8)'); gp.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gp; g.beginPath(); g.arc(qx, F - 81, 46, 0, Math.PI * 2); g.fill(); } }
  g.globalCompositeOperation = 'source-over';
  // (draw it in screen coords: we are in world coords here)
  ctx.save(); ctx.translate(st.cam.x, st.cam.y); ctx.drawImage(wizGlowCv, 0, 0, W, H); ctx.restore();
  // warm tint in the light
  ctx.save(); ctx.globalAlpha = ph.flashT > 0 ? 0.25 : 0.1; ctx.fillStyle = '#ffe9a0'; circle(c.x, c.y, R * 0.9); ctx.fill(); ctx.restore();
  // what shows in the dark: the finder's faint outline, lever glints, shadows' eyes, moths
  const fd = G.players[ph.find];
  if (!ph.findLit) { ctx.save(); ctx.strokeStyle = 'rgba(200,190,255,0.35)'; ctx.lineWidth = 2; rr(fd.x + st.cam.x, fd.y + st.cam.y, fd.w, fd.h, 6); ctx.stroke(); ctx.restore(); }
  for (const lv of ph.levers) if (!lv.pulled && lv.x > cx - 20 && lv.x < cx + W + 20) { ctx.fillStyle = 'rgba(255,220,120,' + (0.4 + 0.3 * Math.sin(t * 5 + lv.x)) + ')'; circle(lv.x - 14, lv.y - 30, 2.5); ctx.fill(); }
  for (const s of ph.shadows) {
    const a = s.dead ? Math.max(0, s.dead / 0.4) : 1, blink = Math.sin(t * 3 + s.eye) > 0.96;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(14,8,26,0.92)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, K.shadow.size + Math.sin(t * 8 + s.eye) * 2, 12, 0, 0, Math.PI * 2); ctx.fill();
    for (let n = -1; n <= 1; n += 2) { ctx.beginPath(); ctx.moveTo(s.x + n * 10, s.y + 6); ctx.lineTo(s.x + n * 16 + Math.sin(t * 10 + n) * 3, s.y + 12); ctx.lineTo(s.x + n * 4, s.y + 10); ctx.fill(); }
    if (!blink) { ctx.fillStyle = '#ffffff'; const d = Math.sign(s.vx || 1) * 2; circle(s.x - 5 + d, s.y - 3, 3); ctx.fill(); circle(s.x + 5 + d, s.y - 3, 3); ctx.fill(); }
    ctx.restore();
  }
  for (const m of ph.moths) { ctx.fillStyle = '#fff3c4'; const f = Math.sin(t * 30) * 4; ctx.beginPath(); ctx.ellipse(m.x - 4, m.y, 5, 3 + f * 0.5, -0.5, 0, Math.PI * 2); ctx.ellipse(m.x + 4, m.y, 5, 3 - f * 0.5, 0.5, 0, Math.PI * 2); ctx.fill(); }
  // the big eyes behind the grate at the end
  const ex = K.parts[2].end + 180;
  if (ex > cx - 100 && ex < cx + W + 100) {
    const near = Math.max(...G.players.map(p => p.x)) > K.parts[2].end - 400;
    if (near) { ctx.fillStyle = '#ffffff'; const lk = Math.sin(t * 0.7) * 4; ctx.beginPath(); ctx.ellipse(ex - 22 + lk, F - 120, 12, 7, 0, 0, Math.PI * 2); ctx.ellipse(ex + 22 + lk, F - 120, 12, 7, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}
function wizGlowHud(st) {
  const ph = st.ph, big = wizBig(), z = big ? 1.4 : 1;
  // the flash charge over the LIGHT
  const lt = G.players[ph.light], x = lt.x + lt.w / 2, y = lt.y - 44 * z, w = 40 * z, h = 7 * z;
  const k = ph.flashCool > 0 ? 1 - ph.flashCool / (WIZGLOW.flash.rest + WIZGLOW.flash.t) : 1;
  ctx.fillStyle = 'rgba(30,20,66,0.85)'; rr(x - w / 2 - 3, y - 3, w + 6, h + 6, 5); ctx.fill();
  ctx.fillStyle = k >= 1 ? WIZ_SPELLS.glow.col : 'rgba(255,224,102,0.45)'; rr(x - w / 2, y, w * k, h, 3); ctx.fill();
  // grabs so far on each player (three is lights out)
  for (const p of G.players) {
    const n = ph.grabs[p.id].filter(t0 => ph.t - t0 < WIZGLOW.grab.win).length;
    if (!n) continue;
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < n ? '#c9b8ff' : 'rgba(255,255,255,0.25)'; circle(p.x + p.w / 2 - 10 + i * 10, p.y + p.h + 10, 3.5); ctx.fill(); }
  }
  if (ph.gold > 0) { ctx.save(); ctx.globalAlpha = 0.9; text('Gold candle ' + Math.ceil(ph.gold) + 's', W / 2, H - 22, 14 * z, C.gold, 'center', 'body'); ctx.restore(); }
}

WIZ_PHASES.glow = {
  setup(st, L) { wizGlowSetup(st, L); },
  step(st, dt) { wizGlowStep(st, dt); },
  coast(st, dt) { wizGlowCoast(st, dt); },
  plan(st) { return wizGlowPlan(st); },
  // the LIGHT holding the wand up or down is working
  present(st, p) { return p.id === st.ph.light && (!!p.input.down || wizUp(p)); },
  labels(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.light ? 'flash' : 'pull')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.light ? 'Light!' : 'Find!')); },
  jobKeys(st) { return st.ph.light === 1 ? ['finder', 'light'] : ['light', 'finder']; },
  legend(st) {
    const ph = st.ph, l = k => (k ? '<kbd>↑</kbd> raise <kbd>↓</kbd> lower the light' : '<kbd>W</kbd> raise <kbd>S</kbd> lower the light');
    return { pip: ph.light === 0 ? l(0) : 'stay in the light', bo: ph.light === 1 ? l(1) : 'stay in the light', pad: 'light: stick up raises, down lowers,' };
  },
  hudText(st) { const ph = st.ph; return 'Levers ' + ph.levers.filter(l => l.pulled).length + '/' + ph.levers.length + '   Part ' + (ph.part + 1) + ' of 3'; },
  progress(st) { const ph = st.ph; return { n: ph.part + (ph.done ? 1 : 0), of: 3 }; },
  drawBack(st) { wizGlowDrawBack(st); },
  draw(st) { wizGlowDraw(st); },
  drawTop(st) { wizGlowDrawTop(st); },
  hud(st) { wizGlowHud(st); },
  statLine(st) { const s = st.stats.glow; return s && s.puffed >= 12 ? 'Flashed away ' + s.puffed + ' ink shadows' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizGlowLever = function () { this.tone(220, 0.08, 'square', 0.04, 160); this.tone(660, 0.06, 'triangle', 0.03, null, 0.06); };
Sfx.extra.wizGlowGate = function () { this.tone(120, 0.4, 'sawtooth', 0.025, 260); };
Sfx.extra.wizGlowPlink = function () { this.tone(1600, 0.05, 'sine', 0.03, 1200); };
Sfx.extra.wizGlowFizz = function () { this.tone(3000, 0.25, 'sawtooth', 0.01, 1500); };
Sfx.extra.wizGlowGrab = function () { this.tone(140, 0.25, 'sine', 0.05, 90); this.tone(70, 0.3, 'triangle', 0.03); };
Sfx.extra.wizGlowMoth = function () { for (let k = 0; k < 4; k++) this.tone(1800 + k * 120, 0.03, 'triangle', 0.01, null, k * 0.05); };
Sfx.extra.wizGlowRoom = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.035, null, i * 0.08)); };

/* ---------- the room ---------- */
wizRoom('glow', {
  jobs: {
    light: { title: 'Light', act: 'flash', legend: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> raise the light <kbd>S</kbd> lower it',
      howTo: ['Flash puffs away the ink shadows.'] },
    finder: { title: 'Finder', act: 'pull', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
      howTo: ['You can only jump in the light. Pull levers to open the way.'] },
  },
  act: { label: 'flash', labels: ['flash', 'pull'] },
  tip: 'One holds the light (up raises it, the action flashes shadows away); the other can only jump in the light!',
  legend: { pip: '<kbd>W</kbd> raise <kbd>S</kbd> lower the light', bo: 'stay in the light', pad: 'light: stick up raises, down lowers,' },
  map: WIZ_EMPTY_MAP,
});
