/* Pip & Bo - Level 35-1 Moonwick Academy: class 5 'morph' (Shape Shifting, spell Morph). */
'use strict';

/* ===== 35-1 class 5: Shape Shifting (WIZ_PHASES.morph) ===========================================================
   The obstacle garden, scrolling right. One wizard turns the other into the right animal for each obstacle. The wrong
   animal is the joke.

   THE TWO JOBS (room field `first` is the first CASTER; they swap at the round plain pads after gardens 1 and 2)
   - CASTER (walks the stone walkway along the top of the garden wall, action word "morph"): UP / DOWN turn the wand's
     dial between three shapes shown in a bubble over the wand: FROG, FISH, BAT. The action casts it on the partner
     (within WIZMORPH.range px; a pink puff). A shape lasts until the next cast or the plain pad at the obstacle's end.
     A wooden gate on the walkway (and a fence in the garden) at each obstacle's end only opens when the SHIFTER pulls its rope.
   - SHIFTER (in the garden, action word by shape): plain: run, jump, and pull ropes. FROG: a tiny walk, but a jump
     goes very high and far (steer it in the air). FISH: flops helplessly on land, but swims freely in water (up / down
     / left / right) and leaps out at the bank. BAT: can't walk; each action (or jump) is a flap, it glides between
     flaps and fits through small holes in walls, but flies low (WIZMORPH.bat.ceil over where it took off) and never
     over water. Reaching the plain pad turns them plain again; the rope beside it opens
     the CASTER's gate. So the SHIFTER can't change shape alone and the CASTER can't open a gate alone.

   OBSTACLES (12, in 3 gardens of 4; each ends at a plain pad with its rope):
     hedge     a hedge wall too tall to jump: FROG
     moat      water too wide to jump: FISH (frogs and wizards sink politely and pop back)
     belfry    a wall with a small hole: BAT
     pondbank  a pond with a high bank at its end: FISH, then FROG while still in the water (a "Now!" ring)
     tower     a stone block to leap onto, then a high hole in the wall beyond: FROG, then BAT on top (a "Now!" ring)
   Wrong shape, soft and funny: a sinking wizard ("Glub!") or frog pops back to the obstacle's start; three wrong tries
   at one obstacle are an Oops. GOLD HELP after WIZ.goldAfter Oops in one garden: the right shape blinks gold on the
   CASTER's dial (announced). Safe spots: every obstacle's start.
   Stats (st.stats.morph): casts, wrong, ropes.   Names: wizMorph* / WIZMORPH*. */
const WIZMORPH = {
  floor: 430, walk: 170, under: 186,      // the garden floor; the walkway's top and underside
  seg: 460, start: 300, gardenGap: 200,
  range: 420,
  shapes: ['frog', 'fish', 'bat'],
  box: { plain: [22, 26], frog: [22, 18], fish: [26, 14], bat: [16, 14] },
  frog: { walk: 80, jumpV: 930, air: 240, airAcc: 900, float: 1.4 },
  fish: { swim: 200, acc: 900, flop: 70, flopV: 260, flopT: 0.5, leap: 560, dash: 420 },
  bat: { g: 900, flap: 260, fly: 130, acc: 700, fall: 170, ceil: 70 },
  pool: 120,
  gardens: [['hedge', 'moat', 'belfry', 'hedge'], ['moat', 'belfry', 'pondbank', 'tower'], ['pondbank', 'tower', 'belfry', 'pondbank']],
  wrongN: 3,
};
const WIZMORPH_NEWS = ['Garden 1: one animal per obstacle. Hedge, moat, belfry, hedge!', 'Garden 2: now some need TWO shapes. Watch for the "Now!" ring!', 'Garden 3: the trickiest garden. Ponds, towers, and the belfry.'];
const WIZMORPH_C = { grass: '#5fae6a', grassDk: '#3f7f4a', hedge: '#3f8a4a', hedgeDk: '#2a5e33', water: 'rgba(80,150,220,0.55)', waterTop: '#9fd4ff', stone: '#8e88b0', stoneDk: '#5e5878', wood: '#9a6a3e', woodDk: '#62401f', rope: '#e8d8b0' };
const wizMorphSegX = k => WIZMORPH.start + k * WIZMORPH.seg + Math.floor(k / 4) * WIZMORPH.gardenGap;

function wizMorphSetup(st, L) {
  const ph = st.ph, K = WIZMORPH, F = K.floor;
  ph.cast = L.def.first || 0; ph.shift = 1 - ph.cast;
  ph.t = 0; ph.ob = 0; ph.dial = 0; ph.shape = 'plain'; ph.float = 0; ph.flopT = 0; ph.dashT = 0; ph.sink = 0; ph.morphT = 0; ph.gold = false; ph.done = false; ph.swapT = 0;
  ph.wrong = []; ph.obs = []; ph.shSolids = []; ph.caSolids = []; ph.pools = [];
  const S = ph.shSolids, C2 = ph.caSolids;
  const end = wizMorphSegX(12) + 200;
  ph.end = end;
  // the walkway (the CASTER's lane; the SHIFTER's ceiling)
  C2.push({ x0: -40, y0: -400, x1: 0, y1: 800, kind: 'wall' }, { x0: 0, y0: K.walk, x1: end + 200, y1: K.under, kind: 'walk' }, { x0: end + 160, y0: -400, x1: end + 200, y1: 800, kind: 'wall' });
  S.push({ x0: -40, y0: -400, x1: 0, y1: 800, kind: 'wall' }, { x0: 0, y0: K.walk, x1: end + 200, y1: K.under, kind: 'walk' }, { x0: end + 160, y0: -400, x1: end + 200, y1: 800, kind: 'wall' });
  // the garden floor, with pools cut out
  const cuts = [];
  for (let k = 0; k < 12; k++) {
    const kind = K.gardens[Math.floor(k / 4)][k % 4], sx = wizMorphSegX(k);
    const o = { k, kind, sx, x1: sx + K.seg, garden: Math.floor(k / 4), pad: { x0: sx + 370, x1: sx + 430, y: F }, rope: sx + 436, done: false };
    o.gate = { x0: sx + K.seg - 14, y0: 40, x1: sx + K.seg + 2, y1: K.walk, kind: 'gate', ob: k };
    C2.push(o.gate);
    // (and the garden's own gate, so a wizard can't wander into the next obstacle before the rope is pulled)
    o.fence = { x0: sx + K.seg - 6, y0: K.under, x1: sx + K.seg + 2, y1: F, kind: 'fence', ob: k }; S.push(o.fence);
    switch (kind) {
      case 'hedge': S.push({ x0: sx + 190, y0: F - 130, x1: sx + 232, y1: F, kind: 'hedge' }); o.exit = sx + 240; break;
      case 'moat': o.pool = { x0: sx + 70, x1: sx + 360 }; o.exit = sx + 360; break;
      case 'belfry':
        S.push({ x0: sx + 200, y0: K.under, x1: sx + 236, y1: F - 60, kind: 'belfry' }, { x0: sx + 200, y0: F - 36, x1: sx + 236, y1: F, kind: 'belfry' });
        S.push({ x0: sx + 200, y0: F - 60, x1: sx + 236, y1: F - 36, kind: 'plug', bat: true });
        o.hole = { x: sx + 218, y: F - 48, bot: F - 39 }; o.exit = sx + 240; break;
      case 'pondbank':
        o.pool = { x0: sx + 40, x1: sx + 260 }; S.push({ x0: sx + 260, y0: F - 130, x1: sx + K.seg - 6, y1: F, kind: 'bank' });
        o.pad.y = F - 130; o.ring = { x: sx + 232, y: F - 8 }; o.exit = sx + 270; break;
      case 'tower':
        S.push({ x0: sx + 110, y0: F - 130, x1: sx + 262, y1: F, kind: 'block' });
        S.push({ x0: sx + 262, y0: K.under, x1: sx + 292, y1: F - 170, kind: 'belfry' }, { x0: sx + 262, y0: F - 146, x1: sx + 292, y1: F, kind: 'belfry' });
        S.push({ x0: sx + 262, y0: F - 170, x1: sx + 292, y1: F - 146, kind: 'plug', bat: true });
        o.hole = { x: sx + 277, y: F - 158, bot: F - 149 }; o.ring = { x: sx + 180, y: F - 130 }; o.block = { x0: sx + 110, x1: sx + 262 }; o.exit = sx + 296; break;
    }
    if (o.pool) { cuts.push(o.pool); ph.pools.push(o.pool); S.push({ x0: o.pool.x0, y0: F + K.pool, x1: o.pool.x1, y1: F + K.pool + 40, kind: 'poolbed' }); }
    ph.obs.push(o); ph.wrong.push(0);
  }
  cuts.sort((a, b) => a.x0 - b.x0);
  let fx = 0;
  for (const c of cuts) { S.push({ x0: fx, y0: F, x1: c.x0, y1: F + 300, kind: 'floor' }); fx = c.x1; }
  S.push({ x0: fx, y0: F, x1: end + 200, y1: F + 300, kind: 'floor' });
  const ps = G.players, ca = ps[ph.cast], sh = ps[ph.shift];
  Object.assign(ca, { x: 140 - ca.w / 2, y: K.walk - ca.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true });
  Object.assign(sh, { x: 180 - sh.w / 2, y: F - sh.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true });
  st.cam = { x: 0, y: 0 };
  const s = wizStats(st); Object.assign(s, { casts: s.casts || 0, wrong: s.wrong || 0, ropes: s.ropes || 0 });
  Object.assign(st.hm, { x: 760, y: 110, s: 0.75, face: -1, pose: 'talk' });
  wizSay(st, 'Shape Shifting! Turn your partner into the right animal.', 3);
  wizNews(st, WIZMORPH_NEWS[0]);
}
const wizMorphOb = ph => ph.obs[Math.min(ph.ob, 11)];
function wizMorphInPool(ph, x, y) { return ph.pools.find(pl => x > pl.x0 && x < pl.x1 && y > WIZMORPH.floor - 4) || null; }
// the shape the SHIFTER needs right now (and whether a "Now!" moment is on)
function wizMorphNeed(ph) {
  const o = wizMorphOb(ph), p = G.players[ph.shift], cx = p.x + p.w / 2, feet = p.y + p.h, F = WIZMORPH.floor;
  if (!o || o.done) return 'plain';
  if (cx > o.exit + 10 && !(o.kind === 'tower' && feet < F - 60 && ph.shape === 'bat')) return ph.shape === 'bat' && feet < F - 30 && cx < o.pad.x0 ? 'bat' : 'plain';
  switch (o.kind) {
    case 'hedge': return 'frog';
    case 'moat': return 'fish';
    case 'belfry': return 'bat';
    case 'pondbank': return ph.shape === 'fish' && wizMorphInPool(ph, cx, feet) && cx > o.ring.x - 50 ? 'frog' : ph.shape === 'frog' && cx > o.pool.x1 - 70 ? 'frog' : 'fish';
    case 'tower': return (feet <= F - 126 && cx > o.block.x0 && cx < o.block.x1 + 30) || (ph.shape === 'bat' && cx > o.block.x0) ? 'bat' : 'frog';
  }
  return 'plain';
}
function wizMorphPlan(st) {
  const ph = st.ph, K = WIZMORPH, out = [null, null], ps = G.players, ca = ps[ph.cast], sh = ps[ph.shift];
  const o = wizMorphOb(ph), need = wizMorphNeed(ph), scx = sh.x + sh.w / 2, ccx = ca.x + ca.w / 2;
  const dist = Math.hypot(scx - ccx, sh.y - ca.y);
  // the CASTER: dial to the needed shape, cast when it differs (in range); walk along above the SHIFTER
  let hold = null, tap = null, why = 'follow';
  if (need !== 'plain' && need !== ph.shape) {
    const want = K.shapes.indexOf(need), d = (want - ph.dial + 3) % 3;
    if (d === 1) { tap = 'up'; why = 'dial'; } else if (d === 2) { tap = 'down'; why = 'dial'; }
    else if (dist < K.range - 20 && ph.morphT <= 0) { tap = 'act'; why = 'cast'; }
    else why = 'closer';
  }
  const gx = o && !o.done ? o.gate.x0 - 16 : ph.end;
  out[ph.cast] = { why, tap, hold, need, x: Math.min(scx - 10, gx) };
  // the SHIFTER: through the obstacle in the right shape, then to the pad and the rope
  if (!o || o.done) out[ph.shift] = { why: 'walk', x: ph.end - 40 };
  else if (need !== ph.shape && need !== 'plain') out[ph.shift] = { why: 'wait', need, x: scx };
  else if (scx < o.exit + 10) out[ph.shift] = { why: 'through', need, x: o.exit + 30, ob: o };
  else out[ph.shift] = { why: 'rope', x: ph.shape === 'plain' ? o.rope - 8 : (o.pad.x0 + o.pad.x1) / 2, ob: o, tap: Math.abs(scx - o.rope) < 26 && ph.shape === 'plain' && sh.grounded ? 'act' : null };
  return out;
}
function wizMorphCast(st) {
  const ph = st.ph, K = WIZMORPH, ps = G.players, ca = ps[ph.cast], sh = ps[ph.shift];
  const d = Math.hypot(sh.x - ca.x, sh.y - ca.y);
  if (d > K.range) { wizPop(st, ca.x + ca.w / 2, ca.y - 30, 'Too far!', '#ffffff', 14); return; }
  const shape = K.shapes[ph.dial];
  wizMorphSet(st, shape);
  wizStats(st).casts++; ph.morphT = 0.25; Sfx.play('wizSpell_morph');
  wizSpellRing(sh.x + sh.w / 2, sh.y + sh.h / 2, 26, 'morph', G.clock, 1); wizSparks(sh.x + sh.w / 2, sh.y + sh.h / 2, 'morph', 12);
  puff(sh.x + sh.w / 2, sh.y + sh.h / 2, 8, 'rgba(255,143,208,0.8)');
}
function wizMorphSet(st, shape) {
  const ph = st.ph, sh = G.players[ph.shift];
  if (shape === ph.shape) return;
  const inPool = wizMorphInPool(ph, sh.x + sh.w / 2, sh.y + sh.h);
  ph.shape = shape; ph.sink = 0; ph.batY = null; ph.float = shape === 'frog' && inPool ? WIZMORPH.frog.float : 0;
  if (shape === 'plain') { ph.float = 0; Sfx.play('wizMorphPlain'); }
}
function wizMorphWrong(st, word) {
  const ph = st.ph, o = wizMorphOb(ph), sh = G.players[ph.shift];
  ph.wrong[ph.ob]++; wizStats(st).wrong++;
  const back = { x: o.sx + 24, y: WIZMORPH.floor };
  if (ph.wrong[ph.ob] >= WIZMORPH.wrongN) {
    ph.wrong[ph.ob] = 0;
    wizOops(st, sh, { word: word + ' Oops!', kind: 'shape', to: back });
    const n = wizMiss(st, 'g' + o.garden);
    wizReact(st, 'calm', ['Well. That was an animal. Not the right one.', 'Frogs don\'t swim that way, dear.', 'Try reading the obstacle first.'][n % 3], 2.4);
    if (n >= WIZ.goldAfter && wizGoldOnce(st, 'dial' + o.garden, 'Gold dial! The right shape blinks gold on the caster\'s wand.')) ph.gold = true;
  } else {
    wizPop(st, sh.x + sh.w / 2, sh.y - 20, word, '#bfe0ff', 18);
    Object.assign(sh, { x: back.x - sh.w / 2, y: back.y - sh.h - 2, vx: 0, vy: -200, grounded: false });
  }
  st.cam.x = Math.min(st.cam.x, back.x - 160);   // (the camera follows the pop back)
  ph.sink = 0; ph.float = 0; Sfx.play('wizMorphGlub');
}
// the SHIFTER's body in its shape's box (the box is set only for the move, so the player keeps its normal size)
function wizMorphBody(st, p, dt) {
  const ph = st.ph, K = WIZMORPH, F = K.floor, [bw, bh] = K.box[ph.shape];
  const w0 = p.w, h0 = p.h, dx = (w0 - bw) / 2, dy = h0 - bh;
  p.x += dx; p.y += dy; p.w = bw; p.h = bh;
  const sol = ph.shSolids.filter(r => !(r.bat && ph.shape === 'bat'));
  try { wizBody(p, dt, sol, { ctl: (q, d) => wizMorphCtl(st, q, d) }); } finally { p.x -= dx; p.y -= dy; p.w = w0; p.h = h0; }
  wizMorphClamp(st, p);
  void F;
}
// the screen's edges: nobody walks out of view
function wizMorphClamp(st, p) {
  if (p.x < st.cam.x) { p.x = st.cam.x; p.vx = Math.max(0, p.vx); } else if (p.x > st.cam.x + W - p.w) { p.x = st.cam.x + W - p.w; p.vx = Math.min(0, p.vx); }
}
function wizMorphCtl(st, p, dt) {
  const ph = st.ph, K = WIZMORPH, F = K.floor, i = p.input, dir = (i.right ? 1 : 0) - (i.left ? 1 : 0), up = wizUp(p);
  const water = wizMorphInPool(ph, p.x + p.w / 2, p.y + p.h - 2);
  const jumpP = p.pendingJump; p.pendingJump = false;
  if (dir) p.face = dir;
  const toward = (v, want, acc) => v + clamp(want - v, -acc * dt, acc * dt);
  switch (ph.shape) {
    case 'plain': p.pendingJump = jumpP; control(p, dt); break;
    case 'frog': {
      const fr = K.frog;
      if (water && ph.float > 0) {
        // (turned into a frog in the water: floating, about to leap out)
        p.vy = 0; p.y = Math.min(p.y, F - p.h + 4); p.vx = toward(p.vx, dir * 60, 900);
        if (jumpP || up) { p.vy = -fr.jumpV; p.vx = (dir || p.face) * fr.air; ph.float = 0; Sfx.play('wizMorphBoing'); }
        break;
      }
      if (p.grounded) {
        p.vx = toward(p.vx, dir * fr.walk, 1600);
        if (jumpP) { p.vy = -fr.jumpV; p.vx = (dir || 0) * fr.air; p.grounded = false; Sfx.play('wizMorphBoing'); }
      } else { p.vx = toward(p.vx, dir * fr.air, fr.airAcc); }
      p.vy = Math.min(PHYS.maxFall, p.vy + PHYS.g * dt);
      break;
    }
    case 'fish': {
      const fi = K.fish;
      ph.dashT = Math.max(0, ph.dashT - dt);
      if (water) {
        const vy = (up ? -1 : 0) + (i.down ? 1 : 0);
        p.vx = ph.dashT > 0 ? p.face * fi.dash : toward(p.vx, dir * fi.swim, fi.acc);
        p.vy = toward(p.vy, vy * fi.swim, fi.acc);
        // at the surface: a leap out
        if (up && p.y + p.h < F + 14) { p.vy = -fi.leap; Sfx.play('wizMorphSplash'); }
        if (p.y < F - p.h - 2 && p.vy < 0 && !up) p.vy = 40;
      } else {
        // on land: flop flop
        ph.flopT = Math.max(0, ph.flopT - dt);
        if (p.grounded) { p.vx = toward(p.vx, 0, 900); if (dir && ph.flopT <= 0) { p.vy = -fi.flopV; p.vx = dir * fi.flop; ph.flopT = fi.flopT; Sfx.play('wizMorphFlop'); } }
        p.vy = Math.min(PHYS.maxFall, p.vy + PHYS.g * dt);
      }
      break;
    }
    case 'bat': {
      const bt = K.bat;
      // (a bat flies low: no higher than WIZMORPH.bat.ceil over the ground it took off from)
      if (p.grounded && p.ground) ph.batY = p.ground.y0;
      const top = (ph.batY != null ? ph.batY : F) - bt.ceil;
      if (jumpP) { if (p.y + p.h > top + 10) { p.vy = -bt.flap; Sfx.play('wizMorphFlap'); } else wizPop(st, p.x + p.w / 2, p.y - 14, 'Too high for a bat!', '#d8c8ff', 12); }
      if (p.y + p.h < top && p.vy < 0) p.vy = 0;
      p.vx = p.grounded && !jumpP ? toward(p.vx, 0, 1200) : toward(p.vx, dir * bt.fly, bt.acc);
      p.vy = Math.min(bt.fall, p.vy + bt.g * dt);
      break;
    }
  }
}
function wizMorphStep(st, dt) {
  const ph = st.ph, K = WIZMORPH, F = K.floor, ps = G.players, ca = ps[ph.cast], sh = ps[ph.shift];
  ph.t += dt;
  if (st.idle) { wizMorphCoast(st, dt); return; }
  ph.morphT = Math.max(0, ph.morphT - dt); ph.float = Math.max(0, ph.float - dt);
  if (ph.swapT > 0) {
    ph.swapT -= dt;
    for (const p of ps) { p.vx = 0; p.vy = 0; p.pendingAct = false; p.pendingJump = false; }
    if (ph.swapT <= 0) wizMorphDoSwap(st);
    wizMorphCam(st, dt); return;
  }
  // --- the CASTER: the dial (up / down presses), the cast, walking the walkway ---
  const upNow = wizUp(ca), dnNow = !!ca.input.down;
  if (upNow && !ph.upWas) { ph.dial = (ph.dial + 1) % 3; Sfx.play('wizMorphDial'); }
  if (dnNow && !ph.dnWas) { ph.dial = (ph.dial + 2) % 3; Sfx.play('wizMorphDial'); }
  ph.upWas = upNow; ph.dnWas = dnNow;
  const castP = ca.pendingAct; ca.pendingAct = false; ca.pendingJump = false;
  if (castP) wizMorphCast(st);
  wizBody(ca, dt, ph.caSolids, { ctl: (p, d) => { const real = p.input; p.input = Object.assign({}, real, { jump: false, up: false, down: false }); p.pendingJump = false; try { control(p, d); } finally { p.input = real; } } });
  wizMorphClamp(st, ca);
  // --- the SHIFTER ---
  if (ph.shape === 'fish' && sh.pendingAct) { ph.dashT = 0.25; Sfx.play('wizMorphSplash'); }
  if (ph.shape === 'bat' && sh.pendingAct) sh.pendingJump = true;   // (a flap)
  const ropeP = sh.pendingAct && ph.shape === 'plain'; sh.pendingAct = false;
  wizMorphBody(st, sh, dt);
  // the water: a fish swims; anyone else sinks ("Glub!"), unless a frog just turned in it is about to leap
  const cx = sh.x + sh.w / 2, feet = sh.y + sh.h, pool = wizMorphInPool(ph, cx, feet - 2) || (ph.shape === 'bat' && ph.pools.find(pl => cx > pl.x0 && cx < pl.x1 && feet > F - 90));
  if (pool && ph.shape !== 'fish' && !(ph.shape === 'frog' && ph.float > 0)) {
    ph.sink += dt;
    if (ph.sink > 0.15 && !ph.splashed) { ph.splashed = true; Sfx.play('wizMorphSplash'); }
    if (ph.sink > 0.7) { ph.splashed = false; wizMorphWrong(st, ph.shape === 'frog' ? 'Glub! Frogs sink.' : ph.shape === 'bat' ? 'Splash! Bats can\'t fly over water.' : 'Glub!'); }
  } else { ph.sink = 0; ph.splashed = false; }
  if (feet > F + K.pool + 30) wizMorphWrong(st, 'Glub!');
  // the plain pad, the rope
  const o = wizMorphOb(ph);
  if (o && !o.done) {
    if (sh.grounded && cx > o.pad.x0 && cx < o.pad.x1 && Math.abs(feet - o.pad.y) < 4 && ph.shape !== 'plain') { wizMorphSet(st, 'plain'); wizPop(st, cx, sh.y - 24, 'Plain again!', '#ffffff', 14); }
    if (ropeP && Math.abs(cx - o.rope) < 30 && Math.abs(feet - o.pad.y) < 40) {
      o.done = true; o.gate.off = true; o.fence.off = true; wizStats(st).ropes++; Sfx.play('wizMorphRope');
      wizPop(st, o.rope, o.pad.y - 50, 'Gate open!', '#ffd23f', 16);
      ph.ob++;
      if (ph.ob >= 12) { ph.done = true; wizPhaseDone(st, { say: 'A frog, a fish and a bat. And back again! Morph is yours!' }); }
      else if (ph.ob % 4 === 0) { ph.swapT = 1.2; ph.garden = ph.ob / 4; wizSay(st, 'Swap! The caster takes the garden now.', 2.4); Sfx.play('wizMorphPoof'); }
    }
  }
  // a shape that has no business on a pad... and the plain shifter's own jump comes from control()
  wizMorphCam(st, dt);
  wizMorphHints(st);
}
function wizMorphDoSwap(st) {
  const ph = st.ph, K = WIZMORPH, ps = G.players;
  [ph.cast, ph.shift] = [ph.shift, ph.cast];
  ph.shape = 'plain'; ph.dial = 0; ph.float = 0;
  const x = wizMorphSegX(ph.ob) - 60, ca = ps[ph.cast], sh = ps[ph.shift];
  Object.assign(ca, { x: x - 30 - ca.w / 2, y: K.walk - ca.h, vx: 0, vy: 0, grounded: true, face: 1 });
  Object.assign(sh, { x: x - sh.w / 2, y: K.floor - sh.h, vx: 0, vy: 0, grounded: true, face: 1 });
  for (const p of ps) puff(p.x + p.w / 2, p.y + p.h / 2, 8, 'rgba(255,143,208,0.8)');
  wizSwap(st); wizNews(st, WIZMORPH_NEWS[Math.floor(ph.ob / 4)]);
}
function wizMorphHints(st) {
  const ph = st.ph, P = wizMorphPlan(st);
  const c = P[ph.cast], s = P[ph.shift];
  if (!st.hints[ph.cast] && c.need !== 'plain' && c.need !== ph.shape) {
    if (c.why === 'dial') wizHint(st, ph.cast, 'Turn the dial to ' + c.need.toUpperCase() + ': ' + wizKey(ph.cast, 'up') + ' / ' + wizKey(ph.cast, 'down'), { cpu: c.need[0].toUpperCase() + c.need.slice(1) + ', coming up!' });
    else if (c.why === 'cast') wizHint(st, ph.cast, 'Cast it! ' + wizKey(ph.cast, 'act'), { cpu: 'Morph!', life: 1.4 });
  }
  if (!st.hints[ph.shift] && s.tap === 'act') wizHint(st, ph.shift, 'Pull the rope! ' + wizKey(ph.shift, 'act'), { cpu: 'Pulling the rope!', life: 1.4 });
}
function wizMorphCam(st, dt) {
  const ph = st.ph, ps = G.players, sh = ps[ph.shift], ca = ps[ph.cast];
  const want = clamp(sh.x * 0.7 + ca.x * 0.3 - W / 2 + 120, 0, ph.end + 200 - W);
  st.cam.x += (want - st.cam.x) * Math.min(1, (dt || 0) * 3); st.cam.y = 0;
  const c = st.hm;
  c.x += (st.cam.x + 820 - c.x) * Math.min(1, (dt || 0) * 2); c.y = 100 + Math.sin(ph.t * 0.9) * 8; c.face = -1;
  if (c.pose === 'talk' && !st.say) c.pose = 'idle';
}
function wizMorphCoast(st, dt) {
  const ph = st.ph;
  if (!ph.obs) { wizCoast(dt); return; }
  for (const p of G.players) { p.vx = 0; p.vy = 0; p.pendingJump = false; p.pendingAct = false; }
  wizMorphCam(st, dt || 0);
}

/* ---------- drawing ---------- */
function wizMorphDrawBack(st) {
  const ph = st.ph, K = WIZMORPH, cx = st.cam.x, t = G.clock, F = K.floor, C2 = WIZMORPH_C;
  wizScreen(st, () => wizDusk(t, cx, 0, { skyY: 330 }));
  // the garden wall under the walkway, far hedges
  for (let x = Math.floor((cx - 60) / 90) * 90; x < cx + W + 90; x += 90) {
    const hh = hash(x, 12), r = 42 + hh % 8;
    ctx.fillStyle = '#3e5c48'; circle(x, F - 26, r); ctx.fill();
    ctx.fillStyle = '#4a6a52'; circle(x - 4, F - 30, r - 6); ctx.fill();
    ctx.fillStyle = 'rgba(200,230,180,0.14)'; circle(x - 14, F - 52, r * 0.45); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let j = 0; j < 4; j++) { circle(x - 20 + ((hh >> (j * 3)) % 40), F - 40 + ((hh >> (j * 2 + 5)) % 28), 3); ctx.fill(); }
  }
  for (const r of ph.shSolids) {
    if (r.x1 < cx - 40 || r.x0 > cx + W + 40) continue;
    if (r.kind === 'floor') wizLawn(Math.max(r.x0, cx - 40), r.y0, Math.min(r.x1, cx + W + 40), r.y1, { top: C2.grass, body: C2.grassDk });
    if (r.kind === 'poolbed') { const g = ctx.createLinearGradient(0, F, 0, F + K.pool + 40); g.addColorStop(0, '#3a5a7a'); g.addColorStop(1, '#22384e'); ctx.fillStyle = g; ctx.fillRect(r.x0, F, r.x1 - r.x0, K.pool + 40); ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = r.x0 + 12; x < r.x1 - 8; x += 26) { circle(x + hash(x, 2) % 10, F + K.pool - 6, 5); ctx.fill(); } }
  }
}
function wizMoRR(c, x, y, w, h, r) { RICH.rr(c, x, y, w, h, r); }
function wizMorphDraw(st) {
  const ph = st.ph, K = WIZMORPH, C2 = WIZMORPH_C, cx = st.cam.x, t = G.clock, F = K.floor;
  ctx.lineJoin = 'round';
  // the walkway and its gates
  // (art pass) the walkway: a deck of dressed stone blocks pinned to the world with a lit coping and a shadowed foot
  RICH.strip('wizmowalk|' + (K.under - K.walk), cx - 40, cx + W + 40, K.walk, K.under - K.walk, 256, (c, gx, w, h) => {
    RICH.flags(c, 0, 0, w, h, { col: C2.stone, mortar: C2.stoneDk, course: h, len: 40, seed: 14, gx });
    c.fillStyle = 'rgba(255,255,255,0.24)'; c.fillRect(0, 0, w, 2); c.fillStyle = RICH.rgba(RICH.dk(C2.stone, 0.6), 0.4); c.fillRect(0, h - 3, w, 3);
  });
  ctx.fillStyle = C2.stoneDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx - 40, K.under); ctx.lineTo(cx + W + 40, K.under); ctx.stroke();
  for (const o of ph.obs) {
    if (o.sx > cx + W + 60 || o.x1 < cx - 60) continue;
    const g = o.gate;
    if (!g.off) { RICH.pic('wizmogate|' + (g.x1 - g.x0), g.x1 - g.x0, 80, (c, w, h) => {
        RICH.wood(c, 0, 0, w, h, { col: C2.wood, vert: true, bw: Math.max(6, w / 3), seed: 6, edge: false });
        for (const y of [20, 50]) { c.fillStyle = '#3e3a48'; c.fillRect(0, y - 2, w, 6); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(0, y - 2, w, 1); for (let x = 4; x < w - 2; x += 8) RICH.rivet(c, x, y + 1, 1.1, '#5a5868'); }
      }, g.x0, K.walk - 80); ctx.strokeRect(g.x0, K.walk - 80, g.x1 - g.x0, 80); }
    else { ctx.save(); ctx.translate(g.x0, K.walk); ctx.rotate(-1.3); RICH.pic('wizmogateopen', 80, 10, c => { RICH.wood(c, 0, 0, 80, 10, { col: C2.wood, seed: 6, r: 2, lw: 1.2 }); c.fillStyle = '#3e3a48'; c.fillRect(18, 0, 5, 10); c.fillRect(54, 0, 5, 10); }, 0, -6); ctx.restore(); }
    // (art pass, 2nd look) the plain pad: a carved moonstone disc with a lit rim, a rune ring and a shadow; the rope:
    // a twisted bell-pull with a tassel knob
    const py = o.pad.y, pcx = (o.pad.x0 + o.pad.x1) / 2;
    ctx.fillStyle = 'rgba(20,10,40,0.3)'; ctx.beginPath(); ctx.ellipse(pcx + 2, py + 3, 31, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9a90b8'; ctx.beginPath(); ctx.ellipse(pcx, py + 1.5, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8d0e8'; ctx.beginPath(); ctx.ellipse(pcx, py, 30, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,90,160,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(pcx, py, 21, 3.8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(110,90,160,0.7)'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; ctx.fillRect(pcx + Math.cos(a) * 25.5 - 1, py + Math.sin(a) * 4.7 - 0.6, 2, 1.2); }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(pcx - 8, py - 2.5, 13, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    { const rx = o.rope, ry = py - 34;
      ctx.strokeStyle = '#a89060'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(rx, K.under); ctx.quadraticCurveTo(rx + 6, (K.under + py) / 2, rx, ry); ctx.stroke();
      ctx.strokeStyle = C2.rope; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(rx - 0.6, K.under); ctx.quadraticCurveTo(rx + 5.4, (K.under + py) / 2, rx - 0.6, ry); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,90,40,0.7)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k < 24; k++) { const u = k / 24, mx = (1 - u) * (1 - u) * rx + 2 * u * (1 - u) * (rx + 6) + u * u * rx, my = (1 - u) * (1 - u) * K.under + 2 * u * (1 - u) * ((K.under + py) / 2) + u * u * ry; ctx.moveTo(mx - 1.8, my - 1.4); ctx.lineTo(mx + 1.8, my + 1.4); }
      ctx.stroke();
      ctx.fillStyle = o.done ? '#9fe07f' : '#ff8fd0'; circle(rx, ry, 6); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(rx - 2, ry - 2, 2); ctx.fill();
      ctx.fillStyle = o.done ? '#5aa04a' : '#c85a9a'; ctx.fillRect(rx - 3, ry + 5, 6, 2.5);
    }
    // the pools
    if (o.pool) { ctx.fillStyle = C2.water; ctx.fillRect(o.pool.x0, F, o.pool.x1 - o.pool.x0, K.pool); ctx.strokeStyle = C2.waterTop; ctx.lineWidth = 3; ctx.beginPath(); for (let x = o.pool.x0; x <= o.pool.x1; x += 10) { const y = F + 2 + Math.sin(t * 3 + x * 0.1) * 2; if (x === o.pool.x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
    // the "Now!" rings of the two-shape obstacles
    if (o.ring && !o.done && ph.ob === o.k) { const a = 0.5 + 0.4 * Math.sin(t * 6); ctx.save(); ctx.globalAlpha = a; wizSpellRing(o.ring.x, o.ring.y - 10, 22, 'morph', t, 1); ctx.restore(); text('Now!', o.ring.x, o.ring.y - 42, 14, '#ffd0ee', 'center', 'body'); }
    // obstacle numbers
    text(String(o.k + 1), o.sx + 20, F + 30, 16, 'rgba(255,255,255,0.5)', 'center', 'body');
  }
  for (const r of ph.shSolids) {
    if (r.x1 < cx - 40 || r.x0 > cx + W + 40) continue;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    if (r.kind === 'hedge') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse((r.x0 + r.x1) / 2, r.y1 + 3, (r.x1 - r.x0) / 2 + 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      // (art pass, 2nd look) a clipped yew wall: hundreds of little leaf clusters in three greens, lit on the moonlit
      // left, shaded right, a few white blossoms and darker hollows, the same rounded outline (a cached picture)
      const hw = r.x1 - r.x0 + 12, hh = r.y1 - r.y0 + 4;
      RICH.pic('wizmohedge|' + hw + '|' + hh, hw, hh, c => {
        wizMoRR(c, 0, 0, hw, hh, 14); c.fillStyle = C2.hedge; c.fill(); c.save(); wizMoRR(c, 0, 0, hw, hh, 14); c.clip();
        const n = Math.round(hw * hh / 22);
        for (let k = 0; k < n; k++) {
          const lx = RICH.r(hw + 3, k) * hw, ly = RICH.r(hh + 5, k) * hh, side = lx / hw, tn = RICH.r(7, k);
          c.fillStyle = tn < 0.33 ? C2.hedgeDk : tn < 0.75 ? RICH.mix(C2.hedge, '#5aa860', 0.3 + (1 - side) * 0.3) : RICH.mix('#7ac874', C2.hedge, side * 0.6);
          c.beginPath(); c.ellipse(lx, ly, 3.2, 2.2, RICH.r(9, k) * 3, 0, Math.PI * 2); c.fill();
        }
        for (let k = 0; k < hh / 20; k++) { c.fillStyle = 'rgba(20,50,25,0.35)'; c.beginPath(); c.ellipse(hw * (0.3 + RICH.r(11, k) * 0.5), 10 + RICH.r(12, k) * (hh - 20), 5, 4, 0, 0, Math.PI * 2); c.fill(); }
        const g = c.createLinearGradient(0, 0, hw, 0); g.addColorStop(0, 'rgba(210,240,190,0.25)'); g.addColorStop(0.35, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(10,30,20,0.35)');
        c.fillStyle = g; c.fillRect(0, 0, hw, hh);
        c.fillStyle = 'rgba(220,250,200,0.35)'; c.fillRect(0, 0, hw, 3);
        for (let k = 0; k < hh / 26; k++) { const fx = 6 + RICH.r(13, k) * (hw - 12), fy = 8 + RICH.r(14, k) * (hh - 16); c.fillStyle = '#f4f0ff'; for (let q = 0; q < 4; q++) { c.beginPath(); c.arc(fx + Math.cos(q * 1.57) * 1.6, fy + Math.sin(q * 1.57) * 1.6, 1.3, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#ffd23f'; c.fillRect(fx - 0.7, fy - 0.7, 1.4, 1.4); }
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, hh - 6, hw, 6);
        c.restore();
      }, r.x0 - 6, r.y0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(r.x0 - 6, r.y0, r.x1 - r.x0 + 12, r.y1 - r.y0 + 4, 14); ctx.stroke();
    }
    else if (r.kind === 'belfry' || r.kind === 'block') {
      RICH.pic('wizmoblk|' + (r.x1 - r.x0) + '|' + (r.y1 - r.y0), r.x1 - r.x0, r.y1 - r.y0, (c, w, h) => { RICH.stone(c, 0, 0, w, h, { col: C2.stone, mortar: C2.stoneDk, course: 20, len: Math.min(46, w), seed: w + 3, edge: false }); c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(w - 6, 0, 6, h); c.fillStyle = 'rgba(230,220,255,0.16)'; c.fillRect(0, 0, 3, h); }, r.x0, r.y0);
      ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
    else if (r.kind === 'plug') { ctx.fillStyle = 'rgba(20,10,30,0.85)'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
    else if (r.kind === 'fence' && !r.off) { RICH.pic('wizmofence|' + (r.x1 - r.x0) + '|' + (r.y1 - r.y0), r.x1 - r.x0 + 6, r.y1 - r.y0, (c, w, h) => {
        for (let y = 4; y < h; y += 18) RICH.wood(c, 0, y, w, Math.min(12, h - y), { col: C2.wood, seed: y, r: 2, lw: 1.2 });
        RICH.wood(c, 4, 0, 4, h, { col: C2.woodDk, vert: true, bw: 4, seed: 2, edge: false });
        for (let y = 10; y < h; y += 18) RICH.nail(c, 6, y, 1);
      }, r.x0 - 3, r.y0); }
    else if (r.kind === 'bank') { wizLawn(r.x0, r.y0, r.x1, r.y1, { top: C2.grass, body: C2.grassDk, noFlowers: true }); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
  }
}
// the SHIFTER in its shape (the engine skips them while not plain), the dial over the CASTER
function wizMorphDrawTop(st) {
  const ph = st.ph, K = WIZMORPH, t = G.clock;
  if (!ph.obs) return;
  const sh = G.players[ph.shift], x = sh.x + sh.w / 2 + st.cam.x, y = sh.y + sh.h + st.cam.y, col = sh.id === 0 ? '#ff9a3c' : '#5aa8ff', f = sh.face || 1;
  if (ph.shape !== 'plain') wizMorphDrawAnimal(ph.shape, x, y, f, col, t, ph.float > 0);
}
function wizMorphDrawAnimal(shape, x, y, f, col, t, floating) {
  ctx.save(); ctx.translate(x, y); ctx.scale(f, 1); ctx.lineJoin = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
  if (shape === 'frog') {
    ctx.fillStyle = '#6ad06a'; ctx.beginPath(); ctx.ellipse(0, -9, 13, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(-5, -17, 4.5); ctx.fill(); ctx.stroke(); circle(6, -17, 4.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; circle(-4, -17, 2); ctx.fill(); circle(7, -17, 2); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(0, -34); ctx.lineTo(6, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (floating) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; circle(0, -10, 20 + Math.sin(t * 10) * 3); ctx.stroke(); }
  } else if (shape === 'fish') {
    const w = Math.sin(t * 12) * 3;
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -7, 14, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(-22, -14 + w); ctx.lineTo(-22, 0 + w); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(7, -9, 3); ctx.fill(); ctx.fillStyle = C.ink; circle(8, -9, 1.5); ctx.fill();
    ctx.fillStyle = '#ffd0ee'; ctx.beginPath(); ctx.moveTo(-2, -13); ctx.lineTo(2, -20); ctx.lineTo(6, -13); ctx.fill();
  } else if (shape === 'bat') {
    const fl = Math.sin(t * 18) * 0.6;
    ctx.fillStyle = '#6a4a9a';
    for (const d of [-1, 1]) { ctx.save(); ctx.scale(d, 1); ctx.rotate(fl * 0.5); ctx.beginPath(); ctx.moveTo(3, -8); ctx.quadraticCurveTo(14, -20, 22, -10); ctx.quadraticCurveTo(17, -8, 15, -3); ctx.quadraticCurveTo(10, -6, 3, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = col; circle(0, -7, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(-2, -8, 2); ctx.fill(); circle(3, -8, 2); ctx.fill();
  }
  ctx.restore();
}
function wizMorphHud(st) {
  const ph = st.ph, K = WIZMORPH, big = wizBig(), z = big ? 1.35 : 1, t = G.clock;
  const ca = G.players[ph.cast], x = ca.x + ca.w / 2 + 74 * z, y = ca.y - 4 * z;   // (beside the caster: the news line runs above)
  // the dial: three shapes, the chosen one big
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.93)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(x - 54 * z, y - 22 * z, 108 * z, 40 * z, 14 * z); ctx.fill(); ctx.stroke();
  const need = ph.gold ? wizMorphNeed(ph) : null;
  K.shapes.forEach((s, i) => {
    const ix = x + (i - 1) * 34 * z, sel = i === ph.dial;
    if (need === s && Math.sin(t * 8) > 0) { ctx.fillStyle = 'rgba(255,210,63,0.7)'; circle(ix, y - 2 * z, 15 * z); ctx.fill(); }
    if (sel) { ctx.strokeStyle = WIZ_SPELLS.morph.dark; ctx.lineWidth = 3; circle(ix, y - 2 * z, 15 * z); ctx.stroke(); }
    ctx.save(); ctx.translate(ix, y + 8 * z); ctx.scale(z * (sel ? 0.9 : 0.65), z * (sel ? 0.9 : 0.65)); wizMorphDrawAnimal(s, 0, 0, 1, '#ff8fd0', t, false); ctx.restore();
  });
  ctx.restore();
}

WIZ_PHASES.morph = {
  setup(st, L) { wizMorphSetup(st, L); },
  step(st, dt) { wizMorphStep(st, dt); },
  coast(st, dt) { wizMorphCoast(st, dt); },
  plan(st) { return wizMorphPlan(st); },
  hide(st) { const ph = st.ph; if (!ph.obs) return false; return [0, 1].map(id => id === ph.shift && ph.shape !== 'plain'); },
  plainHero(st, p) { const ph = st.ph; return !!ph.obs && p.id === ph.shift && ph.shape !== 'plain'; },
  labels(st) { const ph = st.ph, w = { plain: 'pull', frog: 'hop', fish: 'dash', bat: 'flap' }; return [0, 1].map(id => (id === ph.cast ? 'morph' : w[ph.shape] || 'pull')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.cast ? 'Cast!' : 'Shift!')); },
  jobKeys(st) { return st.ph.cast === 1 ? ['shifter', 'caster'] : ['caster', 'shifter']; },
  legend(st) {
    const ph = st.ph, c = k => (k ? '<kbd>↑</kbd><kbd>↓</kbd> turn the dial' : '<kbd>W</kbd><kbd>S</kbd> turn the dial');
    return { pip: ph.cast === 0 ? c(0) : 'be the right animal', bo: ph.cast === 1 ? c(1) : 'be the right animal', pad: 'caster: stick up / down turns the dial,' };
  },
  hudText(st) { const ph = st.ph; return 'Obstacle ' + Math.min(12, ph.ob + 1) + ' of 12'; },
  progress(st) { const ph = st.ph; return { n: ph.ob, of: 12 }; },
  drawBack(st) { wizMorphDrawBack(st); },
  draw(st) { wizMorphDraw(st); },
  drawTop(st) { wizMorphDrawTop(st); },
  hud(st) { wizMorphHud(st); },
  statLine(st) { const s = st.stats.morph; return s && s.casts ? s.casts + ' morphs cast' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizMorphDial = function () { this.tone(900, 0.04, 'square', 0.02); };
Sfx.extra.wizMorphPlain = function () { this.tone(700, 0.12, 'sine', 0.03, 400); };
Sfx.extra.wizMorphGlub = function () { [300, 240, 180].forEach((f, i) => this.tone(f, 0.08, 'sine', 0.04, f * 0.7, i * 0.09)); };
Sfx.extra.wizMorphBoing = function () { this.tone(220, 0.18, 'triangle', 0.04, 660); };
Sfx.extra.wizMorphSplash = function () { this.tone(1200, 0.12, 'sawtooth', 0.012, 400); };
Sfx.extra.wizMorphFlop = function () { this.tone(320, 0.05, 'square', 0.02, 200); };
Sfx.extra.wizMorphFlap = function () { this.tone(500, 0.04, 'triangle', 0.02, 300); };
Sfx.extra.wizMorphRope = function () { this.tone(200, 0.1, 'square', 0.03, 140); [523, 659].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.035, null, 0.08 + i * 0.07)); };
Sfx.extra.wizMorphPoof = function () { this.tone(400, 0.25, 'sine', 0.04, 1000); };

/* ---------- the room ---------- */
wizRoom('morph', {
  jobs: {
    caster: { title: 'Caster', act: 'morph', legend: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd><kbd>S</kbd> turn the dial',
      howTo: ['Frog for hedges, fish for water, bat for holes.'] },
    shifter: { title: 'Shifter', act: ['pull', 'hop', 'dash', 'flap'], legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
      howTo: ['A fish swims with all four arrows. A bat flaps.', 'Pull the rope at the end to open the gate.'] },
  },
  act: { label: 'morph', labels: ['morph', 'pull'] },
  tip: 'The caster turns the dial (up / down) and casts the right animal: frog for hedges, fish for water, bat for holes!',
  legend: { pip: '<kbd>W</kbd><kbd>S</kbd> turn the dial', bo: 'be the right animal', pad: 'caster: stick up / down turns the dial,' },
  map: WIZ_EMPTY_MAP,
});
