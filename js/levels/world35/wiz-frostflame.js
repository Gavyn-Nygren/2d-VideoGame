/* Pip & Bo - Level 35-1 Moonwick Academy: class 7 'frostflame' (Frost and Flame, spells Frost / Flame). */
'use strict';

/* ===== 35-1 class 7: Frost and Flame (WIZ_PHASES.frostflame) =====================================================
   Across the moat, through the greenhouse and the ice house, scrolling right. Both run and jump the same course; one
   only has frost, the other only flame, and the path needs both in turn.

   THE TWO JOBS (room field `first` is the first FROST; they clink wands and swap elements at the two doors)
   - FROST (action word "frost"): a press freezes the water tile ahead and the one underfoot into an ice slab for
     WIZFF.ice s (it cracks for the last second and melts); HOLDING the action lays a running bridge as they walk. It
     also freezes a snapping plant shut (WIZFF.plantT s), puts out fire tiles and freezes a geyser into a pillar to
     climb (as long as an ice slab).
   - FLAME (action word "flame"): a jet WIZFF.jet px long while the action is held. It burns away thorn walls
     (WIZFF.burn s of flame), lights lamp bowls (the greenhouse door opens) and melts ice walls. It also melts ice
     slabs and pillars at once, so aim matters: burning the bridge under someone dunks them ("Sizzle!").
   So nobody clears a part alone: every part has a frost-only thing and a flame-only thing.

   PARTS (each ends at a door where the elements swap; flags at every piece's start):
     1 the Moat         a pool to bridge; a wide pool with a thorn raft in the middle.
     2 the Greenhouse   a snapping plant (opens its mouth 0.8 s first, then spits a walker back 2 tiles, no Oops), a
                        thorn wall, a strip of fire tiles (a burn spits you back), a lamp bowl beside a shut door.
     3 the Ice House    a geyser under a high ledge (freeze it, climb the pillar), an ice wall on the ledge, a last
                        pool with an ice wall on an island.
   Fails: into the water = a splash, an Oops, back to the piece's dry flag. GOLD HELP after WIZ.goldAfter Oops in one
   part: ice lasts WIZFF.goldIce s (announced).
   Stats (st.stats.frostflame): frosts, burns, splashes.   Names: wizFF* / WIZFF*. */
const WIZFF = {
  floor: 430, tile: 40, depth: 120,
  ice: 5, goldIce: 9, crack: 1.5, plantT: 5, jet: 120, burn: 0.8, holdEvery: 0.12,
  plant: { reach: 34, warn: 0.8, kick: 80 }, ledge: 150, pillar: 9,
};
const WIZFF_NEWS = ['Part 1, the Moat: FROST lays the bridge, FLAME burns the thorns on the raft.', 'Part 2, the Greenhouse: freeze the snapper, burn the thorns, frost the fire, light the lamp!', 'Part 3, the Ice House: freeze the geyser, climb, and melt the ice walls.'];
const WIZFF_C = { water: 'rgba(70,140,210,0.6)', waterTop: '#9fd4ff', ice: '#dff4ff', iceDk: '#8fc8e8', thorn: '#4a7a3a', thornDk: '#2a4a22', stone: '#7a8aa0', stoneDk: '#4e5a70', glass: 'rgba(160,220,200,0.12)' };

function wizFFSetup(st, L) {
  const ph = st.ph, K = WIZFF, F = K.floor;
  ph.frost = L.def.first || 0; ph.flame = 1 - ph.frost;
  ph.t = 0; ph.part = 0; ph.pc = 0; ph.jetT = [0, 0]; ph.holdT = 0; ph.gold = false; ph.done = false; ph.swapT = 0;
  ph.pools = []; ph.solids = []; ph.pieces = []; ph.burnFx = [];
  const S = ph.solids, P = ph.pieces;
  const pool = (x0, x1, part) => { const o = { x0, x1, n: Math.round((x1 - x0) / K.tile), ice: [], part }; for (let i = 0; i < o.n; i++) o.ice.push(0); ph.pools.push(o); S.push({ x0, y0: F + K.depth, x1, y1: F + K.depth + 40, kind: 'bed' }); return o; };
  const thorn = (x, y = F) => { const r = { x0: x, y0: y - 150, x1: x + 22, y1: y, kind: 'thorn', burn: 0 }; S.push(r); return r; };
  const icewall = (x, y = F) => { const r = { x0: x, y0: y - 150, x1: x + 26, y1: y, kind: 'icewall', burn: 0 }; S.push(r); return r; };
  // the course, laid out piece by piece from x (each piece: its flag on dry ground, then the thing)
  let x = 200, part = 0;
  ph.doors = [];
  const add = (kind, w) => {
    if (kind === 'water' || kind === 'raft' || kind === 'rafti') {
      const o = pool(x + 160, x + 160 + w, part), pc = { kind: kind === 'water' ? 'water' : 'raft', part, flag: x + 60, pool: o };
      if (kind !== 'water') { const m = x + 160 + Math.round(w / 2 / K.tile) * K.tile; pc.island = { x0: m - 40, x1: m + 80 }; S.push({ x0: pc.island.x0, y0: F - 4, x1: pc.island.x1, y1: F + 30, kind: 'raft' }); pc.thorn = kind === 'raft' ? thorn(pc.island.x1 - 30, F - 4) : icewall(pc.island.x1 - 34, F - 4); }
      P.push(pc); x += 160 + w + 40;
    } else if (kind === 'plant') { P.push({ kind, part, flag: x + 60, plant: { x: x + 260, frozen: 0, mouth: 0, snapT: 0 } }); x += 360; }
    else if (kind === 'thorn') { P.push({ kind, part, flag: x + 60, thorn: thorn(x + 220) }); x += 320; }
    else if (kind === 'fire') { P.push({ kind, part, flag: x + 60, fire: { x0: x + 180, x1: x + 340, out: [false, false, false, false] } }); x += 400; }
    else if (kind === 'lamp') { const d = { x0: x + 240, y0: F - 160, x1: x + 260, y1: F, kind: 'gdoor' }; S.push(d); P.push({ kind, part, flag: x + 60, lamp: { x: x + 200, y: F - 60, lit: false }, door: d }); x += 340; }
    else if (kind === 'geyser') {
      const ledgeY = F - K.ledge, lx = x + 260;
      S.push({ x0: lx, y0: ledgeY, x1: lx + 360, y1: F, kind: 'ledge' });
      P.push({ kind: 'geyser', part, flag: x + 60, geyser: { x: x + 234, ice: 0, y: F - 90 }, ledgeY });
      P.push({ kind: 'icewall', part, flag: lx + 40, wall: icewall(lx + 200, ledgeY), y: ledgeY });
      x += 260 + 360 + 60;
    } else if (kind === 'door') { P.push({ kind, part, flag: x + 60, x: x + 180 }); ph.doors.push(x + 180); x += 260; part++; }
  };
  [['water', 240], ['raft', 480], ['water', 320], ['raft', 400], ['door'],
   ['plant'], ['thorn'], ['fire'], ['plant'], ['lamp'], ['fire'], ['thorn'], ['door'],
   ['geyser'], ['water', 280], ['rafti', 440], ['geyser'], ['door']].forEach(([k, w]) => add(k, w));
  ph.end = ph.doors[2];
  // the floor, with the pools cut out
  const cuts = ph.pools.slice().sort((a, b) => a.x0 - b.x0);
  let fx = -40;
  for (const c of cuts) { S.push({ x0: fx, y0: F, x1: c.x0, y1: F + 300, kind: 'floor' }); fx = c.x1; }
  S.push({ x0: fx, y0: F, x1: ph.end + 300, y1: F + 300, kind: 'floor' });
  S.push({ x0: -40, y0: -400, x1: 0, y1: 800, kind: 'edge' }, { x0: ph.end + 200, y0: -400, x1: ph.end + 240, y1: 800, kind: 'edge' });
  const ps = G.players;
  Object.assign(ps[ph.frost], { x: 140 - ps[0].w / 2, y: F - ps[0].h, vx: 0, vy: 0, grounded: true, face: 1, alive: true });
  Object.assign(ps[ph.flame], { x: 90 - ps[1].w / 2, y: F - ps[1].h, vx: 0, vy: 0, grounded: true, face: 1, alive: true });
  st.cam = { x: 0, y: 0 };
  const s = wizStats(st); Object.assign(s, { frosts: s.frosts || 0, burns: s.burns || 0, splashes: s.splashes || 0 });
  Object.assign(st.hm, { x: 760, y: 110, s: 0.75, face: -1, pose: 'talk' });
  wizSay(st, 'Frost and Flame! One of you freezes, one of you burns.', 3);
  wizNews(st, WIZFF_NEWS[0]);
}
const wizFFPc = ph => ph.pieces[Math.min(ph.pc, ph.pieces.length - 1)];
const wizFFIceLife = st => (st.ph.gold ? WIZFF.goldIce : WIZFF.ice);
const wizFFPoolAt = (ph, x) => ph.pools.find(o => x > o.x0 && x < o.x1) || null;
// the ice slabs and the geyser pillar as solids (rebuilt each tick)
function wizFFSolids(ph) {
  const K = WIZFF, F = K.floor, out = ph.solids.filter(r => !r.off);
  for (const o of ph.pools) for (let i = 0; i < o.n; i++) if (o.ice[i] > 0) out.push({ x0: o.x0 + i * K.tile, y0: F, x1: o.x0 + (i + 1) * K.tile, y1: F + 16, kind: 'ice', pool: o, i });
  for (const pc of ph.pieces) if (pc.geyser && pc.geyser.ice > 0) out.push({ x0: pc.geyser.x - 22, y0: pc.geyser.y, x1: pc.geyser.x + 22, y1: F, kind: 'pillar' });
  return out;
}
function wizFFFreezeAt(st, x) {
  const ph = st.ph, o = wizFFPoolAt(ph, x);
  if (!o) return false;
  const i = Math.floor((x - o.x0) / WIZFF.tile);
  if (i < 0 || i >= o.n) return false;
  const was = o.ice[i] > 0; o.ice[i] = wizFFIceLife(st);
  return !was;
}
// FROST's press (or a held step): the tile ahead and underfoot, and whatever frost answers nearby
function wizFFFrost(st, p, press) {
  const ph = st.ph, K = WIZFF, F = K.floor, cx = p.x + p.w / 2, f = p.face || 1;
  let any = false;
  if (wizFFFreezeAt(st, cx + f * 30)) any = true;
  if (wizFFFreezeAt(st, cx)) any = true;
  if (!press) { if (any) Sfx.play('wizFFIce'); return; }
  for (const pc of ph.pieces) {
    if (pc.plant && Math.abs(pc.plant.x - cx) < 90) { pc.plant.frozen = K.plantT; pc.plant.mouth = 0; any = true; wizPop(st, pc.plant.x, F - 80, 'Frozen shut!', '#dff4ff', 14); }
    if (pc.fire) pc.fire.out.forEach((o, k) => { const tx = pc.fire.x0 + (k + 0.5) * K.tile; if (!o && Math.abs(tx - (cx + f * 24)) < 46) { pc.fire.out[k] = true; any = true; puff(tx, F - 10, 6, 'rgba(220,240,255,0.9)'); } });
    if (pc.geyser && Math.abs(pc.geyser.x - cx) < 90 && p.y + p.h > F - 10) {
      const g = pc.geyser; g.ice = Math.max(WIZFF.pillar, wizFFIceLife(st)); any = true;   // (a pillar lasts long enough for both to climb with careful jumps)
      // (anyone standing in the spout rides the new pillar up)
      for (const q of G.players) if (q.x + q.w > g.x - 22 && q.x < g.x + 22 && q.y + q.h > g.y) Object.assign(q, { y: g.y - q.h, vy: 0, grounded: true });
    }
  }
  wizStats(st).frosts++;
  wizSparks(cx + f * 30, F - 6, 'frost', 8);
  Sfx.play(any ? 'wizFFIce' : 'wizFFFizz');
}
// FLAME's jet, this tick: thorns and ice walls burn, lamps light, ice melts
function wizFFFlame(st, p, dt) {
  const ph = st.ph, K = WIZFF, F = K.floor, cx = p.x + p.w / 2, f = p.face || 1;
  const a = f > 0 ? cx + 6 : cx - 6 - K.jet, b = a + K.jet, y0 = p.y - 10, y1 = p.y + p.h + 6;
  for (const r of ph.solids) {
    if (r.off || (r.kind !== 'thorn' && r.kind !== 'icewall')) continue;
    if (r.x1 > a && r.x0 < b && r.y1 > y0 && r.y0 < y1) {
      r.burn += dt;
      if (Math.random() < 0.3) puff(r.x0 + Math.random() * (r.x1 - r.x0), r.y1 - Math.random() * 120, 4, r.kind === 'thorn' ? 'rgba(255,140,60,0.9)' : 'rgba(200,240,255,0.9)');
      if (r.burn >= K.burn) { r.off = true; wizStats(st).burns++; Sfx.play(r.kind === 'thorn' ? 'wizFFBurn' : 'wizFFMelt'); wizPop(st, (r.x0 + r.x1) / 2, r.y0 + 20, r.kind === 'thorn' ? 'Crackle!' : 'Drip drip!', '#ffb070', 16); }
    }
  }
  for (const o of ph.pools) for (let i = 0; i < o.n; i++) {
    const t0 = o.x0 + i * K.tile;
    if (o.ice[i] > 0 && t0 + K.tile > a && t0 < b && F > y0 - 30 && F < y1 + 30) { o.ice[i] = 0; puff(t0 + 20, F, 5, 'rgba(220,240,255,0.8)'); Sfx.play('wizFFMelt'); }
  }
  for (const pc of ph.pieces) {
    if (pc.lamp && !pc.lamp.lit && pc.lamp.x > a - 10 && pc.lamp.x < b + 10 && Math.abs(pc.lamp.y - (p.y + p.h / 2)) < 60) { pc.lamp.lit = true; pc.door.off = true; Sfx.play('wizFFLamp'); wizPop(st, pc.lamp.x, pc.lamp.y - 30, 'The door opens!', '#ffd23f', 16); }
    if (pc.geyser && pc.geyser.ice > 0 && pc.geyser.x > a && pc.geyser.x < b) { pc.geyser.ice = 0; Sfx.play('wizFFMelt'); }
  }
}
// the piece is done?
function wizFFPieceDone(ph, pc) {
  const ps = G.players, past = x => ps.every(p => p.x + p.w / 2 > x && p.grounded);
  switch (pc.kind) {
    case 'water': return past(pc.pool.x1 + 10);
    case 'raft': return pc.thorn.off && past(pc.pool.x1 + 10);
    case 'plant': return past(pc.plant.x + 40);
    case 'thorn': return pc.thorn.off;
    case 'fire': return past(pc.fire.x1 + 10);
    case 'lamp': return pc.lamp.lit;
    case 'geyser': return ps.every(p => p.y + p.h <= pc.ledgeY + 2 && p.grounded);
    case 'icewall': return pc.wall.off;
    case 'door': return ps.every(p => p.x + p.w / 2 > pc.x - 60);
  }
  return false;
}
// the geyser piece whose ledge somebody still has to climb (a fall from it sends the plan back there)
function wizFFGeyserPc(ph) {
  const gp = ph.pieces.slice(0, ph.pc + 1).reverse().find(q => q.geyser);
  if (!gp) return null;
  const lx = gp.geyser.x + 26, ps = G.players;
  if (gp === wizFFPc(ph)) return gp;
  return ps.some(p => p.grounded && p.y + p.h > gp.ledgeY + 4 && p.x + p.w / 2 < lx + 360 && p.x + p.w / 2 > gp.geyser.x - 300) ? gp : null;
}
function wizFFPlan(st) {
  const ph = st.ph, K = WIZFF, F = K.floor, ps = G.players, fr = ps[ph.frost], fl = ps[ph.flame], out = [null, null];
  let pc = wizFFPc(ph);
  const fcx = fr.x + fr.w / 2, lcx = fl.x + fl.w / 2;
  // somebody fell off (or never got up) an ice house ledge they still need: back to its geyser
  const gp = wizFFGeyserPc(ph);
  if (gp) pc = gp;
  let A = { why: 'walk', x: fcx + 200 }, B = { why: 'walk', x: lcx + 200 };   // A: FROST, B: FLAME
  const near = Math.abs(fcx - lcx) < 90;
  switch (pc.kind) {
    case 'water': case 'raft': {
      const o = pc.pool, island = pc.island || null;
      const thornUp = island && !pc.thorn.off;
      // FROST bridges ahead when FLAME is close; FLAME follows a step behind (never ahead of the ice)
      const goal = thornUp ? island.x0 + 30 : o.x1 + 70;
      if (fcx < o.x0 - 10 && !near) A = { why: 'wait', x: o.x0 - 20 };
      else A = { why: 'bridge', x: fcx > o.x0 && fcx - lcx > 80 ? fcx : goal, hold: fcx < goal - 10 && fcx > o.x0 - 44 };   // (on the bridge: waits for FLAME to catch up)
      B = { why: 'follow', x: Math.min(fcx - 34, goal - 34) };
      if (thornUp && fcx > island.x0 + 4 && lcx > island.x0 - 4) B = { why: 'burn', x: island.x0 + 24, hold: true };
      if (thornUp && fcx > island.x0) { A = { why: 'wait', x: island.x0 + 46 }; if (lcx < island.x0 + 4) B = { why: 'follow', x: island.x0 + 24 }; }
      // FLAME left behind (the ice melted under them, or they lagged): FROST comes back for them, laying ice that way
      // (or the ice between them is melting and FLAME won't step on it)
      const ti = Math.floor((lcx + 20 - o.x0) / WIZFF.tile), weak = ti >= 0 && ti < o.n && o.ice[ti] <= 1.2;
      if (lcx < o.x1 + 4 && fl.grounded && (Math.abs(fcx - lcx) > 110 || (weak && fcx - lcx > 60))) A = { why: 'bridge', x: lcx + (fcx > lcx ? 44 : -44), hold: true, back: true };
      break;
    }
    case 'plant': {
      const pl = pc.plant;
      A = pl.frozen > 1.5 ? { why: 'walk', x: pl.x + 90 } : { why: 'freeze', x: pl.x - 64, tap: Math.abs(fcx - (pl.x - 64)) < 20 };
      B = pl.frozen > 1.5 ? { why: 'walk', x: pl.x + 60 } : { why: 'wait', x: pl.x - 110 };
      break;
    }
    case 'thorn': A = { why: 'wait', x: pc.thorn.x0 - 120 }; B = { why: 'burn', x: pc.thorn.x0 - 70, hold: Math.abs(lcx - (pc.thorn.x0 - 70)) < 30 }; break;
    case 'fire': {
      const nx = pc.fire.out.findIndex(o => !o), fx = nx < 0 ? pc.fire.x1 + 80 : pc.fire.x0 + nx * K.tile - 26;
      A = { why: 'freeze', x: fx, tap: nx >= 0 && Math.abs(fcx - fx) < 12 };
      B = { why: 'follow', x: Math.min(fcx - 30, nx < 0 ? pc.fire.x1 + 40 : pc.fire.x0 - 40) };
      break;
    }
    case 'lamp': A = { why: 'wait', x: pc.lamp.x - 110 }; B = { why: 'burn', x: pc.lamp.x - 70, hold: Math.abs(lcx - (pc.lamp.x - 70)) < 20 }; break;
    case 'geyser': {
      const g = pc.geyser, up = p => p.y + p.h <= pc.ledgeY + 2;
      if (g.ice <= 1.2 && (!up(fr) || !up(fl))) A = { why: 'freeze', x: g.x - 50, tap: Math.abs(fcx - (g.x - 50)) < 14 && (Math.abs(lcx - fcx) < 120 || up(fl)) };
      else A = { why: 'climb', x: up(fr) ? g.x + 160 : g.x, up: true };
      B = up(fl) ? { why: 'walk', x: g.x + 110 } : g.ice > 1.2 ? { why: 'climb', x: g.x, up: true } : { why: 'wait', x: g.x - 90 };
      break;
    }
    case 'icewall': A = { why: 'wait', x: pc.wall.x0 - 120 }; B = { why: 'burn', x: pc.wall.x0 - 70, hold: Math.abs(lcx - (pc.wall.x0 - 70)) < 30 }; break;
    case 'door': A = { why: 'door', x: pc.x - 20 }; B = { why: 'door', x: pc.x - 30 }; break;
  }
  out[ph.frost] = A; out[ph.flame] = B;
  return out;
}
function wizFFPop(st, p, word) {
  const ph = st.ph, pc = wizFFPc(ph), F = WIZFF.floor;
  const to = { x: pc.flag - (p.id === ph.flame ? 40 : 0), y: pc.kind === 'icewall' ? pc.y : F };
  if (!wizOops(st, p, { word, kind: 'splash', to })) Object.assign(p, { x: to.x - p.w / 2, y: to.y - p.h, vx: 0, vy: 0 });
  wizStats(st).splashes++;
  st.cam.x = Math.min(st.cam.x, to.x - 200);
  const n = wizMiss(st, 'p' + pc.part);
  if (n >= WIZ.goldAfter && wizGoldOnce(st, 'ff' + pc.part, 'Gold frost! Ice lasts ' + WIZFF.goldIce + ' s now.')) ph.gold = true;
}
function wizFFStep(st, dt) {
  const ph = st.ph, K = WIZFF, F = K.floor, ps = G.players, fr = ps[ph.frost], fl = ps[ph.flame];
  ph.t += dt;
  if (st.idle) { wizFFCoast(st, dt); return; }
  if (ph.swapT > 0) {
    ph.swapT -= dt;
    for (const p of ps) { p.vx = 0; p.pendingAct = false; p.pendingJump = false; }
    if (ph.swapT <= 0) { [ph.frost, ph.flame] = [ph.flame, ph.frost]; wizSwap(st); wizNews(st, WIZFF_NEWS[Math.min(2, wizFFPc(ph).part)]); Sfx.play('wizFFClink'); }
    wizFFCam(st, dt); return;
  }
  // the ice melts, the plant thaws
  for (const o of ph.pools) for (let i = 0; i < o.n; i++) if (o.ice[i] > 0) { const was = o.ice[i]; o.ice[i] = Math.max(0, o.ice[i] - dt); if (was > K.crack && o.ice[i] <= K.crack) Sfx.play('wizFFCrack'); }
  for (const pc of ph.pieces) {
    if (pc.geyser && pc.geyser.ice > 0) pc.geyser.ice = Math.max(0, pc.geyser.ice - dt);
    if (pc.plant) pc.plant.frozen = Math.max(0, pc.plant.frozen - dt);
  }
  // FROST: a press, or the held action laying a bridge as they walk
  if (fr.pendingAct) { fr.pendingAct = false; wizFFFrost(st, fr, true); ph.holdT = K.holdEvery; }
  else if (fr.input.act && (ph.holdT -= dt) <= 0) { ph.holdT = K.holdEvery; wizFFFrost(st, fr, false); }
  // FLAME: the jet while held
  fl.pendingAct = false;
  ph.jetT[fl.id] = fl.input.act ? Math.min(1, ph.jetT[fl.id] + dt) : 0;
  if (fl.input.act) { wizFFFlame(st, fl, dt); if (Math.floor(ph.t * 8) !== Math.floor((ph.t - dt) * 8)) Sfx.play('wizFFJet'); }
  // moving
  const sol = wizFFSolids(ph);
  for (const p of ps) {
    const before = p.ground;
    wizBody(p, dt, sol);
    if (p.x < st.cam.x) { p.x = st.cam.x; p.vx = Math.max(0, p.vx); } else if (p.x > st.cam.x + W - p.w) { p.x = st.cam.x + W - p.w; p.vx = Math.min(0, p.vx); }
    void before;
  }
  // hazards: the plant, the fire, the water
  const pc = wizFFPc(ph);
  for (const q of ph.pieces) {
    if (q.plant) wizFFPlant(st, dt, q.plant);
    if (q.fire) for (const p of ps) {
      const cx = p.x + p.w / 2;
      if (p.y + p.h >= F - 2 && cx > q.fire.x0 && cx < q.fire.x1 && !q.fire.out[Math.floor((cx - q.fire.x0) / K.tile)]) { knock(p, -260, -320, 0.3, 0); wizPop(st, cx, p.y - 20, 'Hot! Frost it first.', '#ffb070', 16); Sfx.play('wizFFBurn'); }
    }
  }
  for (const p of ps) {
    const cx = p.x + p.w / 2, o = wizFFPoolAt(ph, cx);
    if (o && p.y + p.h > F + 24) {
      const melted = ph.jetT[fl.id] > 0 && p !== fl;
      wizFFPop(st, p, melted ? 'Sizzle! Splash!' : 'Splash!');
    }
  }
  // pieces
  if (pc && wizFFPieceDone(ph, pc)) {
    ph.pc++;
    if (pc.kind === 'door') {
      if (pc.part >= 2) { ph.done = true; wizPhaseDone(st, { say: 'Ice and fire, side by side. Frost and Flame are yours!' }); }
      else { ph.swapT = 1.2; wizSay(st, 'Clink! Swap your elements.', 2.4); }
    } else Sfx.play('wizFFDone');
  }
  wizFFCam(st, dt);
  wizFFHints(st);
}
function wizFFPlant(st, dt, pl) {
  const K = WIZFF, F = K.floor;
  if (pl.frozen > 0) { pl.mouth = 0; return; }
  pl.snapT = Math.max(0, pl.snapT - dt);
  const near = G.players.filter(p => Math.abs(p.x + p.w / 2 - pl.x) < K.plant.reach + 30 && p.y + p.h > F - 60);
  if (near.length && pl.snapT <= 0) {
    pl.mouth += dt;
    if (pl.mouth >= K.plant.warn) {
      for (const p of near) if (Math.abs(p.x + p.w / 2 - pl.x) < K.plant.reach + 14) { const d = p.x + p.w / 2 < pl.x ? -1 : 1; knock(p, d * 300, -300, 0.4, 0); wizPop(st, p.x + p.w / 2, p.y - 20, 'Snap! Freeze it first.', '#ffffff', 16); }
      Sfx.play('wizFFSnap'); pl.mouth = 0; pl.snapT = 0.8;
    }
  } else pl.mouth = Math.max(0, pl.mouth - dt);
}
function wizFFHints(st) {
  const ph = st.ph, P = wizFFPlan(st), A = P[ph.frost], B = P[ph.flame];
  if (!st.hints[ph.frost]) {
    if (A.why === 'bridge' && A.hold) wizHint(st, ph.frost, 'Hold ' + wizKey(ph.frost, 'act') + ' and walk: an ice bridge!', { cpu: 'Ice bridge coming up!' });
    else if (A.why === 'freeze' && A.tap) wizHint(st, ph.frost, 'Frost it! ' + wizKey(ph.frost, 'act'), { cpu: 'Freezing it!', life: 1.4 });
  }
  if (!st.hints[ph.flame] && B.why === 'burn' && B.hold) wizHint(st, ph.flame, 'Hold ' + wizKey(ph.flame, 'act') + ': flame!', { cpu: 'Fwoosh!', life: 1.4 });
}
function wizFFCam(st, dt) {
  const ph = st.ph, ps = G.players;
  const want = clamp((ps[0].x + ps[1].x) / 2 - W / 2 + 60, 0, ph.end + 200 - W);
  st.cam.x += (want - st.cam.x) * Math.min(1, (dt || 0) * 3); st.cam.y = 0;
  const c = st.hm;
  c.x += (st.cam.x + 820 - c.x) * Math.min(1, (dt || 0) * 2); c.y = 100 + Math.sin(ph.t * 0.9) * 8; c.face = -1;
  if (c.pose === 'talk' && !st.say) c.pose = 'idle';
}
function wizFFCoast(st, dt) {
  const ph = st.ph;
  if (!ph.pieces) { wizCoast(dt); return; }
  for (const p of G.players) { p.vx = 0; p.vy = 0; p.pendingJump = false; p.pendingAct = false; }
  wizFFCam(st, dt || 0);
}

/* ---------- drawing ---------- */
function wizFFDrawBack(st) {
  const ph = st.ph, cx = st.cam.x, F = WIZFF.floor, D = ph.doors || [0, 0, 0];
  wizScreen(st, () => wizDusk(G.clock, cx, 0, { skyY: 330 }));
  // greenhouse glass and ice house walls behind their parts
  ctx.fillStyle = WIZFF_C.glass; ctx.fillRect(Math.max(cx - 40, D[0]), 60, Math.min(D[1], cx + W + 40) - Math.max(cx - 40, D[0]), F - 60);
  ctx.strokeStyle = 'rgba(200,255,230,0.25)'; ctx.lineWidth = 2;
  for (let x = Math.max(D[0], Math.floor(cx / 80) * 80); x < Math.min(D[1], cx + W + 80); x += 80) { ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, F); ctx.stroke(); }
  if (cx + W > D[1]) { ctx.fillStyle = 'rgba(180,220,255,0.18)'; ctx.fillRect(D[1], 40, D[2] + 300 - D[1], F - 40); }
}
function wizFFDraw(st) {
  const ph = st.ph, K = WIZFF, C2 = WIZFF_C, cx = st.cam.x, t = G.clock, F = K.floor;
  ctx.lineJoin = 'round';
  for (const o of ph.pools) {
    if (o.x1 < cx - 40 || o.x0 > cx + W + 40) continue;
    ctx.fillStyle = C2.water; ctx.fillRect(o.x0, F, o.x1 - o.x0, K.depth);
    ctx.strokeStyle = C2.waterTop; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = o.x0; x <= o.x1; x += 10) { const y = F + 3 + Math.sin(t * 3 + x * 0.1) * 2; if (x === o.x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    for (let i = 0; i < o.n; i++) if (o.ice[i] > 0) {
      const x = o.x0 + i * K.tile, crack = o.ice[i] <= K.crack;
      ctx.fillStyle = C2.ice; ctx.strokeStyle = C2.iceDk; ctx.lineWidth = 2; ctx.fillRect(x + 1, F, K.tile - 2, 16); ctx.strokeRect(x + 1, F, K.tile - 2, 16);
      if (crack) { ctx.strokeStyle = '#5a8aa8'; ctx.beginPath(); ctx.moveTo(x + 8, F + 2); ctx.lineTo(x + 18, F + 9); ctx.lineTo(x + 14, F + 15); ctx.moveTo(x + 18, F + 9); ctx.lineTo(x + 30, F + 6); ctx.stroke(); }
    }
  }
  for (const r of ph.solids) {
    if (r.x1 < cx - 60 || r.x0 > cx + W + 60 || r.off) continue;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    if (r.kind === 'floor') {
      // (grass outside, stone in the ice house)
      const d = ph.doors[1], a0 = Math.min(r.x1, Math.max(r.x0, d));
      wizLawn(Math.max(r.x0, cx - 60), r.y0, Math.min(a0, cx + W + 60), r.y1, { top: '#5fae6a', body: '#3f6a4a' });
      ctx.fillStyle = C2.stoneDk; ctx.fillRect(a0, r.y0, r.x1 - a0, r.y1 - r.y0); ctx.fillStyle = C2.stone; ctx.fillRect(a0, r.y0, r.x1 - a0, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(a0, r.y0, r.x1 - a0, 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = Math.max(a0, Math.floor((cx - 60) / 48) * 48); x < Math.min(r.x1, cx + W + 60); x += 48) { ctx.moveTo(x, r.y0 + 8); ctx.lineTo(x, r.y0 + 30); ctx.moveTo(x + 24, r.y0 + 30); ctx.lineTo(x + 24, r.y0 + 54); }
      ctx.moveTo(Math.max(a0, cx - 60), r.y0 + 30); ctx.lineTo(Math.min(r.x1, cx + W + 60), r.y0 + 30); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    }
    else if (r.kind === 'raft') { ctx.fillStyle = '#9a6a3e'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 14); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, 14); }
    else if (r.kind === 'ledge') { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(r.x0 + 6, r.y1, r.x1 - r.x0 - 6, 6); ctx.fillStyle = C2.stoneDk; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.fillStyle = C2.stone; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 8); ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(r.x0 + 2, r.y0 + 2, r.x1 - r.x0 - 4, 2); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
    else if (r.kind === 'thorn') {
      const k = 1 - r.burn / WIZFF.burn;
      ctx.strokeStyle = C2.thornDk; ctx.lineWidth = 6; ctx.beginPath();
      for (let y = r.y1; y > r.y0; y -= 14) { ctx.moveTo(r.x0 + 4, y); ctx.lineTo(r.x1 - 4, y - 14 * k); }
      ctx.stroke(); ctx.fillStyle = C2.thorn;
      for (let y = r.y1 - 6; y > r.y0; y -= 18) { ctx.beginPath(); ctx.moveTo(r.x0, y); ctx.lineTo(r.x0 - 8, y - 4); ctx.lineTo(r.x0, y - 8); ctx.fill(); ctx.beginPath(); ctx.moveTo(r.x1, y - 9); ctx.lineTo(r.x1 + 8, y - 13); ctx.lineTo(r.x1, y - 17); ctx.fill(); }
    } else if (r.kind === 'icewall') { ctx.save(); ctx.globalAlpha = 1 - 0.6 * r.burn / WIZFF.burn; ctx.fillStyle = C2.ice; ctx.strokeStyle = C2.iceDk; ctx.lineWidth = 2.5; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.restore(); }
    else if (r.kind === 'gdoor') { ctx.fillStyle = '#6a8a7a'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
  }
  for (const pc of ph.pieces) {
    if (pc.plant) wizFFDrawPlant(pc.plant, t);
    if (pc.fire) pc.fire.out.forEach((o, k) => { const x = pc.fire.x0 + k * K.tile; ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x + 1, F - 4, K.tile - 2, 6); if (!o) { for (let j = 0; j < 3; j++) { const h = 16 + Math.sin(t * 12 + k * 3 + j) * 6; ctx.fillStyle = j === 1 ? '#ffd23f' : '#ff7a3a'; ctx.beginPath(); ctx.moveTo(x + 6 + j * 12, F - 2); ctx.quadraticCurveTo(x + 10 + j * 12, F - 2 - h, x + 14 + j * 12, F - 2); ctx.fill(); } } });
    if (pc.lamp) { const l = pc.lamp; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(l.x, F); ctx.lineTo(l.x, l.y + 10); ctx.stroke(); ctx.fillStyle = '#b08a50'; ctx.beginPath(); ctx.ellipse(l.x, l.y + 6, 16, 8, 0, 0, Math.PI); ctx.fill(); ctx.stroke(); if (l.lit) { ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.moveTo(l.x - 8, l.y + 4); ctx.quadraticCurveTo(l.x, l.y - 24 - Math.sin(t * 10) * 4, l.x + 8, l.y + 4); ctx.fill(); } }
    if (pc.geyser) {
      const g = pc.geyser;
      if (g.ice > 0) { ctx.fillStyle = WIZFF_C.ice; ctx.strokeStyle = WIZFF_C.iceDk; ctx.lineWidth = 2.5; ctx.fillRect(g.x - 22, g.y, 44, F - g.y); ctx.strokeRect(g.x - 22, g.y, 44, F - g.y); }
      else { const h = 60 + Math.sin(t * 9) * 16; ctx.fillStyle = 'rgba(170,220,255,0.75)'; ctx.beginPath(); ctx.moveTo(g.x - 12, F); ctx.quadraticCurveTo(g.x, F - h * 2, g.x + 12, F); ctx.fill(); }
      ctx.fillStyle = '#4e5a70'; ctx.fillRect(g.x - 16, F - 6, 32, 8);
    }
    if (pc.kind === 'door') { ctx.fillStyle = '#5a3a2a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(pc.x - 26, F - 90, 52, 90, 20); ctx.fill(); ctx.stroke(); }
    else wizDrawFlag(pc.flag, pc.kind === 'icewall' ? pc.y : F, ph.pieces.indexOf(pc) <= ph.pc);
  }
  // the flame jet
  const fl = G.players[ph.flame];
  if (fl.input.act && ph.swapT <= 0) {
    const x = fl.x + fl.w / 2 + st.cam.x, y = fl.y + fl.h / 2 + st.cam.y, f = fl.face || 1;
    ctx.save(); for (let k = 0; k < 6; k++) { const d = 14 + k * 18 + (t * 300 % 18); ctx.fillStyle = k < 2 ? '#ffe070' : '#ff8a3a'; ctx.globalAlpha = 0.85 - k * 0.12; circle(x + f * d, y + Math.sin(t * 30 + k) * 3, 7 + k * 1.5); ctx.fill(); } ctx.restore();
  }
}
function wizFFDrawPlant(pl, t) {
  const F = WIZFF.floor, x = pl.x, open = Math.min(1, pl.mouth / WIZFF.plant.warn), frozen = pl.frozen > 0;
  ctx.save(); ctx.translate(x, F); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3a6a2a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-10, -30, 0, -56); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink;
  ctx.fillStyle = frozen ? '#bfe8ff' : '#c84a6a';
  const a = 0.15 + open * 0.7;
  ctx.beginPath(); ctx.ellipse(0, -66, 26, 14, -a, Math.PI, 0); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -62, 26, 14, a, 0, Math.PI); ctx.fill(); ctx.stroke();
  if (open > 0.3 && !frozen) text('!', 0, -110, 26, '#ffd23f', 'center', 'title');
  if (frozen) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(-14, -70); ctx.lineTo(-6, -64); ctx.moveTo(8, -72); ctx.lineTo(14, -62); ctx.stroke(); }
  ctx.restore();
}

WIZ_PHASES.frostflame = {
  setup(st, L) { wizFFSetup(st, L); },
  step(st, dt) { wizFFStep(st, dt); },
  coast(st, dt) { wizFFCoast(st, dt); },
  plan(st) { return wizFFPlan(st); },
  labels(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.frost ? 'frost' : 'flame')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.frost ? 'Frost!' : 'Flame!')); },
  jobKeys(st) { return st.ph.frost === 1 ? ['flame', 'frost'] : ['frost', 'flame']; },
  legend(st) { const ph = st.ph; return { pip: ph.frost === 0 ? 'hold to lay ice' : 'hold to flame', bo: ph.frost === 1 ? 'hold to lay ice' : 'hold to flame', pad: 'hold the action to frost or flame,' }; },
  hudText(st) { const ph = st.ph; return 'Part ' + (Math.min(2, wizFFPc(ph).part) + 1) + ' of 3'; },
  progress(st) { const ph = st.ph; return { n: Math.min(3, wizFFPc(ph).part + (ph.done ? 1 : 0)), of: 3 }; },
  drawBack(st) { wizFFDrawBack(st); },
  draw(st) { wizFFDraw(st); },
  statLine(st) { const s = st.stats.frostflame; return s && s.frosts ? s.frosts + ' frosts, ' + s.burns + ' burns' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizFFIce = function () { this.tone(1600, 0.08, 'triangle', 0.03, 2400); };
Sfx.extra.wizFFFizz = function () { this.tone(900, 0.06, 'sine', 0.015, 600); };
Sfx.extra.wizFFCrack = function () { this.tone(2400, 0.04, 'square', 0.015, 1200); };
Sfx.extra.wizFFJet = function () { this.tone(140, 0.12, 'sawtooth', 0.015, 90); };
Sfx.extra.wizFFBurn = function () { this.tone(300, 0.2, 'sawtooth', 0.025, 80); };
Sfx.extra.wizFFMelt = function () { this.tone(700, 0.15, 'sine', 0.025, 300); };
Sfx.extra.wizFFLamp = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.035, null, i * 0.07)); };
Sfx.extra.wizFFSnap = function () { this.tone(220, 0.08, 'square', 0.04, 110); };
Sfx.extra.wizFFClink = function () { this.tone(1800, 0.15, 'triangle', 0.035); };
Sfx.extra.wizFFDone = function () { this.tone(660, 0.1, 'triangle', 0.03, 880); };

/* ---------- the room ---------- */
wizRoom('frostflame', {
  jobs: {
    frost: { title: 'Frost', act: 'frost', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
      howTo: ['Hold frost to lay an ice bridge as you walk. It freezes plants and fire too.'] },
    flame: { title: 'Flame', act: 'flame', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
      howTo: ['Hold flame to burn thorns, light lamps and melt ice. Not the ice bridge!'] },
  },
  act: { label: 'frost', labels: ['frost', 'flame'] },
  tip: 'Hold the action! Frost lays ice over water and freezes plants and fire; flame burns thorns and lights lamps.',
  legend: { pip: 'hold to lay ice', bo: 'hold to flame', pad: 'hold the action to frost or flame,' },
  map: WIZ_EMPTY_MAP,
});
