/* Pip & Bo - World 41, level 4: Paper Alien Invasion (mode 'popaliens'). Gavyn's own idea (2026-11-17).

   A paper flying saucer pops out of the storybook's space page and shrinks Pip and Bo to the size of ants. Flat paper
   cut-out aliens march across the page. The pair have ten minutes to march to the bunker drawn at the far edge, side by
   side, with a little card ray gun each and the odd cosmic grenade. One continuous march in four stretches (the
   Margin Fields, Letter City, the Ink Crater, Bunker Hill): no room cards, no cuts, no swaps. Both heroes do the same
   job from start to finish.

   Files:
     js/levels/world41/popaliens-route.js        the route: stretches, checkpoints, solids, alien events, pickups (data)
     js/levels/world41/paper-alien-invasion.js   this file: the rules, the HUD, the sounds, the level def (no three.js)
     js/levels/world41/popaliens-outfits.js      the 3D space ranger outfits and ray guns     } loaded on demand with
     js/levels/world41/popaliens-aliens.js       the flat cut-out aliens, saucer and effects  } the 3D kit (K3D.files)
     js/levels/world41/popaliens-scene.js        the page landscape, the camera, draw3d       }
     js/cpu/levels/world41/paper-alien-invasion.js   the computer partner (key 'popaliens')

   Buttons (Gavyn, 2026-11-17): fire = the action button (held: steady fire; keyboard F and /, controller right trigger),
   grenade = act2 (Q and ,; right bumper), reload = act3 (E and .; X). Reload is also the "use" button: holding it beside
   a flattened partner peels them up, and on the bunker hatch it opens the hatch. The gun reloads by itself at empty.

   Rules on the fixed DT clock only (K3D.noRender plays the same). Everything the picture needs that the rules make
   (scorches, crumples, confetti, crossed beams) goes into st.fx as numbered events; draw3d reads the new ones. Debris
   (balls, confetti) is drawing only and never touches the rules.
*/
'use strict';

const PA = {
  clock: 600, amber: 120, red: 30, rescueClock: 90,
  shrinkT: 3.4,                     // the shrink at the start (skippable with jump)
  // the ray gun
  boltSpeed: 34, boltRange: 16, heldGap: 0.25, tapGap: 0.2, charge: 24, reloadT: 1.0, autoReloadT: 1.5,
  aimBend: 12 * Math.PI / 180, aimCone: 25 * Math.PI / 180, aimStraight: 3.5 * Math.PI / 180,
  autoFaceT: 0.4, autoFaceR: 10, crossWin: 0.4, crossDmg: 3,
  // cosmic grenades
  grenMax: 3, throwDist: 7, flightT: 0.55, fuse: 0.8, burstR: 2.6, grenG: 20, pickR: 0.9,
  // getting flattened
  peelT: 1.0, peelR: 1.4, selfPeel: 12, invuln: 2, wipeT: 1.5, unpeelT: 2, unpeelFreeze: 1.1,
  // the march
  backWall: 6.5, topLimit: 12.5, sideX: 15, sepX: 14, sepZ: 9, line: 0.7,
  // aliens
  popShow: 1.0, popRise: 0.35, minSpawnD: 5, zapR: 3, zapWind: 0.8, zapStart: 2.6, zapCd: 2.6,
};
// each alien kind: hit points, hit radius, height (for the picture), walking speed, does it zap
const PA_KINDS = {
  grunt:   { hp: 2, r: 0.5, h: 1.3, speed: 1.5, zap: true },
  lesson:  { hp: 2, r: 0.5, h: 1.3, speed: 0.5, zap: true, zapR: 5, zapWind: 1.6, zapStart: 4.6, one: true },
  folder:  { hp: 1, r: 0.45, h: 1.0, speed: 1.2 },
  carrier: { hp: 2, r: 0.55, h: 1.1, speed: 1.1 },
  edger:   { hp: 2, r: 0.4, h: 2.0, speed: 1.2, zap: true },
  shield:  { hp: 2, r: 0.55, h: 1.3, speed: 1.1, zap: true },
  crab:    { hp: 3, r: 0.6, h: 0.9, speed: 1.6 },
  stamper: { hp: 10, r: 0.95, h: 2.6, speed: 0 },
};
const PA_TIPS = {
  fire: 'Hold the action to fire. Your gun reloads itself, but a quick reload in a quiet moment is faster.',
  grenade: 'You picked up a cosmic grenade! Throw it with the grenade button into a crowd.',
  peel: 'Flattened! Walk up to your partner and hold the reload button to peel them up.',
  cross: 'Shoot the same alien together: crossed beams hit three times as hard.',
};

/* ---------- a seeded random (the rules never use Math.random) ---------- */
function paRng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const paAng = a => Math.atan2(Math.sin(a), Math.cos(a));
const paDist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/* ---------- setting up ---------- */
function paSetup(st) {
  st.rng = paRng(4141);
  st.phase = 'shrink'; st.t = 0; st.clock = PA.clock; st.cz = 0; st.cx = 0;
  st.aliens = []; st.bolts = []; st.grens = []; st.holes = []; st.prints = []; st.drops = [];
  st.fx = []; st.fxN = 0; st.nextId = 1;
  st.evI = 0; st.block = null; st.wallDown = {};
  st.pickups = PA_ROUTE.pickups.map((p, i) => ({ id: 'p' + i, x: p.x, z: p.z, live: true, route: true }));
  st.ck = 0; st.saved = null; st.wipes = 0; st.wipesAt = {}; st.shieldTo = -1; st.rescues = 0; st.rescued = false; st.thin = false;
  st.kills = 0; st.crossKills = 0; st.peels = 0; st.selfPeels = 0; st.flats = {}; st.everFlat = false; st.thrown = 0;
  st.tipsSeen = {}; st.tip = null; st.say = null; st.wipe = null; st.flash = 0; st.wideT = 0; st.shake = 0;
  st.h = [0, 1].map(k => ({ k, aim: Math.PI, charge: PA.charge, reload: 0, reloadDur: 0, sinceShot: 9, gren: 0, flat: null,
    inv: 0, peel: 0, stillT: 0, holdAim: null, shield: 0, emptyShake: 0, freeze: 0, lastPress: 0 }));
  st.solids = PA_ROUTE.solids.map(s => Object.assign({}, s));
  paRebuildWorld(st);
  G.players.forEach((p, k) => { MOVER3.spawn(p, k ? 2.2 : -2.2, 0, 2.5); p.b3.heading = Math.PI; });
  paSave(st, 0);
  K3D.heading = 0;
}
// the mover's world: the page (one big floor) and the solids near the camera (rebuilt as it moves on)
function paRebuildWorld(st) {
  const near = st.solids.filter(s => !(s.block != null && st.wallDown[s.block]) && Math.abs(s.z - st.cz) < 40);
  st.w = MOVER3.world([{ x: 0, z: st.cz - 60, w: 80, d: 240, y0: -1, y1: 0 }].concat(near.map(s => ({ x: s.x, z: s.z, w: s.w, d: s.d, y0: 0, y1: s.h, rot: s.rot || 0, src: s }))));
  st.wAt = st.cz;
}
function paFx(st, kind, o) {
  st.fxN++;
  st.fx.push(Object.assign({ n: st.fxN, kind, t: G.time }, o));
  if (st.fx.length > 240) st.fx.splice(0, st.fx.length - 240);
}
function paTip(st, key) {
  if (st.tipsSeen[key]) return;
  st.tipsSeen[key] = true;
  st.tip = { text: PA_TIPS[key], t: 0, life: 6 };
}
function paSay(st, text, life = 4.5) { st.say = { text, t: 0, life }; Sfx.play('popaliensWorm'); }
const paStretch = z => { const s = PA_ROUTE.stretches.find(q => z <= q.z0 && z > q.z1); return s || PA_ROUTE.stretches[PA_ROUTE.stretches.length - 1]; };

/* ---------- checkpoints, wipe-outs, the clock rescue ---------- */
function paSave(st, i) {
  st.ck = i;
  st.saved = { i, gren: st.h.map(h => h.gren) };
  if (i > 0) { paFx(st, 'bookmark', { i }); Sfx.play('popaliensBookmark'); }
  // the Bookworm's thimbles (gold help) last three checkpoints after it was lent
  for (const h of st.h) h.shield = i <= st.shieldTo ? 1 : 0;
}
function paRestore(st, why) {
  const ck = PA_ROUTE.checks[st.ck];
  st.aliens = []; st.bolts = []; st.grens = []; st.holes = []; st.prints = []; st.drops = [];
  st.block = null;
  st.cz = ck.cz; st.cx = 0;
  // the events ahead of this checkpoint come again; walls ahead of it stand again; grenades ahead lie there again
  st.evI = PA_ROUTE.events.findIndex(ev => ev.at < ck.cz - 1e-6); if (st.evI < 0) st.evI = PA_ROUTE.events.length;
  PA_ROUTE.events.forEach((ev, i) => { if (ev.block && ev.at < ck.cz) delete st.wallDown[i]; });
  for (const p of st.pickups) if (p.route && p.z < ck.z) p.live = true;
  st.pickups = st.pickups.filter(p => p.route);
  st.thin = why === 'rescue';
  // a checkpoint inside a blockade (its event already passed, its wall still standing): the blockade starts again
  PA_ROUTE.events.forEach((ev, i) => {
    if (ev.block && i < st.evI && !st.wallDown[i] && !st.block) { st.block = { i, stop: ev.block.stop, wave: 0, waves: ev.block.waves }; st.blockAt = i; }
  });
  G.players.forEach((p, k) => {
    MOVER3.spawn(p, k ? 2.2 : -2.2, 0, ck.z - 1.5); p.b3.heading = Math.PI;
    const h = st.h[k];
    Object.assign(h, { aim: Math.PI, charge: PA.charge, reload: 0, sinceShot: 9, gren: st.saved ? st.saved.gren[k] : 0, flat: null,
      inv: PA.unpeelT, peel: 0, stillT: 0, holdAim: null, freeze: PA.unpeelFreeze, unpeel: PA.unpeelT });
    h.shield = st.ck <= st.shieldTo ? 1 : 0;
  });
  paRebuildWorld(st);
  if (st.block && st.blockAt != null) { paSpawnGroup(st, st.block.waves[0], st.block.i); st.blockAt = null; }
  paFx(st, 'restart', { why });
}
function paWipeout(st) {
  st.wipes++; st.wipesAt[st.ck] = (st.wipesAt[st.ck] || 0) + 1;
  Sfx.play('popaliensWipeout');
  paRestore(st, 'wipe');
  if (st.wipesAt[st.ck] >= 2 && st.shieldTo < st.ck) {
    // gold help, announced: a paper thimble for each hero that soaks up one hit, for this and the next three checkpoints
    st.shieldTo = st.ck + 3;
    for (const h of st.h) h.shield = 1;
    st.banner = { text: 'The Bookworm lent you his thimbles', gold: true, t: 0, life: 4 };
    Sfx.play('popaliensGold');
  }
}
function paRescue(st) {
  // at 0:00 the saucer stamps the page: back to the last checkpoint with 1:30 and fewer aliens (Bronze at best)
  st.rescues++; st.rescued = true;
  st.flash = 1.2;
  Sfx.play('popaliensSaucerLand');
  paRestore(st, 'rescue');
  st.clock = PA.rescueClock;
  st.banner = { text: 'The saucer landed! The Bookworm jammed it: 1:30 more', gold: true, t: 0, life: 4.5 };
}

/* ---------- flattening and peeling ---------- */
function paFlatten(st, k, why) {
  const h = st.h[k], p = G.players[k];
  if (h.flat || h.inv > 0 || st.phase !== 'march') return false;
  if (h.shield > 0) { h.shield = 0; h.inv = 1.0; paFx(st, 'thimble', { k }); Sfx.play('popaliensThimble'); return false; }
  h.flat = { t: 0, why, x: p.b3.x, z: p.b3.z };
  h.reload = 0; h.peel = 0; h.holdAim = null;
  p.b3.vx = 0; p.b3.vz = 0;
  st.everFlat = true;
  const sk = paStretch(p.b3.z).key; st.flats[sk] = (st.flats[sk] || 0) + 1;
  paFx(st, 'flatten', { k, why });
  Sfx.play('popaliensFlatten', k);
  if (why === 'zap' || why === 'lesson') paTip(st, 'peel');
  return true;
}
function paUnflatten(st, k, self) {
  const h = st.h[k];
  h.flat = null; h.inv = PA.invuln; h.unpeel = 0.5;
  if (self) st.selfPeels++; else st.peels++;
  paFx(st, 'peel', { k, self });
  Sfx.play('popaliensPeel', k);
}

/* ---------- aliens ---------- */
function paSpawn(st, sp, tag) {
  const K = PA_KINDS[sp.k];
  if (!K) return null;
  let x = clamp(sp.x, -PA.sideX + 0.5, PA.sideX - 0.5), z = sp.z;
  // never closer than 5 units to a hero, never behind the camera's back wall
  for (let it = 0; it < 6; it++) {
    const near = G.players.some(p => Math.hypot(p.b3.x - x, p.b3.z - z) < PA.minSpawnD);
    if (!near) break;
    z -= 2;
  }
  z = Math.min(z, st.cz + PA.backWall - 1);
  const a = { id: st.nextId++, k: sp.k, x, z, y: 0, vx: 0, vz: 0, hp: K.hp, st: 'pop', t: 0, face: 0, hold: sp.hold || 0,
    lastHit: [-9, -9], scorch: 0, zap: null, zapCd: 1 + st.rng() * 1.2, hopPh: st.rng() * 6, block: tag, cap: sp.k === 'shield',
    capA: 0, think: 1 + st.rng() * 2.5, seed: st.rng() };
  if (a.k === 'folder') { a.fold = 0; a.st2 = 'back'; }
  if (a.k === 'crab') { a.dir = sp.dir || (x < 0 ? 1 : -1); a.cutAt = x; }
  st.aliens.push(a);
  Sfx.play('popaliensPopUp');
  return a;
}
function paSpawnGroup(st, list, tag) {
  list.forEach((sp, i) => { if (st.thin && i % 3 === 2) return; paSpawn(st, sp, tag); });
}
const paLive = a => a.st === 'live';
function paNearestHero(st, x, z, o = {}) {
  let best = null, bd = 1e9;
  G.players.forEach((p, k) => {
    const h = st.h[k];
    if (h.flat && !o.flat) return;
    const d = Math.hypot(p.b3.x - x, p.b3.z - z);
    if (d < bd) { bd = d; best = k; }
  });
  return best == null ? null : { k: best, d: bd, b: G.players[best].b3 };
}
function paKill(st, a, how, by) {
  a.st = 'dead'; a.hp = 0;
  st.kills++;
  if (how === 'cross') st.crossKills++;
  paFx(st, how === 'grenade' ? 'confetti' : 'crumple', { a: paFxA(a), by });
  Sfx.play(how === 'grenade' ? 'popaliensConfetti' : 'popaliensCrumple');
  if (a.k === 'carrier') { st.pickups.push({ id: 'd' + a.id, x: a.x, z: a.z, live: true, route: false, drop: true }); paFx(st, 'drop', { x: a.x, z: a.z }); }
}
const paFxA = a => ({ id: a.id, k: a.k, x: a.x, y: a.y, z: a.z, face: a.face, scorch: a.scorch, fold: a.fold || 0 });
// a bolt (or a grenade) reaches an alien: returns true if it stopped the bolt
function paHit(st, a, owner, dirx, dirz, cross) {
  const now = G.time;
  const crossed = cross || now - a.lastHit[1 - owner] < PA.crossWin;
  a.lastHit[owner] = now;
  // a shield alien's bottle cap stops bolts from the front, unless the beams cross (it is knocked away)
  if (a.cap) {
    const cx = Math.sin(a.capA), cz = Math.cos(a.capA);
    if (-dirx * cx - dirz * cz > Math.cos(65 * Math.PI / 180)) {
      if (crossed) { a.cap = false; paFx(st, 'capOff', { a: paFxA(a) }); Sfx.play('popaliensCapOff'); paFx(st, 'cross', { a: paFxA(a) }); }
      else { paFx(st, 'ping', { x: a.x - dirx * 0.4, z: a.z - dirz * 0.4 }); Sfx.play('popaliensPing'); }
      return true;
    }
  }
  const dmg = crossed ? PA.crossDmg : 1;
  if (crossed) { paFx(st, 'cross', { a: paFxA(a) }); Sfx.play('popaliensCross'); }
  a.hp -= dmg;
  if (a.k === 'folder' && a.st2 === 'stuck') a.hp = 0;
  if (a.hp <= 0) paKill(st, a, crossed ? 'cross' : 'bolt', owner);
  else { a.scorch++; paFx(st, 'scorch', { a: paFxA(a) }); Sfx.play('popaliensScorch'); }
  return true;
}
// can a bolt flying along (dx, dz) hit this alien at all? (an Edger side-on to it lets it pass)
function paCanHit(a, dx, dz) {
  if (a.k === 'edger') return Math.abs(dx * Math.sin(a.face) + dz * Math.cos(a.face)) > 0.42;
  return true;
}
function paAlienStep(st, a, dt) {
  const K = PA_KINDS[a.k];
  a.t += dt;
  if (a.st === 'pop') {
    if (a.t >= PA.popShow + PA.popRise) { a.st = 'live'; a.t = 0; }
    return;
  }
  if (a.st !== 'live') return;
  const tgt = paNearestHero(st, a.x, a.z);
  // turn to face the nearest hero (paper turns slowly, like a sign on a stick)
  if (tgt) {
    const want = Math.atan2(tgt.b.x - a.x, tgt.b.z - a.z);
    if (a.k === 'edger') {
      // side-on to a hero who is aiming at it: that hero's bolts pass by
      let aimer = null, ad = 1e9;
      G.players.forEach((p, k) => {
        const h = st.h[k]; if (h.flat) return;
        const to = Math.atan2(a.x - p.b3.x, a.z - p.b3.z), d = Math.hypot(a.x - p.b3.x, a.z - p.b3.z);
        if (d < PA.boltRange + 2 && Math.abs(paAng(to - h.aim)) < PA.aimCone && d < ad) { ad = d; aimer = p.b3; }
      });
      const ref = aimer || tgt.b, side = Math.atan2(ref.x - a.x, ref.z - a.z) + Math.PI / 2;
      // the nearer of the two side-on headings
      const s2 = Math.abs(paAng(side - a.face)) < Math.PI / 2 ? side : side + Math.PI;
      a.face += clamp(paAng(s2 - a.face), -4 * dt, 4 * dt);
    } else a.face += clamp(paAng(want - a.face), -3 * dt, 3 * dt);
    if (a.cap) a.capA += clamp(paAng(want - a.capA), -2.6 * dt, 2.6 * dt);
  }
  a.zapCd -= dt;
  // the zap: a slow, visible ring of light, then everyone inside it is flattened
  if (a.zap) {
    a.zap.t += dt;
    if (a.zap.t >= (K.zapWind || PA.zapWind)) {
      const R = K.zapR || PA.zapR;
      paFx(st, 'zap', { x: a.x, z: a.z, r: R });
      Sfx.play('popaliensZap');
      let hit = G.players.map((p, k) => ({ k, d: Math.hypot(p.b3.x - a.x, p.b3.z - a.z) })).filter(q => q.d < R && !st.h[q.k].flat);
      if (K.one) hit = hit.sort((u, v) => u.d - v.d).slice(0, 1);
      for (const q of hit) paFlatten(st, q.k, a.k === 'lesson' ? 'lesson' : 'zap');
      a.zap = null; a.zapCd = PA.zapCd + st.rng() * 0.8;
      if (a.k === 'lesson') a.zapCd = 99;
    }
    return; // (it stands still while it winds up)
  }
  if (K.zap && tgt && a.zapCd <= 0 && tgt.d < (K.zapStart || PA.zapStart)) { a.zap = { t: 0, r: K.zapR || PA.zapR, wind: K.zapWind || PA.zapWind }; Sfx.play('popaliensZapWind'); return; }
  if (a.hold && tgt && tgt.d > a.hold) { a.hopPh += dt * 2; return; }
  switch (a.k) {
    case 'grunt': case 'lesson': case 'shield': case 'edger': {
      if (!tgt) break;
      // hop toward the nearest hero: moving only in the air part of each hop
      a.hopPh += dt * (a.k === 'edger' ? 4.5 : 6);
      const air = Math.sin(a.hopPh) > 0;
      a.y = air ? Math.sin(a.hopPh) * 0.22 : 0;
      if (air && tgt.d > 1.6) {
        const dx = tgt.b.x - a.x, dz = tgt.b.z - a.z, l = Math.hypot(dx, dz) || 1;
        // a row keeps its line: mostly straight down the page, a little toward the hero
        const sx = dx / l * 0.45, sz = Math.max(0.55, dz / l) * Math.sign(dz || 1);
        const m = Math.hypot(sx, sz) || 1;
        a.x += sx / m * K.speed * 2 * dt; a.z += sz / m * K.speed * 2 * dt;
      }
      break;
    }
    case 'carrier': {
      // runs away from the nearest hero, slowly, and never leaves the path
      if (!tgt) break;
      a.hopPh += dt * 5; a.y = Math.max(0, Math.sin(a.hopPh)) * 0.12;
      if (tgt.d < 9) {
        const dx = a.x - tgt.b.x, dz = a.z - tgt.b.z, l = Math.hypot(dx, dz) || 1;
        let mx = dx / l, mz = dz / l;
        if (Math.abs(a.x) > PA.sideX - 2) mx = -Math.sign(a.x) * 0.7;
        if (a.z < st.cz - PA.topLimit - 3) mz = 0.4;
        a.x += mx * K.speed * dt; a.z += mz * K.speed * dt;
      }
      break;
    }
    case 'folder': paFolderStep(st, a, dt, tgt); break;
    case 'crab': paCrabStep(st, a, dt); break;
    case 'stamper': paStamperStep(st, a, dt, tgt); break;
  }
  a.x = clamp(a.x, -PA.sideX - 2, PA.sideX + 2);
  a.z = Math.min(a.z, st.cz + PA.backWall + 0.5);
}
// Folders stand at the back, fold into paper planes in three visible folds (the dive line shows the whole time), dive
// straight along it, and if they miss stick nose-first in the page for 2 s
function paFolderStep(st, a, dt, tgt) {
  a.ft = (a.ft || 0) + dt;
  if (a.st2 === 'back') {
    a.fold = Math.max(0, a.fold - dt * 2); a.y = 0;
    a.hopPh += dt * 3;
    if (tgt) {
      // keep 8 to 12 units ahead of the nearest hero
      const want = tgt.b.z - 10;
      a.z += clamp(want - a.z, -1, 1) * PA_KINDS.folder.speed * dt;
      // and drift across toward the hero's side, so it never hangs out of reach far off to one side
      const dxw = tgt.b.x - a.x;
      if (Math.abs(dxw) > 5) a.x += Math.sign(dxw) * PA_KINDS.folder.speed * 0.6 * dt;
      a.think -= dt;
      if (a.think <= 0 && a.fold <= 0.01 && tgt.d < 16) {
        a.st2 = 'fold'; a.ft = 0;
        a.from = { x: a.x, z: a.z };
        // the dive line: straight through where the hero is now, and 2.5 units on
        const dx = tgt.b.x - a.x, dz = tgt.b.z - a.z, l = Math.hypot(dx, dz) || 1;
        a.to = { x: tgt.b.x + dx / l * 2.5, z: tgt.b.z + dz / l * 2.5 };
        a.face = Math.atan2(dx, dz);
        Sfx.play('popaliensFold');
      }
    }
  } else if (a.st2 === 'fold') {
    a.fold = Math.min(3, a.ft / 0.4);
    a.y = Math.min(1.6, a.ft * 1.4);
    if (a.ft >= 1.2) { a.st2 = 'dive'; a.ft = 0; Sfx.play('popaliensDive'); }
  } else if (a.st2 === 'dive') {
    const L = Math.hypot(a.to.x - a.from.x, a.to.z - a.from.z) || 1, k = Math.min(1, a.ft * 15 / L);
    a.x = a.from.x + (a.to.x - a.from.x) * k; a.z = a.from.z + (a.to.z - a.from.z) * k;
    a.y = 1.6 * (1 - k) + 0.25 * k;
    G.players.forEach((p, n) => { if (Math.hypot(p.b3.x - a.x, p.b3.z - a.z) < 0.7 && p.b3.y < 1.2) paFlatten(st, n, 'dive'); });
    if (k >= 1) { a.st2 = 'stuck'; a.ft = 0; a.y = 0; Sfx.play('popaliensStick'); }
  } else if (a.st2 === 'stuck') {
    if (a.ft >= 2) { a.st2 = 'back'; a.ft = 0; a.think = 1.5 + st.rng() * 2.5; }
  }
}
// Scissor crabs scuttle across the path cutting slits behind them (a slit opens 0.8 s after it is cut)
function paCrabStep(st, a, dt) {
  a.hopPh += dt * 12;
  a.x += a.dir * PA_KINDS.crab.speed * dt;
  if (Math.abs(a.x - a.cutAt) >= 0.5) {
    const x0 = Math.min(a.x, a.cutAt), x1 = Math.max(a.x, a.cutAt);
    st.holes.push({ x0, x1, z: a.z, hw: 0.28, open: G.time + 0.8, gone: G.time + 40, id: st.nextId++ });
    a.cutAt = a.x;
    if (st.holes.length > 120) st.holes.shift();
    Sfx.play('popaliensSnip');
  }
  if (Math.abs(a.x) > PA.sideX + 1.5) { a.dir = -a.dir; a.z -= 3; a.cutAt = a.x; }
}
// Stampers hop and slam: a round shadow for 1.2 s, then anyone under it is flattened and the page gets an inky print
function paStamperStep(st, a, dt, tgt) {
  a.ft = (a.ft || 0) + dt;
  if (!a.jump) {
    a.y = 0;
    if (a.ft > 1.6 && tgt) { a.jump = { fx: a.x, fz: a.z, tx: tgt.b.x, tz: tgt.b.z, t: 0 }; a.ft = 0; paFx(st, 'stampAim', { x: tgt.b.x, z: tgt.b.z }); }
  } else {
    const j = a.jump; j.t += dt;
    const k = Math.min(1, j.t / 1.2);
    a.x = j.fx + (j.tx - j.fx) * k; a.z = j.fz + (j.tz - j.fz) * k; a.y = Math.sin(k * Math.PI) * 3.2;
    if (k >= 1) {
      a.jump = null; a.ft = 0; a.y = 0;
      st.prints.push({ x: a.x, z: a.z, r: 1.5, until: G.time + 8, id: st.nextId++ });
      if (st.prints.length > 24) st.prints.shift();
      paFx(st, 'stamp', { x: a.x, z: a.z });
      Sfx.play('popaliensStamp'); st.shake = Math.max(st.shake, 0.35);
      G.players.forEach((p, n) => { if (Math.hypot(p.b3.x - a.x, p.b3.z - a.z) < 1.5) paFlatten(st, n, 'stamp'); });
    }
  }
}

/* ---------- the heroes: moving, aiming, firing, throwing, peeling ---------- */
function paAimHelp(st, k, aim) {
  const b = G.players[k].b3;
  let best = null, bd = 1e9;
  for (const a of st.aliens) {
    if (!paLive(a)) continue;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d > PA.boltRange) continue;
    const da = paAng(Math.atan2(a.x - b.x, a.z - b.z) - aim);
    if (Math.abs(da) < PA.aimStraight) return aim;   // pointing straight at one: never pulled off it
    if (Math.abs(da) < PA.aimCone && Math.abs(da) + d * 0.01 < bd) { bd = Math.abs(da) + d * 0.01; best = da; }
  }
  return best == null ? aim : aim + clamp(best, -PA.aimBend, PA.aimBend);
}
function paFire(st, k) {
  const h = st.h[k], b = G.players[k].b3;
  const dir = paAimHelp(st, k, h.aim), dx = Math.sin(dir), dz = Math.cos(dir);
  st.bolts.push({ id: st.nextId++, k, x: b.x + dx * 0.45, z: b.z + dz * 0.45, y: b.y + 0.42, dx, dz, d: 0 });
  h.charge--; h.sinceShot = 0;
  Sfx.play('popaliensRay', k);
  if (h.charge <= 0) { h.reload = PA.autoReloadT; h.reloadDur = PA.autoReloadT; Sfx.play('popaliensGunEmpty', k); }
}
function paThrow(st, k) {
  const h = st.h[k], b = G.players[k].b3;
  if (h.gren <= 0) { h.emptyShake = 0.5; Sfx.play('popaliensEmpty', k); return; }
  h.gren--; st.thrown++;
  let tx = b.x + Math.sin(h.aim) * PA.throwDist, tz = b.z + Math.cos(h.aim) * PA.throwDist;
  // aim help: the landing spot slides up to 2 units toward the middle of the nearest crowd
  let cx = 0, cz = 0, n = 0;
  for (const a of st.aliens) if (paLive(a) && Math.hypot(a.x - tx, a.z - tz) < 3.2) { cx += a.x; cz += a.z; n++; }
  if (n) { cx /= n; cz /= n; const dx = cx - tx, dz = cz - tz, l = Math.hypot(dx, dz); if (l > 0) { const m = Math.min(2, l); tx += dx / l * m; tz += dz / l * m; } }
  const T = PA.flightT;
  st.grens.push({ id: st.nextId++, k, x: b.x, y: b.y + 0.6, z: b.z, vx: (tx - b.x) / T, vz: (tz - b.z) / T, vy: PA.grenG * T / 2, t: 0, landed: false, fuse: 0, tx, tz });
  Sfx.play('popaliensGrenadeThrow', k);
}
function paBurst(st, g) {
  paFx(st, 'burst', { x: g.x, z: g.z, r: PA.burstR });
  Sfx.play('popaliensGrenadeBurst'); st.shake = Math.max(st.shake, 0.3);
  for (const a of st.aliens) {
    if (!paLive(a) && a.st !== 'pop') continue;
    if (Math.hypot(a.x - g.x, a.z - g.z) > PA.burstR + PA_KINDS[a.k].r) continue;
    if (a.cap) { a.cap = false; paFx(st, 'capOff', { a: paFxA(a) }); continue; }
    if (a.k === 'stamper') { a.hp -= 5; a.scorch++; if (a.hp <= 0) paKill(st, a, 'grenade', g.k); else paFx(st, 'scorch', { a: paFxA(a) }); continue; }
    paKill(st, a, 'grenade', g.k);
  }
}
function paHeroStep(st, k, dt) {
  const p = G.players[k], b = p.b3, h = st.h[k], o = st.h[1 - k], ob = G.players[1 - k].b3;
  const inp = p.input;
  h.inv = Math.max(0, h.inv - dt); h.emptyShake = Math.max(0, h.emptyShake - dt); h.unpeel = Math.max(0, (h.unpeel || 0) - dt);
  h.sinceShot += dt;
  if (h.freeze > 0) { h.freeze -= dt; p.pendingJump = false; p.pendingAct = p.pendingAct2 = p.pendingAct3 = false; b.vx = b.vz = 0; return; }
  if (h.flat) {
    h.flat.t += dt;
    b.vx = 0; b.vz = 0; p.pendingJump = false; p.pendingAct = p.pendingAct2 = p.pendingAct3 = false;
    if (h.flat.t >= PA.selfPeel) paUnflatten(st, k, true);
    return;
  }
  // the reload button: peel a flattened partner up when beside them, else reload
  const besideFlat = o.flat && Math.hypot(ob.x - b.x, ob.z - b.z) < PA.peelR;
  if (besideFlat && inp.act3) {
    h.peel += dt;
    if (h.peel >= PA.peelT) { h.peel = 0; paUnflatten(st, 1 - k, false); }
  } else h.peel = Math.max(0, h.peel - dt * 2);
  const peeling = besideFlat && inp.act3;
  if (p.pendingAct3) {
    p.pendingAct3 = false;
    if (!besideFlat && !paOnHatch(st, k) && h.reload <= 0 && h.charge < PA.charge) { h.reload = PA.reloadT; h.reloadDur = PA.reloadT; Sfx.play('popaliensReload', k); }
  }
  if (h.reload > 0) { h.reload -= dt; if (h.reload <= 0) { h.reload = 0; h.charge = PA.charge; Sfx.play('popaliensReloaded', k); } }
  // walking (wet ink and stamped prints slow you)
  const dir = K3D.moveDir(p);
  let speed = 1;
  for (const pr of st.prints) if (G.time < pr.until && Math.hypot(pr.x - b.x, pr.z - b.z) < pr.r) speed = 0.55;
  if (st.inkAt && st.inkAt(b.x, b.z)) speed = Math.min(speed, 0.6);
  MOVER3.step(p, st.w, dt, { dir, speed, teeter: false });
  // facing is aiming: the way you last walked, held while the fire button is down (so you can back away firing)
  if (inp.act) { if (h.holdAim == null) h.holdAim = h.aim; } else h.holdAim = null;
  if (dir.s > 0.2) {
    h.stillT = 0;
    if (h.holdAim == null) { const want = Math.atan2(dir.x, dir.z); h.aim += clamp(paAng(want - h.aim), -14 * dt, 14 * dt); }
  } else if (!inp.act && !p.pendingAct) {
    h.stillT += dt;
    // standing still with nothing pressed: turn to the nearest alien within 10 units
    if (h.stillT > PA.autoFaceT) {
      let best = null, bd = PA.autoFaceR;
      for (const a of st.aliens) { if (!paLive(a)) continue; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < bd) { bd = d; best = a; } }
      if (best) h.aim += clamp(paAng(Math.atan2(best.x - b.x, best.z - b.z) - h.aim), -6 * dt, 6 * dt);
    }
  } else h.stillT = 0;
  if (h.holdAim != null) h.aim = h.holdAim;
  // fire: held = steady fire, a tap fires too (no faster than 5 a second)
  const canFire = h.reload <= 0 && h.charge > 0 && !peeling && st.phase === 'march';
  if (canFire && ((inp.act && h.sinceShot >= PA.heldGap) || (p.pendingAct && h.sinceShot >= PA.tapGap))) { paFire(st, k); p.pendingAct = false; }
  if (p.pendingAct && !canFire) p.pendingAct = false;
  if (p.pendingAct2) { p.pendingAct2 = false; if (st.phase === 'march') paThrow(st, k); }
  // grenades lying on the page
  for (const g of st.pickups) {
    if (!g.live || h.gren >= PA.grenMax) continue;
    if (Math.hypot(g.x - b.x, g.z - b.z) < PA.pickR) {
      g.live = false; h.gren++;
      paFx(st, 'pickup', { k, x: g.x, z: g.z }); Sfx.play('popaliensGrenadeGet', k);
      paTip(st, 'grenade');
    }
  }
  // holes cut in the page: a hero standing on an open one drops through
  if (b.ground) for (const ho of st.holes) {
    if (G.time < ho.open || G.time > ho.gone) continue;
    if (Math.abs(b.z - ho.z) < ho.hw && b.x > ho.x0 - 0.05 && b.x < ho.x1 + 0.05) { paFlatten(st, k, 'hole'); break; }
  }
}
function paOnHatch(st, k) { return !!(st.hatch && Math.hypot(G.players[k].b3.x - st.hatch.x, G.players[k].b3.z - st.hatch.z) < st.hatch.r); }
// after both heroes moved: the soft back wall, the top of the screen, the sides, and how far apart the pair may be
function paConstrain(st) {
  const [a, b] = G.players.map(p => p.b3);
  for (const q of [a, b]) {
    if (q.z > st.cz + PA.backWall) { q.z = st.cz + PA.backWall; if (q.vz > 0) q.vz = 0; }
    if (q.z < st.cz - PA.topLimit) { q.z = st.cz - PA.topLimit; if (q.vz < 0) q.vz = 0; }
    q.x = clamp(q.x, -PA.sideX, PA.sideX);
  }
  const dx = b.x - a.x, dz = b.z - a.z;
  const fx = Math.abs(dx) > PA.sepX ? (Math.abs(dx) - PA.sepX) * Math.sign(dx) / 2 : 0;
  const fz = Math.abs(dz) > PA.sepZ ? (Math.abs(dz) - PA.sepZ) * Math.sign(dz) / 2 : 0;
  if (fx || fz) {
    // a flattened hero stays put: the one still walking is held
    const fa = st.h[0].flat ? 0 : st.h[1].flat ? 2 : 1, fb = 2 - fa;
    a.x += fx * fa; a.z += fz * fa; b.x -= fx * fb; b.z -= fz * fb;
    st.atLimit = 0.4;
  }
  MOVER3.separate(a, b);
}

/* ---------- the march: camera, checkpoints, events ---------- */
function paMarch(st, dt) {
  const [a, b] = G.players.map(p => p.b3);
  const mz = (a.z + b.z) / 2, mx = (a.x + b.x) / 2;
  // the camera moves on (never back) when the pair's middle passes a line a third of the way up the screen
  let want = Math.min(st.cz, mz + PA.line);
  if (st.block) want = Math.max(want, st.block.stop);
  want = Math.max(want, PA_ROUTE.end + 4);
  st.cz = Math.max(want, st.cz - PHYS.maxRun / K3D.U * dt);
  st.cx += clamp(mx * 0.35 - st.cx, -2 * dt, 2 * dt);
  if (Math.abs(st.cz - st.wAt) > 8) paRebuildWorld(st);
  // events
  const evs = PA_ROUTE.events;
  while (st.evI < evs.length && st.cz <= evs[st.evI].at) {
    const ev = evs[st.evI], i = st.evI; st.evI++;
    if (ev.spawn) paSpawnGroup(st, ev.spawn, null);
    if (ev.say) paSay(st, ev.say);
    if (ev.tip) paTip(st, ev.tip);
    if (ev.wide) st.wideT = ev.wide;
    if (ev.block && !st.wallDown[i]) { st.block = { i, stop: ev.block.stop, wave: 0, waves: ev.block.waves }; paSpawnGroup(st, ev.block.waves[0], i); }
  }
  // a blockade: the next wave when this one is beaten; the wall springs open after the last
  if (st.block) {
    const B = st.block;
    if (!st.aliens.some(q => q.block === B.i && q.st !== 'dead')) {
      B.wave++;
      if (B.wave < B.waves.length) paSpawnGroup(st, B.waves[B.wave], B.i);
      else { st.wallDown[B.i] = true; st.block = null; paRebuildWorld(st); paFx(st, 'wallDown', { i: B.i }); Sfx.play('popaliensWallDown'); }
    }
  }
  // checkpoints: crossed with both heroes up
  const nx = PA_ROUTE.checks[st.ck + 1];
  if (nx && !st.h[0].flat && !st.h[1].flat && mz < nx.z) paSave(st, st.ck + 1);
}

/* ---------- one step ---------- */
function paStep(dt) {
  const st = G.mst;
  if (!st.h) return;
  K3D.heading = 0;
  st.t += dt;
  st.shake = Math.max(0, st.shake - dt); st.flash = Math.max(0, st.flash - dt); st.wideT = Math.max(0, st.wideT - dt);
  st.atLimit = Math.max(0, (st.atLimit || 0) - dt);
  for (const m of [st.tip, st.say, st.banner]) if (m) m.t += dt;
  if (st.tip && st.tip.t > st.tip.life) st.tip = null;
  if (st.say && st.say.t > st.say.life) st.say = null;
  if (st.banner && st.banner.t > st.banner.life) st.banner = null;
  if (G.introT > 0) { for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; } return; }
  if (st.phase === 'shrink') {
    // the shrink ray (not playing): skippable with jump
    st.shrinkT = (st.shrinkT || 0) + dt;
    if (st.shrinkT < 0.05) Sfx.play('popaliensShrink');
    const skip = G.players.some(p => p.pendingJump && !cpuOn(p.id));
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = p.pendingAct2 = p.pendingAct3 = false; }
    if (st.shrinkT >= PA.shrinkT || skip) { st.phase = 'march'; st.marchT = 0; }
    return;
  }
  if (st.phase === 'done') { paFinishStep(st, dt); return; }
  st.marchT += dt;
  // the clock
  const was = st.clock;
  st.clock = Math.max(0, st.clock - dt);
  if (was > PA.amber && st.clock <= PA.amber) Sfx.play('popaliensClockLow');
  if (was > PA.red && st.clock <= PA.red) Sfx.play('popaliensClockLow');
  if (st.clock <= 0 && !st.wipe) { paRescue(st); return; }
  // both flattened: a wipe-out (the page shakes, then back to the last bookmark; the clock keeps running)
  if (st.wipe) { st.wipe.t += dt; if (st.wipe.t >= PA.wipeT) { st.wipe = null; paWipeout(st); } return; }
  for (const k of [0, 1]) paHeroStep(st, k, dt);
  paConstrain(st);
  if (st.h[0].flat && st.h[1].flat) { st.wipe = { t: 0 }; st.shake = 0.6; return; }
  paMarch(st, dt);
  // aliens
  for (const a of st.aliens) paAlienStep(st, a, dt);
  // aliens keep a little apart (paper dolls do not overlap)
  const al = st.aliens.filter(paLive);
  for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {
    const u = al[i], v = al[j]; if (u.k === 'stamper' || v.k === 'stamper' || (u.k === 'folder' && u.st2 !== 'back') || (v.k === 'folder' && v.st2 !== 'back')) continue;
    const dx = v.x - u.x, dz = v.z - u.z, d = Math.hypot(dx, dz), m = PA_KINDS[u.k].r + PA_KINDS[v.k].r;
    if (d < m && d > 1e-4) { const k = (m - d) / 2; u.x -= dx / d * k; u.z -= dz / d * k; v.x += dx / d * k; v.z += dz / d * k; }
  }
  st.aliens = st.aliens.filter(a => a.st !== 'dead');
  // bolts
  for (const bo of st.bolts) {
    const step = PA.boltSpeed * dt, n = Math.ceil(step / 0.3);
    for (let s = 0; s < n && !bo.done; s++) {
      bo.x += bo.dx * step / n; bo.z += bo.dz * step / n; bo.d += step / n;
      if (bo.d > PA.boltRange) { bo.done = true; paFx(st, 'fizzle', { x: bo.x, z: bo.z, k: bo.k }); break; }
      if (st.coverAt && st.coverAt(bo.x, bo.z)) { bo.done = true; paFx(st, 'ping', { x: bo.x, z: bo.z }); break; }
      for (const a of st.aliens) {
        if (!paLive(a) || a.hp <= 0) continue;
        if (Math.hypot(a.x - bo.x, a.z - bo.z) > PA_KINDS[a.k].r) continue;
        if (!paCanHit(a, bo.dx, bo.dz)) continue;
        if (paHit(st, a, bo.k, bo.dx, bo.dz, false)) { bo.done = true; break; }
      }
    }
  }
  st.bolts = st.bolts.filter(b => !b.done);
  st.aliens = st.aliens.filter(a => a.st !== 'dead');
  // grenades in flight and ticking
  for (const g of st.grens) {
    if (!g.landed) {
      g.t += dt; g.x += g.vx * dt; g.z += g.vz * dt; g.vy -= PA.grenG * dt; g.y += g.vy * dt;
      if (g.y <= 0.1) { g.y = 0.1; g.landed = true; Sfx.play('popaliensTick'); }
    } else {
      g.fuse += dt;
      if (g.fuse >= PA.fuse) { g.done = true; paBurst(st, g); }
    }
  }
  st.grens = st.grens.filter(g => !g.done);
  st.aliens = st.aliens.filter(a => a.st !== 'dead');
  st.holes = st.holes.filter(h => G.time < h.gone);
  // the end of the route (for now, until Stretch 4 is built: the far edge of the Margin Fields)
  const mz = (G.players[0].b3.z + G.players[1].b3.z) / 2;
  if (!st.block && mz < PA_ROUTE.end + 1 && !st.h[0].flat && !st.h[1].flat) { st.phase = 'done'; st.doneT = 0; }
}
function paFinishStep(st, dt) {
  st.doneT += dt;
  if (st.doneT > 1.2 && G.mode === 'play') levelClear();
}

/* ---------- results and medals ---------- */
function paStats() {
  const st = G.mst;
  const out = [
    { label: 'Time left', value: fmtTime(st.clock || 0).replace(/\.\d$/, '') },
    { label: 'Aliens beaten', value: st.kills || 0 },
    { label: 'Crossed beams', value: st.crossKills || 0 },
    { label: 'Peels', value: st.peels || 0 },
    { label: 'Wipe-outs', value: st.wipes || 0 },
  ];
  const fl = Object.entries(st.flats || {}).sort((a, b) => b[1] - a[1])[0];
  if (fl) { const s = PA_ROUTE.stretches.find(q => q.key === fl[0]); out.push(`Most flattenings: ${s ? s.name : 'the march'} (${fl[1]}).`); }
  if (!st.everFlat) out.push('Nobody was flattened all the way to the bunker!');
  if (st.rescued) out.push('The Bookworm jammed the saucer for you, so this run is Bronze at most.');
  out.push('Pip and Bo made it to the bunker!');
  return out;
}

/* ---------- the HUD (ownHUD) and the flat things over the 3D picture ---------- */
function paDrawHUD() {
  const st = G.mst;
  if (!st || !st.h) return;
  // the clock, top middle: amber from 2:00, red from 0:30
  const c = st.clock, col = c <= PA.red ? '#ff5a5a' : c <= PA.amber ? '#ffbf3c' : C.paper;
  const m = Math.floor(Math.ceil(c) / 60), s = Math.ceil(c) % 60, txt = m + ':' + (s < 10 ? '0' : '') + s;
  pill(W / 2, 8, 128, 40, 'center');
  const pulse = c <= PA.red && st.phase === 'march' ? 1 + Math.max(0, Math.sin(G.clock * 8)) * 0.08 : 1;
  ctx.save(); ctx.translate(W / 2, 28); ctx.scale(pulse, pulse); text(txt, 0, 1, 26, col, 'center'); ctx.restore();
  // how far along the page: a thin line under the clock with the bunker at its end
  const f = clamp(-(st.cz) / -(PA_ROUTE.stretches[3].z1), 0, 1), lx = W / 2 - 110, lw = 220, ly = 56;
  ctx.fillStyle = 'rgba(23,25,29,0.55)'; rr(lx - 6, ly - 5, lw + 26, 10, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(lx, ly - 1, lw, 2);
  for (const sk of PA_ROUTE.stretches.slice(1)) { const x = lx + lw * (-sk.z0 / -PA_ROUTE.stretches[3].z1); ctx.fillRect(x - 0.5, ly - 3, 1, 6); }
  ctx.fillStyle = C.gold; circle(lx + lw * f, ly, 4); ctx.fill();
  // the bunker: a little dome with a hatch
  ctx.fillStyle = '#d9ccb0'; ctx.beginPath(); ctx.arc(lx + lw + 9, ly + 3, 7, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#5a4a3a'; ctx.fillRect(lx + lw + 6, ly - 1, 6, 4);
  // each player's corner: gun charge, grenades, flattened sticker with the peel ring
  for (const k of [0, 1]) paDrawCorner(st, k);
  // banners and tips
  if (st.banner) paBanner(st.banner.text, 92, st.banner.gold, st.banner.t, st.banner.life);
  if (st.tip && !(st.banner)) paBanner(st.tip.text, 92, false, st.tip.t, st.tip.life);
}
function paBanner(str, y, gold, t, life) {
  const a = clamp(Math.min(t / 0.25, (life - t) / 0.4), 0, 1);
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = Math.min(W - 80, ctx.measureText(str).width + 40);
  ctx.fillStyle = gold ? 'rgba(80,56,10,0.92)' : 'rgba(23,25,29,0.86)'; rr(W / 2 - w / 2, y - 16, w, 32, 16); ctx.fill();
  if (gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(W / 2 - w / 2, y - 16, w, 32, 16); ctx.stroke(); }
  text(str, W / 2, y + 0.5, 15, gold ? C.gold : C.paper, 'center', 'body');
  ctx.restore();
}
function paDrawCorner(st, k) {
  const h = st.h[k], right = k === 1, x0 = right ? W - 64 - 170 : 14, y0 = 46, w = 170, hgt = 38;
  ctx.fillStyle = 'rgba(23,25,29,0.72)'; rr(x0, y0, w, hgt, 12); ctx.fill();
  ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 2; rr(x0, y0, w, hgt, 12); ctx.stroke();
  // the gun's charge: a ring of 24 small lights (dark while it reloads, filling as the crank winds)
  const cx = x0 + 20, cy = y0 + hgt / 2, bulb = k ? '#7dff8a' : '#ffe14a';
  const lit = h.reload > 0 ? Math.floor(PA.charge * (1 - h.reload / (h.reloadDur || 1))) : h.charge;
  for (let i = 0; i < PA.charge; i++) {
    const an = -Math.PI / 2 + i / PA.charge * Math.PI * 2;
    ctx.fillStyle = i < lit ? (h.reload > 0 ? 'rgba(255,255,255,0.7)' : bulb) : 'rgba(255,255,255,0.14)';
    circle(cx + Math.cos(an) * 12, cy + Math.sin(an) * 12, 1.7); ctx.fill();
  }
  ctx.fillStyle = h.reload > 0 ? '#444' : bulb; circle(cx, cy, 5); ctx.fill();
  if (h.reload > 0) text('reload', cx + 22, cy + 0.5, 11, C.paper, 'left', 'body');
  // grenades: three star slots
  const shake = h.emptyShake > 0 ? Math.sin(h.emptyShake * 60) * 3 : 0;
  for (let i = 0; i < PA.grenMax; i++) {
    const gx = x0 + 88 + i * 26 + shake, gy = cy;
    paStar(gx, gy, 9, i < h.gren ? '#9a7dff' : 'rgba(255,255,255,0.16)', i < h.gren ? '#e6dcff' : null);
  }
  if (h.shield > 0) { ctx.fillStyle = '#c9b78a'; ctx.beginPath(); ctx.arc(x0 + w - 12, y0 + 10, 6, Math.PI, 0); ctx.lineTo(x0 + w - 6, y0 + 18); ctx.lineTo(x0 + w - 18, y0 + 18); ctx.fill(); }
  // flattened: a sticker icon and the peel ring
  if (h.flat) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; rr(x0 + 40, y0 + 6, 40, 26, 6); ctx.fill();
    ctx.fillStyle = PCOL[k]; rr(x0 + 45, y0 + 10, 30, 18, 5); ctx.fill();
    text('!', x0 + 60, y0 + 19.5, 14, '#fff', 'center');
    const o = st.h[1 - k], f = o.peel / PA.peelT || h.flat.t / PA.selfPeel * 0.999;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x0 + 60, y0 + 19, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(f, 0, 1)); ctx.stroke();
  }
}
function paStar(x, y, r, fill, hi) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (hi) { ctx.strokeStyle = hi; ctx.lineWidth = 1.2; ctx.stroke(); }
}
// flat things at 3D spots: the Bookworm's words, peel rings over stickers, the partner arrow at the limit, the white
// flash of the saucer's stamp (a fade with reduced motion)
function paDrawTop() {
  const st = G.mst;
  if (!st || !st.h) return;
  // lamplight: a warm dark vignette round the edges of the picture (the night room closing in on the lit page)
  if (!K3D.noRender) {
    const W = ctx.canvas.width, H = ctx.canvas.height, g = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(40,22,12,0)'); g.addColorStop(1, 'rgba(40,22,12,0.52)');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  G.players.forEach((p, k) => {
    const b = p.b3, h = st.h[k];
    const s = K3D.toScreen(b.x, b.y + MOVER3.h, b.z);
    if (s.z < 1) { p.x = s.x - p.w / 2; p.y = s.y - p.h; }
    if (h.flat && s.z < 1) {
      const o = st.h[1 - k], f = o.peel / PA.peelT;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(s.x, s.y + 14, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, s.y + 14, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(f, 0, 1)); ctx.stroke();
    }
    if (h.reload > 0 && s.z < 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(s.x, s.y - 12, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - h.reload / (h.reloadDur || 1))); ctx.stroke();
    }
  });
  if (st.atLimit > 0) {
    // a small arrow at each hero pointing to the partner
    G.players.forEach((p, k) => {
      const a = p.b3, b = G.players[1 - k].b3, s = K3D.toScreen(a.x, a.y + 1.2, a.z), t = K3D.toScreen(b.x, b.y + 0.6, b.z);
      if (s.z > 1 || t.z > 1) return;
      const an = Math.atan2(t.y - s.y, t.x - s.x);
      ctx.save(); ctx.translate(s.x + Math.cos(an) * 22, s.y + Math.sin(an) * 22); ctx.rotate(an);
      ctx.fillStyle = PCOL[1 - k]; ctx.globalAlpha = clamp(st.atLimit / 0.2, 0, 1);
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    });
  }
  if (st.say) {
    const a = clamp(Math.min(st.say.t / 0.25, (st.say.life - st.say.t) / 0.4), 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.min(560, ctx.measureText(st.say.text).width + 70), x = 20, y = H - 84;
    ctx.fillStyle = 'rgba(255,250,236,0.95)'; rr(x, y, w, 40, 14); ctx.fill();
    ctx.strokeStyle = '#2b2130'; ctx.lineWidth = 2; rr(x, y, w, 40, 14); ctx.stroke();
    // the Bookworm's little face
    ctx.fillStyle = '#8bc34a'; circle(x + 24, y + 20, 13); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; circle(x + 20, y + 17, 4); ctx.fill(); circle(x + 29, y + 17, 4); ctx.fill();
    ctx.fillStyle = '#2b2130'; circle(x + 21, y + 18, 2); ctx.fill(); circle(x + 30, y + 18, 2); ctx.fill();
    ctx.strokeStyle = '#2b2130'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 24, y + 22, 5, 0.2, Math.PI - 0.2); ctx.stroke();
    text(st.say.text, x + 46, y + 20.5, 14, '#2b2130', 'left', 'body');
    ctx.restore();
  }
  if (st.wipe) {
    ctx.save(); ctx.globalAlpha = clamp(st.wipe.t / PA.wipeT, 0, 1) * 0.6; ctx.fillStyle = '#2b2130'; ctx.fillRect(0, 0, W, H); ctx.restore();
    text('Wipe-out! Back to the bookmark...', W / 2, H / 2, 26, C.paper, 'center');
  }
  if (st.flash > 0) {
    ctx.save(); ctx.globalAlpha = reduceMotion ? clamp(st.flash / 1.2, 0, 1) * 0.6 : clamp(st.flash / 0.6, 0, 1);
    ctx.fillStyle = reduceMotion ? '#2b2130' : '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  if (st.phase === 'shrink' && G.introT <= 0) {
    const a = clamp(Math.min(st.shrinkT / 0.3, (PA.shrinkT - st.shrinkT) / 0.4), 0, 1);
    ctx.save(); ctx.globalAlpha = a; text('ZAP! Shrunk to the size of ants!', W / 2, H - 70, 24, C.gold, 'center');
    text('Press jump to skip', W / 2, H - 44, 13, C.paper, 'center', 'body'); ctx.restore();
  }
}

/* ---------- sounds (plain words, built from tones and noise) ---------- */
Object.assign(Sfx.extra, {
  popaliensShrink() { this.tone(1400, 1.2, 'sawtooth', 0.025, 120); this.tone(900, 1.0, 'sine', 0.03, 80, 0.1); },
  popaliensRay(p, id) { const f = id ? 1180 : 1320; this.tone(f, 0.07, 'square', 0.018, f * 0.55); },
  popaliensCross() { this.tone(500, 0.35, 'sawtooth', 0.03, 1900); this.tone(1000, 0.3, 'sine', 0.03, 2400, 0.05); },
  popaliensScorch() { this.noise(0.08, { type: 'highpass', f: 2500, vol: 0.03 }); },
  popaliensCrumple() { this.noise(0.22, { type: 'bandpass', f: 1800, to: 600, vol: 0.06 }); this.noise(0.12, { type: 'highpass', f: 3000, vol: 0.03 , delay: 0.08}); },
  popaliensConfetti() { for (let k = 0; k < 6; k++) this.tone(900 + Math.random() * 900, 0.05, 'triangle', 0.016, null, k * 0.03); this.noise(0.3, { type: 'highpass', f: 3500, vol: 0.04 }); },
  popaliensGrenadeGet() { this.tone(880, 0.08, 'sine', 0.04); this.tone(1320, 0.12, 'sine', 0.04, null, 0.07); },
  popaliensGrenadeThrow() { this.tone(500, 0.18, 'sine', 0.03, 900); },
  popaliensTick() { this.tone(1700, 0.03, 'square', 0.02); this.tone(1700, 0.03, 'square', 0.02, null, 0.4); },
  popaliensGrenadeBurst() { this.noise(0.45, { type: 'lowpass', f: 1600, to: 300, vol: 0.12 }); this.tone(220, 0.4, 'sine', 0.06, 60); for (let k = 0; k < 5; k++) this.tone(1400 + k * 230, 0.12, 'triangle', 0.014, null, 0.05 + k * 0.04); },
  popaliensEmpty() { this.tone(240, 0.05, 'square', 0.02); },
  popaliensGunEmpty() { this.tone(300, 0.04, 'square', 0.025); this.tone(180, 0.06, 'square', 0.02, null, 0.05); },
  popaliensReload() { for (let k = 0; k < 4; k++) this.tone(620 + k * 40, 0.03, 'square', 0.015, null, k * 0.18); },
  popaliensReloaded() { this.tone(1500, 0.06, 'sine', 0.03, 2000); },
  popaliensPopUp() { this.noise(0.1, { type: 'bandpass', f: 1200, to: 2200, vol: 0.025 }); },
  popaliensZapWind() { this.tone(300, 0.8, 'sine', 0.018, 700); },
  popaliensZap() { this.tone(900, 0.22, 'sawtooth', 0.03, 200); this.noise(0.15, { type: 'highpass', f: 2000, vol: 0.03 }); },
  popaliensFold() { this.noise(0.08, { type: 'bandpass', f: 1500, vol: 0.03 }); this.noise(0.08, { type: 'bandpass', f: 1800, vol: 0.03 , delay: 0.4}); this.noise(0.08, { type: 'bandpass', f: 2100, vol: 0.03 , delay: 0.8}); },
  popaliensDive() { this.noise(0.6, { type: 'bandpass', f: 600, to: 2400, vol: 0.04 }); },
  popaliensStick() { this.tone(160, 0.08, 'square', 0.03); },
  popaliensSnip() { this.noise(0.04, { type: 'highpass', f: 4000, vol: 0.02 }); },
  popaliensStamp() { this.tone(90, 0.35, 'sine', 0.09, 40); this.noise(0.2, { type: 'lowpass', f: 600, vol: 0.08 }); },
  popaliensFlatten(p, id) { this.tone(id ? 520 : 620, 0.2, 'triangle', 0.05, 180); this.noise(0.1, { type: 'bandpass', f: 900, vol: 0.04 }); },
  popaliensPeel() { this.noise(0.25, { type: 'bandpass', f: 1200, to: 3200, vol: 0.05 }); this.tone(500, 0.12, 'sine', 0.04, 1000, 0.2); },
  popaliensWipeout() { this.tone(400, 0.5, 'triangle', 0.05, 120); this.tone(300, 0.5, 'triangle', 0.04, 90, 0.15); },
  popaliensBookmark() { this.tone(660, 0.1, 'sine', 0.04); this.tone(990, 0.16, 'sine', 0.04, null, 0.09); },
  popaliensClockLow() { this.tone(330, 0.18, 'square', 0.03); this.tone(330, 0.18, 'square', 0.03, null, 0.3); },
  popaliensSaucerLand() { this.noise(1.2, { type: 'lowpass', f: 900, to: 100, vol: 0.14 }); this.tone(70, 1.0, 'sine', 0.1, 30); },
  popaliensWorm() { this.tone(520, 0.05, 'triangle', 0.02, 640); this.tone(600, 0.05, 'triangle', 0.02, 480, 0.07); },
  popaliensThimble() { this.tone(1800, 0.1, 'sine', 0.04); this.tone(2400, 0.2, 'sine', 0.03, null, 0.06); },
  popaliensGold() { this.fanfare([523, 659, 784, 1047], 0.09, 0.14); },
  popaliensPing() { this.tone(2200, 0.05, 'triangle', 0.025, 1800); },
  popaliensCapOff() { this.tone(1400, 0.15, 'triangle', 0.04, 500); },
  popaliensWallDown() { for (let k = 0; k < 5; k++) this.tone(1200 - k * 150, 0.06, 'square', 0.02, null, k * 0.05); },
});

/* ---------- the level ---------- */
MODES.popaliens = {
  medals: { bronze: 'Reach the bunker', goals: [
    { key: 'timeLeft', gold: 120, silver: 30, more: true, text: n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')} or more left on the clock`, show: v => fmtTime(v).replace(/\.\d$/, ''), gap: (v, n) => `${Math.ceil(n - v)} s more on the clock` },
    { key: 'wipeouts', gold: 0, silver: 2, word: 'wipe-out' },
  ] },
  medalValues() {
    const st = G.mst;
    // the clock rescue caps the run at Bronze: no time left counts
    return { timeLeft: st.rescued ? 0 : Math.floor(st.clock), wipeouts: st.wipes };
  },
  scene3dOpts: { bg: '#d4bf9c', fov: 46, near: 0.3, far: 1500 },
  setup(st) { paSetup(st); },
  step(dt) { paStep(dt); },
  scene3d(K) { if (typeof PASCENE !== 'undefined') PASCENE.build(K, G.mst); },
  draw3d(K, dt) { if (typeof PASCENE !== 'undefined') PASCENE.draw(K, G.mst, dt); },
  drawTop() { paDrawTop(); },
  hud() { paDrawHUD(); },
  stats() { return paStats(); },
};
/* ---------- the music: 'popaliens', a B-movie space march ----------
   Fast and a little silly: a wobbly theremin tune (a whistle with a wide vibrato) over a bouncing bass, a pluck arp
   like a toy ray gun, and a snare march; the B part goes up a step for the push. Even loudness with the other songs. */
MUSIC_INST.paTheremin = { w: 'sine', w2: 'triangle', mix: 0.25, a: 0.06, d: 0.1, s: 0.9, r: 0.25, vol: 0.12, vib: [6.5, 34] };
SONGS.popaliens = {
  bpm: 138, vol: 0.31, root: 57, scale: 'harmonic', form: ['A', 'A2', 'B', 'A2'],
  inst: { lead: 'paTheremin', lead2: 'vibes', bass: 'sawbass', arp: 'chiparp', comp: 'pizz' },
  bass: '0 . 0 2 0 . 3 2', arp: '0 1 2 3 2 1 0 1', comp: '. x . x . x . x',
  drums: { k: 'x...x...x...x...', s: '....x.......x..o', h: 'o.x.o.x.o.x.o.x.' },
  sec: {
    A: { ch: [0, 0, 5, 4], lead: ['4 - - 3 4 - 7 -', '6 - 4 - 2 - - -', '5 - - 4 5 - 9 -', '8 - - - 7 - . .'] },
    A2: { ch: [0, 3, 5, 4], lead: ['4 - - 3 4 - 7 -', '9 - 7 - 5 - - -', '4 - 5 - 7 - 8 -', '7 - - - - - . .'], lead2: ['. . . . . . . .', '9 . . . . . . .', '. . . . . . . .', '7 . . . . . . .'] },
    B: { ch: [3, 4, 0, 4], lead: ['7 - 8 - 9 - 8 -', '7 - 6 - 4 - - -', '7 - 9 - 11 - 9 -', '11 - - - 10 - . .'],
      drums: { k: 'x.x.x...x.x.x...', s: '....x.......x.xx', h: 'xxxxxxxxxxxxxxxx', T: '..............x.' } },
  },
};
MUSIC_BY_LEVEL['Paper Alien Invasion'] = 'popaliens';

/* ---------- the 2D outfit 'popaliens' (previews, world page, outfit sheet): the same home-made space rangers ---------- */
// Pip: a clear fishbowl helmet with the sprout curled inside, a crinkled foil chest plate with a red paper star, foil
// boots and two cardboard tubes with red tissue flames on the back. Bo: a white card helmet band with two green bendy-
// straw antennae, a white paper suit wrap with a green stripe, foil boots and a paper satellite dish on the back.
const PA_FOIL = '#c9cfd8';
defineOutfitPart('paTubes', { layer: 'back', draw(c) {
  const g = c.g, f = c.face >= 0 ? -1 : 1;
  for (const dx of [-3.4, 3.4]) {
    const x = f * 9 + dx * 0.5;
    ofRR(g, x - 2.4, -19, 4.8, 14, 2); ofFillStroke(g, '#c99a5e', OF_INK, 1.1);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - 1.6, -18, 1.2, 12);
    const fl = 3 + Math.sin(c.t * 30 + dx) * 1.2;
    g.beginPath(); g.moveTo(x - 2, -5); g.quadraticCurveTo(x, -5 + fl * 2.2, x + 2, -5); g.closePath(); ofFillStroke(g, '#ff5a3c', '#a02818', 0.8);
  }
} });
defineOutfitPart('paFoilPlate', { layer: 'body', draw(c) {
  const g = c.g;
  g.beginPath(); g.moveTo(-9, -11); g.lineTo(9, -11); g.lineTo(8, -3); g.quadraticCurveTo(0, -1, -8, -3); g.closePath();
  const gr = g.createLinearGradient(-9, -11, 9, -2); gr.addColorStop(0, '#eef1f5'); gr.addColorStop(0.5, '#a9b0bb'); gr.addColorStop(1, '#f2f4f6');
  ofFillStroke(g, gr, OF_INK, 1.1);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-6, -9); g.lineTo(-3, -6); g.moveTo(4, -10); g.lineTo(6, -5); g.stroke();
  g.fillStyle = '#e8384a'; ofStar(g, 0, -6.5, 2.8); g.fill(); g.strokeStyle = OF_INK; g.lineWidth = 0.6; g.stroke();
} });
defineOutfitPart('paBoots', { layer: 'body', draw(c) {
  const g = c.g;
  for (const x of [-6, 6]) { ofRR(g, x - 4, -3.2, 8, 3.4, 1.4); ofFillStroke(g, PA_FOIL, OF_INK, 1); }
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-8, -2.6, 2.5, 0.8); g.fillRect(4, -2.6, 2.5, 0.8);
} });
defineOutfitPart('paBowl', { layer: 'front', lift: 0, draw(c) {
  const g = c.g;
  g.fillStyle = 'rgba(210,235,245,0.22)'; g.beginPath(); g.arc(0, -20, 16, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(150,190,210,0.85)'; g.lineWidth = 1.1; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, -20, 13.5, Math.PI * 1.15, Math.PI * 1.45); g.stroke();
  // the collar ring of foil where the bowl meets the body
  ofRR(g, -11, -11.5, 22, 2.6, 1.3); ofFillStroke(g, PA_FOIL, OF_INK, 0.9);
} });
defineOutfitPart('paCardHelm', { layer: 'head', lift: 4, draw(c) {
  const g = c.g;
  // the straw antennae first (behind the band)
  for (const s of [-1, 1]) {
    g.strokeStyle = OF_INK; g.lineWidth = 2.2; g.beginPath(); g.moveTo(s * 4, -27); g.quadraticCurveTo(s * 5, -33, s * 8, -35); g.stroke();
    g.strokeStyle = '#7fd98c'; g.lineWidth = 1.2; g.stroke();
    g.beginPath(); g.arc(s * 8.4, -35.4, 1.9, 0, Math.PI * 2); ofFillStroke(g, '#5cc970', OF_INK, 0.8);
  }
  g.beginPath(); g.moveTo(-9, -22); g.bezierCurveTo(-9, -31, 9, -31, 9, -22); g.closePath(); ofFillStroke(g, '#f5f1e6', OF_INK, 1.2);
  g.fillStyle = '#3fae5e'; g.fillRect(-8.6, -25.5, 17.2, 1.8);
  g.fillStyle = '#9aa2ac'; for (const x of [-5, 0, 5]) { g.beginPath(); g.arc(x, -23, 0.7, 0, Math.PI * 2); g.fill(); }
} });
defineOutfitPart('paSuitWrap', { layer: 'body', draw(c) {
  const g = c.g;
  ofRR(g, -11, -10, 22, 6.5, 1.5); ofFillStroke(g, '#f7f3ea', OF_INK, 1.1);
  g.fillStyle = '#3fae5e'; g.fillRect(-10.5, -7.6, 21, 1.6);
  g.strokeStyle = 'rgba(150,140,120,0.5)'; g.lineWidth = 0.5; for (const x of [-6, 2, 7]) { g.beginPath(); g.moveTo(x, -9.6); g.lineTo(x - 1, -4); g.stroke(); }
} });
defineOutfitPart('paDish', { layer: 'back', draw(c) {
  const g = c.g, f = c.face >= 0 ? -1 : 1;
  g.save(); g.translate(f * 10, -17); g.rotate(f * 0.4);
  g.beginPath(); g.ellipse(0, 0, 3.4, 7.5, 0, 0, Math.PI * 2); ofFillStroke(g, '#f5f1e6', OF_INK, 1.1);
  g.strokeStyle = 'rgba(120,110,100,0.5)'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(0, 0, 2, 4.6, 0, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = OF_INK; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(f * 4, 0); g.stroke();
  g.beginPath(); g.arc(f * 4.4, 0, 1, 0, Math.PI * 2); ofFillStroke(g, '#5cc970', OF_INK, 0.6);
  g.restore();
} });
defineOutfit('popaliens', {
  pip: [['paTubes', {}], ['paFoilPlate', {}], ['paBoots', {}], ['paBowl', {}]],
  bo: [['paDish', {}], ['paSuitWrap', {}], ['paBoots', {}], ['paCardHelm', {}]],
});

// the 3D files for this level, loaded with the kit when a 3D level first opens
K3D.files.push('js/levels/world41/popaliens-outfits.js', 'js/levels/world41/popaliens-aliens.js', 'js/levels/world41/popaliens-room.js', 'js/levels/world41/popaliens-scene.js');

const POPALIENS_DEF = {
  name: 'Paper Alien Invasion', world: 40, kind: 'team', mode: 'popaliens', ownStep: true, ownHUD: true, noFalls: true,
  view3d: true, touch: 'stick', outfit: 'popaliens',
  act: { label: 'ray gun' }, act2: { label: 'cosmic grenade' }, act3: { label: 'reload' },
  tip: 'Hold to fire, and reload when the lights run out. Shoot the same alien together for crossed beams.',
  legend: {
    pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk <kbd>Space</kbd> jump <kbd>F</kbd> ray gun (hold) <kbd>E</kbd> reload, peel up partner <kbd>Q</kbd> cosmic grenade',
    bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> walk <kbd>Space</kbd> jump <kbd>/</kbd> ray gun (hold) <kbd>.</kbd> reload, peel up partner <kbd>,</kbd> cosmic grenade',
  },
  howTo: ['March to the bunker before the clock runs out.', 'Shoot the same alien together to cross beams.', 'If your partner is flattened, hold reload beside them to peel them up.'],
  map: Array.from({ length: 18 }, (_, y) => y === 16 ? '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10) : '.'.repeat(32)),
};
// World 41 is added by 41-1's js/levels/world41/world.js. Until that file is on this branch, a stand-in with the
// pilot spec's name and look (it does nothing once world.js has set WORLDS[40]).
if (!WORLDS[40]) WORLDS[40] = { name: 'Pop-Up Storybook', blurb: 'Tumble into a giant pop-up book where the pages fold up around you!',
  theme: { skyTop: '#e9dcc0', skyBot: '#f6eedc', hillFar: '#c9b892', hillNear: '#b49c70', sun: 'rgba(255,240,200,0.95)', sunGlow: 'rgba(255,220,150,0.35)',
    stone: '#9a7a5a', stoneLight: '#b39674', stoneEdge: '#4a3a30', grass: '#9cc77a', grassDark: '#6f9a52', plank: '#a87a4a', plankDark: '#6a4a26', rope: '#e8d8b0', ropeDark: '#9a8458' } };
LEVELS.push(POPALIENS_DEF);
