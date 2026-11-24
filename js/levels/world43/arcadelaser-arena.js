/* Pip & Bo - 43-4 Laser Tag Arena: the arena as numbers (ARCADELASER_ARENA). Pure maths, no three.js: the rules, the
   brain, the bot tools and the 3D scenery all read it.

   The hall "Zap Maze": a floor X -14..14, Z -7.5..7.5 (Y up, the camera on the +Z side looking toward -Z). Pip's base
   is the near-left corner, Bo's the far-right one. EVERY LAYOUT IS THE SAME FROM BOTH BASES: each layout lists only
   one half and the other half is the same pieces turned half a turn about the centre ((x, z) -> (-x, -z)), so neither
   side has an advantage (centre pieces, `c: true`, are listed once).

   Pieces (A.LAYOUTS[r], r = 1..5):
     pillar   { x, z, r }                    a tall padded pillar: full cover, a circle
     wall     { x, z, w, d, rot, look }      a tall wall (crates, drums, tyres, chain-link, the saucer, the rock arch)
     low      { x, z, w, d, rot, look }      a waist-high wall: stops beams, can be jumped
     riser    { x, z, w, d, rot, ph }        a tall wall that sinks and rises on the beat (A.RISE_PER), ph 0 or 1
     start    { x, z, w, d, rot }            the start walls round each base: up through the count, down 1 s after ZAP
     mirror   { x, z, len, rot }             a fixed mirror panel (both faces bounce), a segment len long
     turn     { x, z, len, rot, id }         a turning mirror on a post: an eighth of a turn per button press
     button   { x, z, mir }                  a floor button turning mirror `mir`
     prism    { x, z, r }                    a crystal column: a beam entering it leaves as three, fanned out
     spin     { x, z, len, rad, rot0 }       a mirror on the centre platform, turning slowly about the centre
     pad      { x, z, id }                   a pickup pad
   Angles: rot is radians about Y, as three.js's rotation.y: a piece's own x axis points along (cos rot, -sin rot)
   in the world, its own z axis along (sin rot, cos rot). A mirror's face is its own x axis; its normal its own z.

   A.solids(st)  the pieces as they stand now (risers up or down, mirrors turned, start walls), for the rules:
                 [{ p (the piece), shape: 'box'|'circle'|'seg', x, z, hw, hd, c, s, r, beam: 'block'|'mirror'|'prism'|
                 'none', move: 'solid'|'low'|'none' }]
   A.trace(sol, ox, oz, dx, dz, o) the path of a beam: { segs: [{ x0, z0, x1, z1, end, n (bounce number) }], hits:
                 [{ id, x, z, n }] (heroes it reaches, by bounce count), bounces } o = { bounces: 3, heroes: [{ id, x, z,
                 r, pass }], skip: id (the shooter), ring: { hx, hz } }. Deterministic: the aiming line and the fired
                 beam are the same call.
   A.clear(sol, ax, az, bx, bz)     is the straight line from a to b free of anything a beam stops at or bounces off
   A.collide(sol, b, low)           pushes a body circle { x, z, r } out of solids (low walls only when low is true)
*/
'use strict';

const ARCADELASER_ARENA = (function () {
  const A = {};
  // The layouts below are written for a 28 x 15 floor and drawn in at SC (positions) when built, so the floor is
  // 21 x 11.2: small enough that the camera can show all of it with the heroes big enough to read.
  const SC = 0.75;
  A.SC = SC;
  A.HX = 14 * SC; A.HZ = 7.5 * SC;       // the floor's half sizes
  A.BASE = [[-12.6 * SC, 5.6 * SC], [12.6 * SC, -5.6 * SC]]; // Pip's and Bo's base circles (spawns)
  A.BASE_FACE = [Math.atan2(1, -0.55), Math.atan2(-1, 0.55)]; // facing out of the base toward the middle
  A.RISE_PER = 7.5;   // a riser stays up, then down, this long (16 beats at 128 a minute)
  A.RISE_WARN = 1.5;  // floor lights run round it this long before it moves
  A.RISE_MOVE = 0.4;  // rising or sinking takes this long
  A.TURN_T = 0.25;    // a turning mirror takes this long for its eighth of a turn
  A.SPIN_PER = 20;    // the centre platform's turn (round 5)
  A.PLAT_R = 1.3;     // the centre platform's radius (raised a little: drawing only)
  A.ROUND_NAMES = ['', 'Pillars', 'Hall of Mirrors', 'The Beat', 'Blackout', 'Full Power'];
  const D = Math.PI / 180;

  /* ---------- the five layouts (one half each; the other half is turned half a turn) ---------- */
  const base1 = () => [
    // tall cover
    { k: 'pillar', x: -8.6, z: 1.3, r: 0.72 },
    { k: 'pillar', x: -4.9, z: -4.3, r: 0.78 },
    { k: 'pillar', x: -3.3, z: 3.5, r: 0.66 },
    { k: 'wall', x: -6.9, z: 5.0, w: 0.8, d: 2.6, rot: 0, look: 'crates' },
    { k: 'wall', x: -10.4, z: -3.7, w: 3.0, d: 0.8, rot: 0, look: 'drums' },
    { k: 'wall', x: -1.9, z: -1.7, w: 0.8, d: 2.8, rot: 0, look: 'chain' },
    { k: 'wall', x: -12.6, z: -6.4, w: 1.5, d: 1.3, rot: 0.25, look: 'tyres', r1only: true },
    // low walls
    { k: 'low', x: -6.3, z: -0.5, w: 2.5, d: 0.5, rot: 0.35, look: 'sandbags' },
    { k: 'low', x: -12.1, z: 1.4, w: 2.4, d: 0.5, rot: 0, look: 'hazard' },
    { k: 'low', x: -4.5, z: 5.75, w: 0.5, d: 1.9, rot: 0, look: 'sandbags' },
    { k: 'low', x: -8.4, z: -6.1, w: 0.5, d: 1.8, rot: 0, look: 'hazard' },
  ];
  const mirrors2 = () => [
    // the corner mirrors: a shot up the outer lane banks along the far edge toward the other base
    { k: 'mirror', x: -12.75, z: -6.35, len: 1.7, rot: 45 * D },
    // lane mirrors by the pillars
    { k: 'mirror', x: -6.6, z: -3.0, len: 1.3, rot: -30 * D },
    { k: 'mirror', x: -0.2, z: 5.8, len: 1.4, rot: 20 * D },
  ];
  const beat3 = () => [
    // risers (the wall by the middle and two new ones), moving on the beat, pairs out of step
    { k: 'riser', x: -6.5, z: 2.75, w: 2.4, d: 0.6, rot: 0, ph: 0 },
    { k: 'riser', x: -9.6, z: -1.35, w: 0.6, d: 2.0, rot: 0, ph: 1 },
    // a turning mirror on a post, with a button on each side of the arena
    { k: 'turn', x: -3.2, z: 0.4, len: 1.4, rot: 45 * D, id: 'a' },
    { k: 'button', x: -10.0, z: 3.0, mir: 'a' },
    { k: 'button', x: 6.9, z: 4.4, mir: 'a' },
  ];
  const full5 = () => [
    { k: 'prism', x: -3.8, z: -2.9, r: 0.42 },
    { k: 'spin', x: 0, z: 0, len: 1.15, rad: 1.25, rot0: 0, c: true, ph: 0 },
    { k: 'spin', x: 0, z: 0, len: 1.15, rad: 1.25, rot0: 0, c: true, ph: Math.PI },
  ];
  const pads = (n) => n === 1 ? [] : [{ k: 'pad', x: 0, z: 0, id: 'c', c: true }, { k: 'pad', x: -5.9, z: -6.55, id: 'p' }];
  // which round-1 pieces stay in the later rounds: the tyre stack in the far corner makes way for the corner mirror,
  // and the chain-link wall by the middle becomes a riser from round 3
  // drawn in: positions by SC; long sides a little less, thin sides and round things hardly (so the gaps stay wide)
  const thin = v => v <= 0.9 ? v * 0.9 : v * 0.8;
  function drawIn(p) {
    const q = Object.assign({}, p, { x: p.x * SC, z: p.z * SC });
    if (q.w != null) { q.w = thin(q.w); q.d = thin(q.d); }
    if (q.r != null) q.r *= 0.88;
    if (q.len != null) q.len *= 0.84;
    if (q.rad != null) q.rad *= SC;
    return q;
  }
  // the start walls: an L round each base pocket, from the pocket's corner out to the edges
  const startWalls = () => {
    const [bx, bz] = A.BASE[0], cx = bx + 1.55, cz = bz - 1.6, t = 0.3;
    return [{ k: 'start', x: cx, z: (cz - t / 2 + A.HZ) / 2, w: t, d: A.HZ - cz + t / 2, rot: 0 },
      { k: 'start', x: (-A.HX + cx + t / 2) / 2, z: cz, w: cx + t / 2 + A.HX, d: t, rot: 0 }];
  };
  function layout(n) {
    let L = base1().filter(p => !(p.r1only && n >= 2));
    if (n >= 3) L = L.filter(p => p.look !== 'chain').concat([{ k: 'riser', x: -1.9, z: -1.7, w: 0.8, d: 2.8, rot: 0, ph: 0, look: 'chain' }]);
    if (n >= 2) L = L.concat(mirrors2());
    if (n >= 3) L = L.concat(beat3());
    if (n >= 5) L = L.concat(full5());
    L = L.concat(pads(n));
    L = startWalls().concat(L.map(drawIn));
    // the other half: the same pieces turned half a turn about the centre
    const out = [];
    for (const p of L) {
      out.push(Object.assign({ side: 0 }, p));
      if (p.c) continue;
      const q = Object.assign({}, p, { x: -p.x, z: -p.z, side: 1 });
      if (q.rot != null) q.rot = p.rot + Math.PI;
      if (p.k === 'turn') q.id = p.id + "'";
      if (p.k === 'button') q.mir = p.mir + "'";
      if (p.k === 'pad') q.id = p.id + "'";
      if (p.k === 'riser') q.ph = p.ph; // the twin moves with it, so both halves change together
      out.push(q);
    }
    out.forEach((p, i) => { p.i = i; });
    return out;
  }
  A.LAYOUTS = [null, layout(1), layout(2), layout(3), layout(4), layout(5)];
  A.layout = n => A.LAYOUTS[Math.max(1, Math.min(5, n))];

  /* ---------- pickups: set times in each round (s after ZAP), on a pad: the centre, or a matched pair ---------- */
  A.PICKUPS = [null, [],
    [{ t: 14, pad: 'c', kind: 'wide' }, { t: 38, pad: 'c', kind: 'shield' }, { t: 58, pad: 'c', kind: 'long' }],
    [{ t: 10, pad: 'p', kind: 'speed' }, { t: 26, pad: 'c', kind: 'long' }, { t: 46, pad: 'p', kind: 'shield' }, { t: 62, pad: 'c', kind: 'wide' }],
    [{ t: 9, pad: 'p', kind: 'shield' }, { t: 24, pad: 'c', kind: 'cloak' }, { t: 44, pad: 'p', kind: 'wide' }, { t: 60, pad: 'c', kind: 'long' }],
    [{ t: 7, pad: 'c', kind: 'long' }, { t: 20, pad: 'p', kind: 'speed' }, { t: 34, pad: 'c', kind: 'cloak' }, { t: 50, pad: 'p', kind: 'wide' }, { t: 64, pad: 'c', kind: 'shield' }],
  ];

  /* ---------- the pieces as they stand at a moment ---------- */
  // a riser's height 0..1 at round time t (s since ZAP; before ZAP risers are down); its next change; warning?
  A.riserAt = function (p, t, held) {
    const per = A.RISE_PER, m = A.RISE_MOVE;
    if (t < 0) return { h: 0, warn: false, up: false };
    // phase 0: down first, up at per; phase 1: up first
    const tt = t + (p.ph ? per : 0), k = Math.floor(tt / per), u = tt - k * per, up = k % 2 === 1;
    let h = up ? Math.min(1, u / m) : Math.max(0, 1 - u / m);
    if (t < per && !p.ph) h = 0; // (round start: phase-0 risers stay down for the first stretch)
    const warn = per - u <= A.RISE_WARN;
    return { h, warn, up, next: per - u };
  };
  A.solids = function (st) {
    const out = [], L = st.layout || A.layout(1);
    for (const p of L) {
      if (p.k === 'pad' || p.k === 'button') continue;
      if (p.k === 'start') { if (st.startDown >= 1) continue; out.push(box(p, p.x, p.z, p.w / 2, p.d / 2, p.rot, 'block', 'solid')); continue; }
      if (p.k === 'pillar') { out.push({ p, shape: 'circle', x: p.x, z: p.z, r: p.r, beam: 'block', move: 'solid' }); continue; }
      if (p.k === 'prism') { out.push({ p, shape: 'circle', x: p.x, z: p.z, r: p.r, beam: 'prism', move: 'solid' }); continue; }
      if (p.k === 'wall') { out.push(box(p, p.x, p.z, p.w / 2, p.d / 2, p.rot, 'block', 'solid')); continue; }
      if (p.k === 'low') { out.push(box(p, p.x, p.z, p.w / 2, p.d / 2, p.rot, 'block', 'low')); continue; }
      if (p.k === 'riser') {
        const r = st.risers && st.risers[p.i];
        if (r && r.h > 0) out.push(box(p, p.x, p.z, p.w / 2, p.d / 2, p.rot, 'block', 'solid'));
        continue;
      }
      if (p.k === 'mirror' || p.k === 'turn' || p.k === 'spin') {
        let x = p.x, z = p.z, rot = p.rot;
        if (p.k === 'turn') rot = (st.turnAng && st.turnAng[p.id] != null) ? st.turnAng[p.id] : p.rot;
        if (p.k === 'spin') { const a = (st.spinA || 0) + p.ph; x = Math.cos(a) * p.rad; z = -Math.sin(a) * p.rad; rot = a + Math.PI / 2; }
        const s = box(p, x, z, p.len / 2, 0.07, rot, 'mirror', 'solid');
        s.shape = 'seg'; out.push(s);
        // (the post of a turning mirror and the frame ends are solid too: the beam stops on the frame)
        continue;
      }
    }
    return out;
  };
  function box(p, x, z, hw, hd, rot, beam, move) { return { p, shape: 'box', x, z, hw, hd, rot, c: Math.cos(rot), s: Math.sin(rot), beam, move }; }
  A.box = box;
  // world -> a solid's own frame, and back
  const loc = (q, x, z) => { const dx = x - q.x, dz = z - q.z; return [dx * q.c - dz * q.s, dx * q.s + dz * q.c]; };
  const wor = (q, lx, lz) => [q.x + lx * q.c + lz * q.s, q.z - lx * q.s + lz * q.c];
  A.loc = loc; A.wor = wor;

  /* ---------- beams ---------- */
  const EPS = 1e-6, FRAME = 0.09;
  // the nearest thing a ray from (ox, oz) along (dx, dz) meets: { t, q (solid), nx, nz (the face's normal) } or null
  function rayHit(sol, ox, oz, dx, dz, maxT, skipQ) {
    let best = null;
    for (const q of sol) {
      if (q.beam === 'none' || q === skipQ) continue;
      if (q.shape === 'circle') {
        const fx = ox - q.x, fz = oz - q.z, b = fx * dx + fz * dz, c = fx * fx + fz * fz - q.r * q.r;
        if (c < 0) { if (q.beam === 'prism') continue; best = { t: 0, q, nx: -dx, nz: -dz }; break; } // starting inside
        const disc = b * b - c; if (disc < 0) continue;
        const t = -b - Math.sqrt(disc);
        if (t > EPS && t < maxT && (!best || t < best.t)) best = { t, q, nx: (ox + dx * t - q.x) / q.r, nz: (oz + dz * t - q.z) / q.r };
      } else if (q.shape === 'seg') {
        // the mirror's face: its own x axis; normal its own z axis
        const [lx, lz] = loc(q, ox, oz), ldx = dx * q.c - dz * q.s, ldz = dx * q.s + dz * q.c;
        if (Math.abs(ldz) < EPS) continue;
        const t = -lz / ldz;
        if (t <= EPS || t >= maxT || (best && t >= best.t)) continue;
        const hx = lx + ldx * t;
        if (Math.abs(hx) > q.hw) continue;
        const sn = lz > 0 ? 1 : -1; // the face it is hit from
        best = { t, q, nx: q.s * sn, nz: q.c * sn, frame: Math.abs(hx) > q.hw - FRAME };
      } else {
        // a turned box: slab test in its own frame
        const [lx, lz] = loc(q, ox, oz), ldx = dx * q.c - dz * q.s, ldz = dx * q.s + dz * q.c;
        let t0 = -Infinity, t1 = Infinity, ax = 0;
        if (Math.abs(ldx) < EPS) { if (Math.abs(lx) > q.hw) continue; } else {
          let a = (-q.hw - lx) / ldx, b = (q.hw - lx) / ldx; if (a > b) [a, b] = [b, a];
          if (a > t0) { t0 = a; ax = 1; } t1 = Math.min(t1, b);
        }
        if (Math.abs(ldz) < EPS) { if (Math.abs(lz) > q.hd) continue; } else {
          let a = (-q.hd - lz) / ldz, b = (q.hd - lz) / ldz; if (a > b) [a, b] = [b, a];
          if (a > t0) { t0 = a; ax = 2; } t1 = Math.min(t1, b);
        }
        if (t0 > t1 || t1 < EPS) continue;
        const t = Math.max(t0, 0);
        if (t >= maxT || (best && t >= best.t)) continue;
        // the face's normal in the world
        let lnx = 0, lnz = 0;
        if (ax === 1) lnx = ldx > 0 ? -1 : 1; else if (ax === 2) lnz = ldz > 0 ? -1 : 1; else { lnx = -ldx; lnz = -ldz; }
        best = { t, q, nx: lnx * q.c + lnz * q.s, nz: -lnx * q.s + lnz * q.c };
      }
    }
    return best;
  }
  A.rayHit = rayHit;
  // where a ray leaves the floor (or the closing ring of light): t
  function edgeT(ox, oz, dx, dz, hx, hz) {
    let t = Infinity;
    if (dx > EPS) t = Math.min(t, (hx - ox) / dx); else if (dx < -EPS) t = Math.min(t, (-hx - ox) / dx);
    if (dz > EPS) t = Math.min(t, (hz - oz) / dz); else if (dz < -EPS) t = Math.min(t, (-hz - oz) / dz);
    return Math.max(0, t);
  }
  // a ray against a circle: first t > 0, or null
  function circT(ox, oz, dx, dz, cx, cz, r) {
    const fx = ox - cx, fz = oz - cz, b = fx * dx + fz * dz, c = fx * fx + fz * fz - r * r;
    if (c <= 0) return 0;
    const disc = b * b - c; if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t > 0 ? t : null;
  }
  A.PRISM_FAN = 22 * D;
  A.trace = function (sol, ox, oz, dx, dz, o = {}) {
    const out = { segs: [], hits: [], passes: [], bounces: 0 };
    const maxB = o.bounces != null ? o.bounces : 3;
    const hx = o.ring ? o.ring.hx : A.HX, hz = o.ring ? o.ring.hz : A.HZ;
    const heroes = o.heroes || [];
    // a stack of rays (a prism adds two more); each carries its bounce count
    const todo = [{ ox, oz, dx, dz, n: 0, skip: null, prismed: false }];
    let guard = 0;
    while (todo.length && guard++ < 40) {
      const r = todo.shift();
      const len = Math.hypot(r.dx, r.dz); r.dx /= len; r.dz /= len;
      const tE = edgeT(r.ox, r.oz, r.dx, r.dz, hx, hz);
      const h = rayHit(sol, r.ox, r.oz, r.dx, r.dz, tE, r.skip);
      let tEnd = h ? h.t : tE;
      // heroes along the way (before the first thing it hits)
      let heroHit = null;
      for (const he of heroes) {
        if (he.id === o.skip && r.n === 0 && !r.prismed) continue; // the shooter's own vest, on the way out
        if (he.id === o.skip) continue;                             // (and never itself after a bounce either)
        const t = circT(r.ox, r.oz, r.dx, r.dz, he.x, he.z, he.r);
        if (t == null || t > tEnd) continue;
        if (he.pass) { out.passes.push({ id: he.id, n: r.n, why: he.pass }); continue; }
        if (!heroHit || t < heroHit.t) heroHit = { t, he };
      }
      if (heroHit) tEnd = heroHit.t;
      const seg = { x0: r.ox, z0: r.oz, x1: r.ox + r.dx * tEnd, z1: r.oz + r.dz * tEnd, n: r.n, end: 'edge' };
      out.segs.push(seg);
      if (heroHit) { seg.end = 'hero'; out.hits.push({ id: heroHit.he.id, x: seg.x1, z: seg.z1, n: r.n }); continue; }
      if (!h) { seg.end = o.ring ? 'ring' : 'edge'; continue; }
      seg.q = h.q; seg.nx = h.nx; seg.nz = h.nz;
      if (h.q.beam === 'mirror' && !h.frame) {
        seg.end = 'mirror';
        if (r.n >= maxB) { seg.end = 'spent'; continue; }
        const dn = r.dx * h.nx + r.dz * h.nz;
        out.bounces = Math.max(out.bounces, r.n + 1);
        todo.push({ ox: seg.x1 + h.nx * 0.002, oz: seg.z1 + h.nz * 0.002, dx: r.dx - 2 * dn * h.nx, dz: r.dz - 2 * dn * h.nz, n: r.n + 1, skip: null, prismed: r.prismed });
        continue;
      }
      if (h.q.beam === 'prism' && !r.prismed) {
        // into the crystal and out of its far side as three beams, fanned out
        seg.end = 'prism';
        const q = h.q, a = Math.atan2(r.dz, r.dx);
        for (const k of [-1, 0, 1]) {
          const aa = a + k * A.PRISM_FAN, ddx = Math.cos(aa), ddz = Math.sin(aa);
          todo.push({ ox: q.x + ddx * (q.r + 0.01), oz: q.z + ddz * (q.r + 0.01), dx: ddx, dz: ddz, n: r.n, skip: q, prismed: true, fan: k });
        }
        continue;
      }
      seg.end = h.q.beam === 'prism' ? 'prism-block' : (h.frame ? 'frame' : 'wall');
    }
    return out;
  };
  // the straight line a -> b: nothing a beam stops at or bounces off in between
  A.clear = function (sol, ax, az, bx, bz, skip) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    if (L < 1e-4) return true;
    const h = rayHit(sol, ax, az, dx / L, dz / L, L, skip);
    return !h;
  };

  /* ---------- bodies against the pieces ---------- */
  // pushes circle b { x, z, r } out of solids; low walls count when `low` is true. Returns true if it was moved.
  A.collide = function (sol, b, low) {
    let moved = false;
    for (let it = 0; it < 3; it++) {
      let any = false;
      for (const q of sol) {
        if (q.move === 'none' || (q.move === 'low' && !low)) continue;
        if (q.shape === 'circle') {
          const dx = b.x - q.x, dz = b.z - q.z, d = Math.hypot(dx, dz), m = q.r + b.r;
          if (d < m) { const k = d > 1e-6 ? (m - d) / d : 0; b.x += (d > 1e-6 ? dx : 1) * (d > 1e-6 ? k : m); b.z += dz * k; any = true; }
        } else {
          const hd = q.shape === 'seg' ? 0.1 : q.hd;
          const [lx, lz] = loc(q, b.x, b.z);
          const cx = Math.max(-q.hw, Math.min(q.hw, lx)), cz = Math.max(-hd, Math.min(hd, lz));
          const ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
          if (d < b.r) {
            let nx, nz, push;
            if (d > 1e-6) { nx = ex / d; nz = ez / d; push = b.r - d; }
            else {
              // the centre is inside: out by the nearest face
              const px = q.hw - Math.abs(lx), pz = hd - Math.abs(lz);
              if (px < pz) { nx = lx >= 0 ? 1 : -1; nz = 0; push = px + b.r; } else { nx = 0; nz = lz >= 0 ? 1 : -1; push = pz + b.r; }
            }
            const [wx, wz] = [nx * q.c + nz * q.s, -nx * q.s + nz * q.c];
            b.x += wx * push; b.z += wz * push; any = true;
          }
        }
      }
      if (!any) break;
      moved = true;
    }
    return moved;
  };
  // does circle b overlap solid q (for risers that will not rise under feet, and landings on low walls)
  A.overlaps = function (q, b, pad = 0) {
    if (q.shape === 'circle') return Math.hypot(b.x - q.x, b.z - q.z) < q.r + b.r + pad;
    const hd = q.shape === 'seg' ? 0.1 : q.hd;
    const [lx, lz] = loc(q, b.x, b.z);
    const cx = Math.max(-q.hw, Math.min(q.hw, lx)), cz = Math.max(-hd, Math.min(hd, lz));
    return Math.hypot(lx - cx, lz - cz) < b.r + pad;
  };
  A.inside = function (b, hx, hz) {
    b.x = Math.max(-hx + b.r, Math.min(hx - b.r, b.x));
    b.z = Math.max(-hz + b.r, Math.min(hz - b.r, b.z));
  };
  return A;
})();
