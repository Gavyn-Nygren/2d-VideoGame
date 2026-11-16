/* Pip & Bo - Level 35-1 Moonwick Academy: class 6 'size' (Shrink and Grow, spells Shrink / Grow). */
'use strict';

/* ===== 35-1 class 6: Shrink and Grow (WIZ_PHASES.size) ===========================================================
   The cluttered Great Storeroom, scrolling right, 3 rooms. One wizard zaps the other tiny or giant.

   THE TWO JOBS (room field `first` is the first ZAPPER; they swap at each room door)
   - ZAPPER (normal size, action word "zap"): UP arms GROW and DOWN arms SHRINK for WIZSIZE.arm s (an arrow over the
     wand; never two buttons at once), then the action zaps the partner if they are within WIZSIZE.range px. A plain
     action (nothing armed) turns them back to normal. A size lasts WIZSIZE.life s, shown by a ring that runs down
     around the partner, with a ticking bell for the last 3 s; then they pop back to normal (only once there is room:
     a giant never pops inside a wall, a tiny one keeps its size until it is out of the hole).
   - SIZER (action word by size): TINY (a third the size): fits through mouse holes, light enough for cobwebs, pulls
     small levers. GIANT (2.5x): slow, jumps low, shoves bookcases by walking into them, wades through the junk pit,
     and with the action lifts the ZAPPER onto its head (and carries them). Can't fit under a low beam.
   Tiptoe: holding DOWN walks slowly (the cat only wakes for footsteps).

   ROOMS (each ends at a door where the jobs swap; flags at every piece's start):
     1 the Mouse Hall   a wall with a mouse hole (tiny pulls the lever behind it: the wall lifts); the sleeping cat:
                        anyone who walks (not tiptoes) in front of it makes it open an eye ("!", WIZSIZE.cat.warn s),
                        then it swats them back. The first swat in a room is free, the next is an Oops. A second wall
                        with a mouse hole behind the cat.
     2 the Furniture    a giant shoves the bookcase up to the high shelf (it makes a step); a low beam (no giants);
       Maze             a cobweb bridge over a well (tiny only: a normal wizard tears it and falls, an Oops); the lever
                        beyond lowers a plank for the ZAPPER.
     3 the Clock Attic  a long junk pit: only a giant can wade it. The giant lifts the ZAPPER onto its head and carries
                        them over; the size runs out on the way, so the ZAPPER re-zaps from up there (the bell warns).
                        Anyone else in the junk sinks: an Oops, back to the flag.
   GOLD HELP after WIZ.goldAfter Oops in one room: sizes last WIZSIZE.goldLife s (announced).
   Stats (st.stats.size): zaps, swats, sinks.   Names: wizSize* / WIZSIZE*. */
const WIZSIZE = {
  floor: 430, roomW: 1500, door: 1440, ceil: 40,
  range: 300, arm: 1.5, life: 12, goldLife: 20, bell: 3,
  box: { tiny: [8, 9], normal: [22, 26], giant: [55, 65] },
  tiny: { run: 150, jumpV: 500 }, giant: { run: 120, wade: 90, jumpV: 540 }, tiptoe: 55,
  book: { w: 60, h: 70, push: 70 }, high: 130,
  cat: { warn: 0.9, swat: 420 },
  junk: 40,
};
const WIZSIZE_NEWS = ['Room 1, the Mouse Hall: tiny wizards fit through mouse holes. Tiptoe past the cat!', 'Room 2, the Furniture Maze: shove the bookcase, then mind the beam and the cobweb.', 'Room 3, the Clock Attic: only a giant can wade the junk. Ride on its head!'];
const WIZSIZE_C = { wall: '#7a5a4a', wallDk: '#4e3528', floor: '#9a7a5a', floorDk: '#6a4a32', book: '#8a4a3a', web: 'rgba(240,240,255,0.8)', junk: '#6e6a7e', junkDk: '#4a465a', plank: '#b88a50' };

function wizSizeSetup(st, L) {
  const ph = st.ph, K = WIZSIZE, F = K.floor;
  ph.zap = L.def.first || 0; ph.siz = 1 - ph.zap;
  ph.t = 0; ph.room = 0; ph.pc = 0; ph.size = 'normal'; ph.sizeT = 0; ph.armed = null; ph.armT = 0; ph.carry = false; ph.done = false; ph.swapT = 0;
  ph.swats = 0; ph.gold = false; ph.wantSize = null; ph.bellT = 0;
  wizSizeRoom(st, 0);
  const s = wizStats(st); Object.assign(s, { zaps: s.zaps || 0, swats: s.swats || 0, sinks: s.sinks || 0 });
  Object.assign(st.hm, { x: 760, y: 110, s: 0.75, face: -1, pose: 'talk' });
  wizSay(st, 'Shrink and Grow! Up then zap to grow, down then zap to shrink.', 3);
}
// build room r (the world is one room at a time: x from 0 to WIZSIZE.roomW)
function wizSizeRoom(st, r) {
  const ph = st.ph, K = WIZSIZE, F = K.floor;
  ph.room = r; ph.solids = []; ph.pieces = []; ph.pc = 0; ph.swats = 0; ph.carry = false;
  const S = ph.solids, wall = (x0, x1, kind) => ({ x0, y0: K.ceil, x1, y1: F - 12, kind });
  S.push({ x0: -40, y0: -400, x1: 0, y1: 800, kind: 'edge' }, { x0: K.roomW, y0: -400, x1: K.roomW + 40, y1: 800, kind: 'edge' }, { x0: -40, y0: K.ceil - 40, x1: K.roomW + 40, y1: K.ceil, kind: 'ceil' });
  if (r === 0) {
    S.push({ x0: 0, y0: F, x1: K.roomW, y1: F + 300, kind: 'floor' });
    const w1 = wall(420, 460, 'mousewall'), w2 = wall(1100, 1140, 'mousewall');
    S.push(w1, w2);
    ph.pieces.push({ kind: 'mouse', flag: 120, wall: w1, lever: { x: 560, y: F, pulled: false } });
    ph.pieces.push({ kind: 'cat', flag: 620, wall: w2, lever: { x: 1220, y: F, pulled: false }, zone: { x0: 760, x1: 1100 }, cat: { x: 930, eye: 0, who: -1 } });
  } else if (r === 1) {
    const H = F - K.high, pit = { x0: 900, x1: 1100 };
    S.push({ x0: 0, y0: F, x1: K.roomW, y1: F + 300, kind: 'floor' });
    S.push({ x0: 600, y0: H, x1: pit.x0, y1: F, kind: 'shelf' }, { x0: pit.x1, y0: H, x1: K.roomW, y1: F, kind: 'shelf' });
    const book = { x0: 300, y0: F - K.book.h, x1: 300 + K.book.w, y1: F, kind: 'book' };
    const beam = { x0: 760, y0: K.ceil, x1: 800, y1: H - 34, kind: 'beam' };
    const web = { x0: pit.x0, y0: H, x1: pit.x1, y1: H + 6, kind: 'web', one: true, tinyOnly: true };
    const plank = { x0: pit.x0, y0: H, x1: pit.x1, y1: H + 10, kind: 'plank', off: true };
    S.push(book, beam, web, plank);
    ph.pieces.push({ kind: 'shove', flag: 120, book, stop: 600 });
    ph.pieces.push({ kind: 'web', flag: 640, beam, web, plank, pit, H, lever: { x: 1200, y: H, pulled: false } });
  } else {
    const pit = { x0: 300, x1: 1350 };
    S.push({ x0: 0, y0: F, x1: pit.x0, y1: F + 300, kind: 'floor' }, { x0: pit.x1, y0: F, x1: K.roomW, y1: F + 300, kind: 'floor' });
    S.push({ x0: pit.x0, y0: F + K.junk, x1: pit.x1, y1: F + 300, kind: 'junkbed', giantOnly: true });
    ph.pieces.push({ kind: 'junk', flag: 120, pit });
  }
  ph.pieces.push({ kind: 'door', flag: r === 1 ? 1220 : 1380, x: K.door, y: r === 1 ? F - K.high : F });
  // the two wizards at the room's start
  const ps = G.players, z = ps[ph.zap], s = ps[ph.siz];
  ph.size = 'normal'; ph.sizeT = 0; ph.armed = null;
  Object.assign(z, { x: 70 - z.w / 2, y: F - z.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true });
  Object.assign(s, { x: 130 - s.w / 2, y: F - s.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true });
  st.cam = { x: 0, y: 0 };
  wizNews(st, WIZSIZE_NEWS[r]);
}
const wizSizeFlagY = (ph, x) => (ph.room === 1 && x >= 600 ? WIZSIZE.floor - WIZSIZE.high : WIZSIZE.floor);
const wizSizeCatPc = ph => ph.pieces.find(q => q.cat) || null;
const wizSizePc = ph => ph.pieces[Math.min(ph.pc, ph.pieces.length - 1)];
const wizSizeLife = st => (st.ph.gold ? WIZSIZE.goldLife : WIZSIZE.life);
// the box a size would have, bottom-centred on the player
function wizSizeBox(p, size) {
  const [bw, bh] = WIZSIZE.box[size];
  return { x0: p.x + p.w / 2 - bw / 2, y0: p.y + p.h - bh, x1: p.x + p.w / 2 + bw / 2, y1: p.y + p.h };
}
const wizSizeSolid = (ph, r, size) => !r.off && !r.one && !(r.giantOnly && size !== 'giant');
// does that size fit here? (-> the x shift that makes it fit, or null)
function wizSizeFits(st, p, size) {
  const ph = st.ph;
  for (const d of [0, -8, 8, -16, 16, -24, 24, -32, 32, -40, 40]) {
    const b = wizSizeBox(p, size); b.x0 += d; b.x1 += d;
    if (!ph.solids.some(r => wizSizeSolid(ph, r, size) && b.x1 > r.x0 + 0.5 && b.x0 < r.x1 - 0.5 && b.y1 > r.y0 + 0.5 && b.y0 < r.y1 - 0.5)) return d;
  }
  return null;
}
// the size the SIZER needs right now
function wizSizeNeed(ph) {
  const pc = wizSizePc(ph), s = G.players[ph.siz], feet = s.y + s.h, F = WIZSIZE.floor;
  if (!pc || ph.done) return 'normal';
  switch (pc.kind) {
    case 'mouse': case 'cat': return pc.lever.pulled ? 'normal' : 'tiny';
    case 'shove': return 'giant';
    case 'web': return feet > pc.H + 4 ? 'normal' : 'tiny';
    case 'junk': return 'giant';
  }
  return 'normal';
}
function wizSizePlan(st) {
  const ph = st.ph, K = WIZSIZE, F = K.floor, out = [null, null], ps = G.players, z = ps[ph.zap], s = ps[ph.siz];
  const pc = wizSizePc(ph), need = wizSizeNeed(ph), scx = s.x + s.w / 2, zcx = z.x + z.w / 2;
  const dist = Math.hypot(scx - zcx, (s.y + s.h / 2) - (z.y + z.h / 2));
  // the ZAPPER: arm and zap when the size is wrong (or about to run out mid-task); otherwise walk behind the SIZER
  let tap = null, why = 'follow';
  const late = ph.size === need && need !== 'normal' && ph.sizeT < 2;
  if ((need !== ph.size || late) && dist < K.range - 20) {
    if (need === 'normal') { tap = ph.armed ? null : 'act'; why = 'zap'; }
    else if (ph.armed !== (need === 'giant' ? 'grow' : 'shrink')) { tap = need === 'giant' ? 'up' : 'down'; why = 'arm'; }
    else { tap = 'act'; why = 'zap'; }
    if (ph.armed && need === 'normal') why = 'wait';
  } else if (need !== ph.size || late) why = 'closer';
  let zx = scx - 50, hold = null;
  if (pc.kind === 'mouse' || pc.kind === 'cat') { if (!pc.lever.pulled) zx = Math.min(zx, pc.wall.x0 - 30); else zx = Math.max(zx, pc.kind === 'cat' ? pc.lever.x + 40 : pc.wall.x1 + 60); }
  const cp = wizSizeCatPc(ph);
  if (cp && zcx > cp.zone.x0 - 20 && zcx < cp.zone.x1 + 10) hold = 'down';
  if (pc.kind === 'shove') zx = Math.min(zx, pc.book.x0 - 30);
  if (pc.kind === 'web') zx = pc.plank.off ? Math.min(Math.max(zx, pc.web.x0 - 120), pc.web.x0 - 24) : Math.max(zx, pc.web.x1 + 30);
  if (pc.kind === 'junk') zx = ph.carry ? zcx : (ph.size === 'giant' ? Math.min(scx - 34, pc.pit.x0 - 20) : Math.min(zx, pc.pit.x0 - 40));
  if (pc.kind === 'door') zx = pc.x - 20;
  out[ph.zap] = { why, tap, need, hold, x: zx };
  // the SIZER
  let S = { why: 'wait', x: scx, need };
  if (pc.kind === 'door') S = { why: 'door', x: pc.x - 50 };
  else if (need !== ph.size) {
    // wait somewhere safe for the right size
    let wx = scx;
    if (pc.kind === 'mouse') wx = Math.min(scx, pc.wall.x0 - 30);
    else if (pc.kind === 'cat') wx = scx > pc.zone.x0 - 10 && scx < pc.lever.x - 20 ? scx : Math.min(scx, pc.zone.x0 - 30);
    else if (pc.kind === 'shove') wx = Math.min(scx, pc.book.x0 - 40);
    else if (pc.kind === 'web' && need === 'tiny') wx = Math.min(Math.max(scx, pc.beam.x1 + 20), pc.pit.x0 - 20);
    else if (pc.kind === 'web') wx = Math.min(scx, pc.book ? scx : scx);
    else if (pc.kind === 'junk') wx = Math.min(scx, pc.pit.x0 - 30);
    S = { why: 'wait', x: wx, need };
  } else if (pc.kind === 'mouse' || pc.kind === 'cat') {
    S = { why: 'lever', x: pc.lever.x, need, tiptoe: pc.kind === 'cat' && scx > pc.zone.x0 - 30 && scx < pc.zone.x1 + 10, tap: Math.abs(scx - pc.lever.x) < 14 ? 'act' : null };
  } else if (pc.kind === 'shove') S = { why: 'shove', x: pc.stop + 10, need };
  else if (pc.kind === 'web') {
    if (need === 'normal') { const bk = ph.solids.find(r => r.kind === 'book'); S = { why: 'climb', x: pc.pit.x0 - 40, step: bk, need }; }
    else S = { why: 'lever', x: pc.lever.x, need, tap: Math.abs(scx - pc.lever.x) < 14 ? 'act' : null };
  } else if (pc.kind === 'junk') {
    if (!ph.carry) S = { why: 'lift', x: zcx + 30, need, tap: Math.abs(scx - zcx) < 46 && s.grounded && z.grounded ? 'act' : null };
    else S = { why: 'wade', x: pc.pit.x1 + 70, need };
  }
  out[ph.siz] = S;
  return out;
}
function wizSizeSet(st, size) {
  const ph = st.ph, p = G.players[ph.siz];
  if (size !== 'normal') ph.sizeT = wizSizeLife(st);
  if (size === ph.size) return true;
  const d = wizSizeFits(st, p, size);
  if (d == null) { wizPop(st, p.x + p.w / 2, p.y - 20, 'No room!', '#ffffff', 16); return false; }
  p.x += d; ph.size = size; ph.bellT = 0;
  Sfx.play(size === 'giant' ? 'wizSizeGrow' : size === 'tiny' ? 'wizSizeShrink' : 'wizSizeNormal');
  if (size === 'normal') { ph.sizeT = 0; if (ph.carry) wizSizeDrop(st); }
  return true;
}
function wizSizeZap(st) {
  const ph = st.ph, K = WIZSIZE, ps = G.players, z = ps[ph.zap], s = ps[ph.siz];
  const d = Math.hypot((s.x + s.w / 2) - (z.x + z.w / 2), (s.y + s.h / 2) - (z.y + z.h / 2));
  const to = ph.armed === 'grow' ? 'giant' : ph.armed === 'shrink' ? 'tiny' : 'normal';
  ph.armed = null; ph.armT = 0;
  if (d > K.range) { wizPop(st, z.x + z.w / 2, z.y - 26, 'Too far!', '#ffffff', 14); return; }
  wizStats(st).zaps++;
  wizSparks(s.x + s.w / 2, s.y + s.h / 2, 'size', 10); wizSpellRing(s.x + s.w / 2, s.y + s.h / 2, 22, 'size', G.clock, 1);
  wizSizeSet(st, to);
}
// the ZAPPER comes down off the giant's head (where they are)
function wizSizeDrop(st) {
  const ph = st.ph, z = G.players[ph.zap];
  ph.carry = false; z.vy = -200; z.grounded = false;
}
function wizSizePop(st, p, word) {
  // (an Oops for p; both wizards go back to the piece's flag, the SIZER normal again)
  const ph = st.ph, pc = wizSizePc(ph), ps = G.players, y = wizSizeFlagY(ph, pc.flag);
  ph.size = 'normal'; ph.sizeT = 0; ph.carry = false; ph.armed = null;
  for (const q of ps) {
    const to = { x: pc.flag + (q.id === ph.zap ? -30 : 0), y };
    if (q !== p || !wizOops(st, q, { word, kind: 'size', to })) Object.assign(q, { x: to.x - q.w / 2, y: to.y - q.h, vx: 0, vy: 0, grounded: true });
  }
  st.cam.x = clamp(pc.flag - W / 2 + 80, 0, WIZSIZE.roomW - W);
  const n = wizMiss(st, 'r' + ph.room);
  if (n >= WIZ.goldAfter && wizGoldOnce(st, 'size' + ph.room, 'Gold wand! Sizes last ' + WIZSIZE.goldLife + ' s now.')) ph.gold = true;
}
// one player's move in its size (the SIZER's box is set only for the move)
function wizSizeMove(st, p, dt, size) {
  const ph = st.ph, K = WIZSIZE, [bw, bh] = K.box[size], w0 = p.w, h0 = p.h, dx = (w0 - bw) / 2, dy = h0 - bh;
  const sol = ph.solids.filter(r => !(r.tinyOnly && size !== 'tiny') && !(r.giantOnly && size !== 'giant'));
  p.x += dx; p.y += dy; p.w = bw; p.h = bh;
  try { wizBody(p, dt, sol, { ctl: (q, d) => wizSizeCtl(st, q, d, size) }); } finally { p.x -= dx; p.y -= dy; p.w = w0; p.h = h0; }
  // (the screen's edges: nobody walks out of view)
  const lo = st.cam.x - (w0 - bw) / 2, hi = st.cam.x + W - w0 + (w0 - bw) / 2;
  if (p.x < lo) { p.x = lo; p.vx = Math.max(0, p.vx); } else if (p.x > hi) { p.x = hi; p.vx = Math.min(0, p.vx); }
}
function wizSizeCtl(st, p, dt, size) {
  const ph = st.ph, K = WIZSIZE, i = p.input, dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
  const zapper = p.id === ph.zap;
  if (size === 'normal' && !i.down) { control(p, dt); return; }
  const prm = size === 'tiny' ? K.tiny : size === 'giant' ? K.giant : { run: PHYS.maxRun, jumpV: PHYS.jumpV };
  let run = prm.run;
  if (size === 'giant' && p.y + p.h > K.floor + 4) run = K.giant.wade;
  if (i.down && size !== 'giant') run = K.tiptoe;
  if (dir) p.face = dir;
  p.vx = approach(p.vx, dir * run, (p.grounded ? PHYS.accG : PHYS.accA) * dt);
  p.coyote = p.grounded ? PHYS.coyote : p.coyote - dt;
  if (p.pendingJump) { p.jumpBuf = PHYS.buffer; p.pendingJump = false; } else p.jumpBuf -= dt;
  if (p.jumpBuf > 0 && p.coyote > 0 && !zapper) { p.vy = -prm.jumpV; p.jumpBuf = 0; p.coyote = 0; p.grounded = false; p.jumping = true; }
  else if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -PHYS.jumpV; p.jumpBuf = 0; p.coyote = 0; p.grounded = false; p.jumping = true; }
  if (p.jumping && !i.jump && !i.up && p.vy < 0) p.vy *= 0.6, p.jumping = false;
  p.vy = Math.min(PHYS.maxFall, p.vy + PHYS.g * dt);
}
function wizSizeStep(st, dt) {
  const ph = st.ph, K = WIZSIZE, F = K.floor, ps = G.players, z = ps[ph.zap], s = ps[ph.siz];
  ph.t += dt;
  if (st.idle) { wizSizeCoast(st, dt); return; }
  if (ph.swapT > 0) {
    ph.swapT -= dt;
    for (const p of ps) { p.vx = 0; p.vy = 0; p.pendingAct = false; p.pendingJump = false; }
    if (ph.swapT <= 0) { [ph.zap, ph.siz] = [ph.siz, ph.zap]; wizSizeRoom(st, ph.room + 1); wizSwap(st); }
    wizSizeCam(st, dt); return;
  }
  const pc = wizSizePc(ph);
  // --- the ZAPPER: arm (up / down presses), zap ---
  const upNow = wizUp(z), dnNow = !!z.input.down;
  if (upNow && !ph.upWas) { ph.armed = 'grow'; ph.armT = K.arm; Sfx.play('wizSizeArm'); }
  const cp = wizSizeCatPc(ph);
  if (dnNow && !ph.dnWas) { ph.armed = 'shrink'; ph.armT = K.arm; Sfx.play('wizSizeArm'); }
  ph.upWas = upNow; ph.dnWas = dnNow;
  if (ph.armT > 0 && (ph.armT -= dt) <= 0) ph.armed = null;
  const zapP = z.pendingAct; z.pendingAct = false;
  if (zapP) wizSizeZap(st);
  // --- the size's clock ---
  if (ph.size !== 'normal') {
    const was = ph.sizeT;
    ph.sizeT = Math.max(0, ph.sizeT - dt);
    if (ph.sizeT <= K.bell && Math.floor(ph.sizeT * 2) !== Math.floor(was * 2)) Sfx.play('wizSizeTick');
    if (ph.sizeT <= K.bell && was > K.bell) wizPop(st, s.x + s.w / 2, s.y - 30, 'Ding! ' + K.bell + ' s!', '#ffd23f', 14);
    if (ph.sizeT <= 0 && wizSizeFits(st, s, 'normal') === 0) wizSizeSet(st, 'normal');
  }
  // --- the SIZER's action: a lever (any size small enough to be there), lifting the ZAPPER (giant) ---
  const actP = s.pendingAct; s.pendingAct = false;
  const scx = s.x + s.w / 2, sfeet = s.y + s.h;
  if (actP) {
    const lv = pc.lever;
    if (lv && !lv.pulled && Math.abs(scx - lv.x) < 22 && Math.abs(sfeet - lv.y) < 30) {
      lv.pulled = true; Sfx.play('wizSizeLever'); wizPop(st, lv.x, lv.y - 40, 'Click!', '#ffd23f', 16);
      if (pc.wall) pc.wall.off = true;
      if (pc.plank) { pc.plank.off = false; }
      ph.pc++;
    } else if (ph.size === 'giant' && !ph.carry && Math.abs(scx - (z.x + z.w / 2)) < 50 && z.grounded && s.grounded) { ph.carry = true; Sfx.play('wizSizeLift'); }
    else if (ph.carry && s.grounded && sfeet <= F + 2) wizSizeDrop(st);
  }
  // --- moving ---
  // the bookcase: a giant walking into it shoves it (up to the high shelf)
  const bk = ph.solids.find(r => r.kind === 'book');
  if (bk && ph.size === 'giant' && s.input.right) {
    const b = wizSizeBox(s, 'giant');
    if (Math.abs(b.x1 - bk.x0) < 3 && b.y1 > bk.y0 + 4 && bk.x1 < (pc.stop || 600)) { const m = Math.min(K.book.push * dt, 600 - bk.x1); bk.x0 += m; bk.x1 += m; if (Math.floor(ph.t * 4) !== Math.floor((ph.t - dt) * 4)) Sfx.play('wizSizeShove'); }
  }
  wizSizeMove(st, s, dt, ph.size);
  if (ph.carry) {
    const b = wizSizeBox(s, ph.size);
    Object.assign(z, { x: (b.x0 + b.x1) / 2 - z.w / 2, y: b.y0 - z.h - 24, vx: s.vx, vy: 0, grounded: true, face: s.face });
    z.pendingJump = false;
  } else wizSizeMove(st, z, dt, 'normal');
  if (pc.kind === 'shove' && bk && bk.x1 >= 599) { ph.pc++; wizPop(st, bk.x0 + 30, bk.y0 - 20, 'A step!', '#ffd23f', 16); Sfx.play('wizSizeLever'); }
  // --- the cat ---
  if (cp) wizSizeCat(st, dt, cp);
  // across the junk: the giant sets the ZAPPER down
  if (pc.kind === 'junk' && ph.carry && s.grounded && s.x + s.w / 2 > pc.pit.x1 + 30 && s.y + s.h <= F + 2) { wizSizeDrop(st); ph.pc++; Sfx.play('wizSizeLever'); }
  else if (pc.kind === 'junk' && !ph.carry && ps.every(p => p.x + p.w / 2 > pc.pit.x1 + 10 && p.y + p.h <= F + 2)) ph.pc++;
  // --- falls: the well under the cobweb, the junk ---
  for (const p of ps) {
    const cx = p.x + p.w / 2, feet = p.y + p.h, size = p.id === ph.siz ? ph.size : 'normal';
    if (pc.kind === 'web' && cx > pc.pit.x0 && cx < pc.pit.x1 && feet > pc.H + 60) { wizStats(st).sinks++; wizSizePop(st, p, size === 'normal' && p.id === ph.siz ? 'Rip! Too heavy for a cobweb.' : 'Oops!'); }
    if (pc.kind === 'junk' && cx > pc.pit.x0 && cx < pc.pit.x1 && feet > F + 6 && size !== 'giant' && !(ph.carry && p.id === ph.zap)) {
      wizStats(st).sinks++;
      if (p.id === ph.zap || !ph.carry) wizSizePop(st, p, 'Lost in the junk!');
    }
  }
  // the room's door
  if (pc.kind === 'door' && ps.every(p => p.x + p.w / 2 > pc.x - 70) && ph.size === 'normal') {
    if (ph.room >= 2) { ph.done = true; ph.pc++; wizPhaseDone(st, { say: 'Tiny, giant, and just right. Shrink and Grow are yours!' }); }
    else { ph.swapT = 1.2; ph.pc++; wizSay(st, 'Swap! New room, new jobs.', 2.4); }
  } else if (pc.kind === 'door' && ph.size !== 'normal' && ps.every(p => p.x + p.w / 2 > pc.x - 70)) wizHint(st, ph.zap, 'Zap them back to normal: ' + wizKey(ph.zap, 'act'), { cpu: 'Back to normal for the door!' });
  wizSizeCam(st, dt);
  wizSizeHints(st);
}
function wizSizeCat(st, dt, pc) {
  const ph = st.ph, K = WIZSIZE, c = pc.cat;
  let loud = -1;
  for (const p of G.players) {
    const cx = p.x + p.w / 2;
    if (cx > pc.zone.x0 && cx < pc.zone.x1 && Math.abs(p.vx) > K.tiptoe + 15) loud = p.id;
  }
  if (loud >= 0 && c.eye <= 0) { c.eye = K.cat.warn; c.who = loud; Sfx.play('wizSizeMeow'); wizWarn(st, loud, K.cat.warn); }
  if (c.eye > 0) {
    c.eye -= dt;
    if (loud < 0 && c.eye < K.cat.warn - 0.3) c.eye = 0;   // (still again: back to sleep)
    else if (c.eye <= 0 && loud >= 0) {
      const p = G.players[loud]; wizStats(st).swats++; Sfx.play('wizSizeSwat');
      ph.swats++;
      if (ph.swats >= 2) { ph.swats = 0; wizSizePop(st, p, 'Swat! Oops!'); }
      else { knock(p, -K.cat.swat, -300, 0.4, 0); wizPop(st, p.x + p.w / 2, p.y - 20, 'Swat! Tiptoe (hold down)!', '#ffffff', 16); }
      c.eye = -1.2;
    }
  } else if (c.eye < 0) c.eye = Math.min(0, c.eye + dt);
}
function wizSizeHints(st) {
  const ph = st.ph, P = wizSizePlan(st), c = P[ph.zap], s = P[ph.siz];
  if (!st.hints[ph.zap]) {
    if (c.why === 'arm') wizHint(st, ph.zap, (c.tap === 'up' ? wizKey(ph.zap, 'up') + ' then ' + wizKey(ph.zap, 'act') + ': GROW' : wizKey(ph.zap, 'down') + ' then ' + wizKey(ph.zap, 'act') + ': SHRINK'), { cpu: c.need === 'giant' ? 'Giant time!' : 'Tiny time!' });
    else if (c.why === 'zap' && c.need === 'normal') wizHint(st, ph.zap, 'Back to normal: ' + wizKey(ph.zap, 'act'), { cpu: 'Back to normal!', life: 1.4 });
  }
  if (!st.hints[ph.siz]) {
    if (s.tiptoe) wizHint(st, ph.siz, 'Tiptoe past the cat: hold ' + wizKey(ph.siz, 'down'), { cpu: 'Shh... tiptoeing.' });
    else if (s.tap === 'act') wizHint(st, ph.siz, 'Pull the lever! ' + wizKey(ph.siz, 'act'), { cpu: 'Pulling it!', life: 1.4 });
    else if (s.why === 'lift' && s.tap) wizHint(st, ph.siz, 'Lift your partner: ' + wizKey(ph.siz, 'act'), { cpu: 'Hop on!', life: 1.4 });
  }
}
function wizSizeCam(st, dt) {
  const ph = st.ph, ps = G.players, s = ps[ph.siz], z = ps[ph.zap];
  const want = clamp((s.x + z.x) / 2 - W / 2 + 80, 0, WIZSIZE.roomW - W);
  st.cam.x += (want - st.cam.x) * Math.min(1, (dt || 0) * 3); st.cam.y = 0;
  const c = st.hm;
  c.x += (st.cam.x + 820 - c.x) * Math.min(1, (dt || 0) * 2); c.y = 100 + Math.sin(ph.t * 0.9) * 8; c.face = -1;
  if (c.pose === 'talk' && !st.say) c.pose = 'idle';
}
function wizSizeCoast(st, dt) {
  const ph = st.ph;
  if (!ph.pieces) { wizCoast(dt); return; }
  for (const p of G.players) { p.vx = 0; p.vy = 0; p.pendingJump = false; p.pendingAct = false; }
  wizSizeCam(st, dt || 0);
}

/* ---------- drawing ---------- */
function wizSizeDrawBack(st) {
  const ph = st.ph, K = WIZSIZE, cx = st.cam.x, F = K.floor, C2 = WIZSIZE_C, t = G.clock;
  const g = ctx.createLinearGradient(0, 0, 0, F); g.addColorStop(0, '#2e2232'); g.addColorStop(1, '#46344a');
  ctx.fillStyle = g; ctx.fillRect(cx - 40, 0, W + 80, H);
  // wall boards behind the shelves
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = Math.floor((cx - 40) / 34) * 34; x < cx + W + 40; x += 34) { ctx.moveTo(x, 0); ctx.lineTo(x, F); }
  ctx.stroke();
  // tall shelves of clutter far behind: boxes, jars, a clock and old books, all a little dusty
  for (let x = Math.floor((cx - 100) / 160) * 160; x < cx + W + 160; x += 160) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + 16, 96, 130, F - 96);
    ctx.fillStyle = '#4a3a4e'; ctx.fillRect(x + 10, 90, 130, F - 90);
    ctx.fillStyle = '#3a2c3e'; ctx.fillRect(x + 10, 90, 6, F - 90); ctx.fillRect(x + 134, 90, 6, F - 90);
    for (let y = 140, row = 0; y < F; y += 70, row++) {
      const h = hash(x, row);
      // the things on this shelf
      const items = [[24, 14, 30], [60, 22, 22], [100, 10, 26]];
      items.forEach(([dx, w, hh], j) => {
        const kind = (hash(x * 7 + j * 31, row * 13 + j) >> 4) % 4, ix = x + dx, top = y - hh;
        if (kind === 0) { // a box with a lid line
          ctx.fillStyle = '#6a5070'; ctx.fillRect(ix, top, w + 4, hh); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(ix, top, w + 4, 3); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(ix + w, top, 4, hh);
        } else if (kind === 1) { // a jar
          ctx.fillStyle = '#5e6a80'; rr(ix, top + 4, w, hh - 4, 4); ctx.fill(); ctx.fillStyle = '#7a6a5a'; ctx.fillRect(ix + 2, top, w - 4, 5); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(ix + 2, top + 7, 2, hh - 12);
        } else if (kind === 2) { // a stack of old books
          for (let b = 0; b < 3; b++) { ctx.fillStyle = ['#6a4048', '#4a5a6a', '#6a6040'][b]; ctx.fillRect(ix - 2 + b, y - 8 - b * 8, w + 8 - b * 2, 8); }
        } else { // a little clock
          ctx.fillStyle = '#7a5a40'; rr(ix, top + 2, w + 4, hh - 2, 4); ctx.fill(); ctx.fillStyle = '#d8ccb0'; circle(ix + (w + 4) / 2, top + hh / 2, Math.min(w, hh) / 2 - 2); ctx.fill();
          ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); const cxk = ix + (w + 4) / 2, cyk = top + hh / 2; ctx.moveTo(cxk, cyk); ctx.lineTo(cxk, cyk - 5); ctx.moveTo(cxk, cyk); ctx.lineTo(cxk + 4, cyk); ctx.stroke();
        }
      });
      ctx.fillStyle = '#5a4a5e'; ctx.fillRect(x + 10, y, 130, 6); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x + 10, y, 130, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 16, y + 6, 124, 4);
    }
    // a cobweb in the top corner of some shelves
    if (hash(x, 9) % 2) { ctx.strokeStyle = 'rgba(230,230,250,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 16, 96); ctx.lineTo(x + 46, 96); ctx.moveTo(x + 16, 96); ctx.lineTo(x + 16, 126); ctx.moveTo(x + 16, 96); ctx.lineTo(x + 38, 118); ctx.moveTo(x + 32, 96); ctx.quadraticCurveTo(x + 26, 104, x + 16, 112); ctx.moveTo(x + 42, 96); ctx.quadraticCurveTo(x + 30, 112, x + 16, 122); ctx.stroke(); }
  }
  // moonlight from a high window and dust drifting in it
  ctx.fillStyle = 'rgba(220,210,255,0.05)'; ctx.beginPath(); ctx.moveTo(cx + 560, 0); ctx.lineTo(cx + 680, 0); ctx.lineTo(cx + 520, F); ctx.lineTo(cx + 300, F); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 18; k++) {
    const h = hash(k, 21), py = (h % 400 + (reduceMotion ? 0 : t * 6 * (1 + k % 3))) % F, px = cx + 300 + (h >> 9) % 360 - py * 0.42;
    ctx.fillStyle = 'rgba(255,248,220,0.35)'; ctx.fillRect(px, py, 2, 2);
  }
}
function wizSizeDraw(st) {
  const ph = st.ph, K = WIZSIZE, C2 = WIZSIZE_C, cx = st.cam.x, t = G.clock, F = K.floor;
  ctx.lineJoin = 'round';
  for (const r of ph.solids) {
    if (r.x1 < cx - 40 || r.x0 > cx + W + 40 || r.off) continue;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    if (r.kind === 'floor' || r.kind === 'shelf') { ctx.fillStyle = C2.floorDk; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.fillStyle = C2.floor; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 8); ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.fillRect(r.x0, r.y0 + 1, r.x1 - r.x0, 2);
      { const a = Math.max(r.x0, cx - 40), b = Math.min(r.x1, cx + W + 40); ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let y = r.y0 + 22; y < r.y1 - 4; y += 16) { ctx.moveTo(a, y); ctx.lineTo(b, y); }
        for (let x = Math.ceil(a / 90) * 90; x < b; x += 90) { ctx.moveTo(x, r.y0 + 8); ctx.lineTo(x, Math.min(r.y1, r.y0 + 22)); }
        ctx.stroke(); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(r.x0, r.y0); ctx.lineTo(r.x1, r.y0); ctx.stroke(); if (r.kind === 'shelf') { ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); } }
    else if (r.kind === 'ceil') { ctx.fillStyle = C2.wallDk; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
    else if (r.kind === 'mousewall') {
      ctx.fillStyle = C2.wall; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0 + 12); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0 + 12);
      ctx.fillStyle = C2.wallDk; for (let y = r.y0 + 20; y < r.y1; y += 30) ctx.fillRect(r.x0 + 2, y, r.x1 - r.x0 - 4, 3);
      ctx.fillStyle = '#1a1018'; ctx.beginPath(); ctx.arc((r.x0 + r.x1) / 2, F, 9, Math.PI, 0); ctx.fill();
    } else if (r.kind === 'book') {
      ctx.fillStyle = C2.book; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      const cols = ['#d86a5a', '#5aa8d8', '#e8c050', '#7ac070'];
      for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) { ctx.fillStyle = cols[(k + row) % 4]; ctx.fillRect(r.x0 + 5 + k * 8.5, r.y0 + 4 + row * 22, 6, 18); }
    } else if (r.kind === 'beam') { ctx.fillStyle = C2.wood || '#8a6a3e'; ctx.fillStyle = '#8a6a3e'; ctx.fillRect(r.x0, r.y1 - 26, r.x1 - r.x0, 26); ctx.strokeRect(r.x0, r.y1 - 26, r.x1 - r.x0, 26); ctx.fillStyle = '#6a4a2e'; ctx.fillRect(r.x0 + 12, r.y0, 16, r.y1 - r.y0 - 26); }
    else if (r.kind === 'web') { ctx.strokeStyle = C2.web; ctx.lineWidth = 1.5; for (let x = r.x0; x < r.x1; x += 16) { ctx.beginPath(); ctx.moveTo(x, r.y0); ctx.quadraticCurveTo(x + 8, r.y0 + 8, x + 16, r.y0); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(r.x0, r.y0); ctx.lineTo(r.x1, r.y0); ctx.stroke(); }
    else if (r.kind === 'plank') { ctx.fillStyle = C2.plank; ctx.fillRect(r.x0 - 6, r.y0, r.x1 - r.x0 + 12, r.y1 - r.y0); ctx.strokeRect(r.x0 - 6, r.y0, r.x1 - r.x0 + 12, r.y1 - r.y0); }
    else if (r.kind === 'junkbed') {
      ctx.fillStyle = C2.junkDk; ctx.fillRect(r.x0, F - 6, r.x1 - r.x0, r.y1 - F + 6);
      for (let x = r.x0 + 10; x < r.x1; x += 34) { const k = (x * 7) % 5; ctx.fillStyle = ['#8a7a6a', '#6a8a9a', '#9a6a7a', '#7a7a5a', '#5a6a8a'][k]; circle(x, F + 4 + (k % 3) * 8, 10 + k); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = C2.junk; ctx.fillRect(r.x0, F - 2, r.x1 - r.x0, 6);
    }
  }
  for (const pc of ph.pieces) {
    if (pc.lever) { const lv = pc.lever; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillStyle = '#c0b0d0'; ctx.fillRect(lv.x - 6, lv.y - 8, 12, 8); ctx.strokeRect(lv.x - 6, lv.y - 8, 12, 8); ctx.beginPath(); ctx.moveTo(lv.x, lv.y - 6); ctx.lineTo(lv.x + (lv.pulled ? 10 : -10), lv.y - 22); ctx.stroke(); ctx.fillStyle = lv.pulled ? '#9fe07f' : '#ff7a6a'; circle(lv.x + (lv.pulled ? 10 : -10), lv.y - 22, 4); ctx.fill(); ctx.stroke(); }
    if (pc.cat) wizSizeDrawCat(pc, t);
    if (pc.kind === 'door') { ctx.fillStyle = '#5a3a2a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(pc.x - 26, pc.y - 90, 52, 90, 20); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd23f'; circle(pc.x + 14, pc.y - 44, 4); ctx.fill(); }
    // the flag
    const fy = wizSizeFlagY(ph, pc.flag);
    if (pc.kind !== 'door') wizDrawFlag(pc.flag, fy, ph.pieces.indexOf(pc) <= ph.pc);
  }
}
// the SIZER in its size (drawn under the players, so a ZAPPER riding on a giant's head shows on top)
function wizSizeDrawSizer(st) {
  const ph = st.ph, K = WIZSIZE;
  if (ph.size === 'normal') return;
  const s = G.players[ph.siz], x = s.x + s.w / 2 + st.cam.x, y = s.y + s.h + st.cam.y;
  wizDrawHero(s.id, x, y, { s: K.box[ph.size][1] / 26, face: s.face || 1 });
}
function wizSizeDrawCat(pc, t) {
  const c = pc.cat, x = c.x, y = WIZSIZE.floor, open = c.eye > 0;
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  const br = open ? 0 : Math.sin(t * 1.6) * 3;
  ctx.fillStyle = '#e8a050'; ctx.beginPath(); ctx.ellipse(0, -60 - br, 130, 60 + br, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c87a30'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(k * 40, -100 - br, 8, 18, 0, 0, Math.PI * 2); ctx.fill(); }
  // the head
  ctx.fillStyle = '#e8a050'; circle(-120, -50, 44); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-150, -82); ctx.lineTo(-146, -112); ctx.lineTo(-124, -90); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-104, -88); ctx.lineTo(-90, -114); ctx.lineTo(-86, -82); ctx.fill(); ctx.stroke();
  if (open) { ctx.fillStyle = '#e8f070'; circle(-104, -56, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; ctx.fillRect(-106, -64, 4, 16); text('!', -104, -130, 34, '#ffd23f', 'center', 'title'); }
  else { ctx.beginPath(); ctx.moveTo(-114, -56); ctx.quadraticCurveTo(-104, -50, -94, -56); ctx.stroke(); text('z', -60 + Math.sin(t * 2) * 6, -130 - (t * 20 % 30), 18, 'rgba(255,255,255,0.7)', 'center', 'body'); }
  ctx.beginPath(); ctx.moveTo(-140, -56); ctx.quadraticCurveTo(-130, -50, -122, -56); ctx.stroke();
  // the tail
  ctx.lineWidth = 12; ctx.strokeStyle = '#e8a050'; ctx.beginPath(); ctx.moveTo(126, -20); ctx.quadraticCurveTo(170, -10 + Math.sin(t * 2) * 8, 160, -50); ctx.stroke();
  ctx.restore();
}
function wizSizeDrawTop(st) {
  const ph = st.ph, K = WIZSIZE, t = G.clock;
  if (!ph.pieces) return;
  const s = G.players[ph.siz], x = s.x + s.w / 2 + st.cam.x, y = s.y + s.h + st.cam.y;
  if (ph.size !== 'normal') {
    // the ring that runs down
    const [bw, bh] = K.box[ph.size], f = ph.sizeT / wizSizeLife(st), r = Math.max(bw, bh) * 0.7 + 8;
    ctx.save(); ctx.strokeStyle = ph.sizeT <= K.bell && Math.sin(t * 14) > 0 ? '#ffd23f' : WIZ_SPELLS.size.col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - bh / 2, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); ctx.restore();
  }
  // the armed arrow over the ZAPPER's wand
  if (ph.armed) {
    const z = G.players[ph.zap], zx = z.x + z.w / 2 + st.cam.x, zy = z.y + st.cam.y - 30, up = ph.armed === 'grow';
    ctx.save(); ctx.fillStyle = WIZ_SPELLS.size.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); if (up) { ctx.moveTo(zx, zy - 14); ctx.lineTo(zx + 10, zy); ctx.lineTo(zx - 10, zy); } else { ctx.moveTo(zx, zy + 4); ctx.lineTo(zx + 10, zy - 10); ctx.lineTo(zx - 10, zy - 10); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    text(up ? 'GROW' : 'SHRINK', zx, zy - 20, 12, '#ffffff', 'center', 'body'); ctx.restore();
  }
}

WIZ_PHASES.size = {
  setup(st, L) { wizSizeSetup(st, L); },
  step(st, dt) { wizSizeStep(st, dt); },
  coast(st, dt) { wizSizeCoast(st, dt); },
  plan(st) { return wizSizePlan(st); },
  hide(st) { const ph = st.ph; if (!ph.pieces) return false; return [0, 1].map(id => id === ph.siz && ph.size !== 'normal'); },
  plainHero(st, p) { const ph = st.ph; return !!ph.pieces && p.id === ph.siz && ph.size !== 'normal'; },
  headLift(st, p) { const ph = st.ph; if (!ph.pieces || p.id !== ph.siz) return 0; return ph.size === 'giant' ? 40 : ph.size === 'tiny' ? -16 : 0; },
  labels(st) { const ph = st.ph, w = { normal: 'pull', tiny: 'pull', giant: 'lift' }; return [0, 1].map(id => (id === ph.zap ? 'zap' : w[ph.size])); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.zap ? 'Zap!' : 'Size!')); },
  legend(st) {
    const ph = st.ph, c = k => (k ? '<kbd>↑</kbd> grow, <kbd>↓</kbd> shrink, then zap' : '<kbd>W</kbd> grow, <kbd>S</kbd> shrink, then zap');
    return { pip: ph.zap === 0 ? c(0) : 'tiny or giant', bo: ph.zap === 1 ? c(1) : 'tiny or giant', pad: 'zapper: stick up / down arms the wand,' };
  },
  hudText(st) { const ph = st.ph; return 'Room ' + (ph.room + 1) + ' of 3'; },
  progress(st) { const ph = st.ph; return { n: ph.room, of: 3 }; },
  drawBack(st) { wizSizeDrawBack(st); },
  draw(st) { wizSizeDraw(st); wizSizeDrawSizer(st); },
  drawTop(st) { wizSizeDrawTop(st); },
  statLine(st) { const s = st.stats.size; return s && s.zaps ? s.zaps + ' zaps' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizSizeArm = function () { this.tone(1000, 0.04, 'square', 0.02); };
Sfx.extra.wizSizeGrow = function () { this.tone(200, 0.4, 'sawtooth', 0.03, 90); };
Sfx.extra.wizSizeShrink = function () { this.tone(600, 0.3, 'sine', 0.04, 1800); };
Sfx.extra.wizSizeNormal = function () { this.tone(700, 0.12, 'sine', 0.03, 400); };
Sfx.extra.wizSizeTick = function () { this.tone(1500, 0.04, 'triangle', 0.025); };
Sfx.extra.wizSizeLever = function () { this.tone(300, 0.06, 'square', 0.03, 200); [523, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.035, null, 0.06 + i * 0.07)); };
Sfx.extra.wizSizeShove = function () { this.tone(90, 0.12, 'sawtooth', 0.02, 70); };
Sfx.extra.wizSizeLift = function () { this.tone(300, 0.15, 'triangle', 0.035, 600); };
Sfx.extra.wizSizeMeow = function () { this.tone(700, 0.25, 'sine', 0.035, 500); };
Sfx.extra.wizSizeSwat = function () { this.tone(160, 0.12, 'square', 0.04, 90); };

/* ---------- the room ---------- */
wizRoom('size', {
  act: { label: 'zap', labels: ['zap', 'pull'] },
  tip: 'The zapper presses up (grow) or down (shrink), then the action, to change the partner\'s size!',
  legend: { pip: '<kbd>W</kbd> grow, <kbd>S</kbd> shrink, then zap', bo: 'tiny or giant', pad: 'zapper: stick up / down arms the wand,' },
  map: WIZ_EMPTY_MAP,
});
