/* Pip & Bo - Level 41-1 Carry It Together (team, World 41 Pop-Up Storybook, the first 3D level). */
'use strict';

/* ===== 41-1 Carry It Together (mode 'popcarry', team, 3D, four pages) =====
   The Bookworm's giant pencil (5 long) has to be carried through four pop-up pages to his pencil pot. It is about
   steering something long through a 3D place: who goes first, who swings wide, which way round.
   THE PENCIL: grab an end with the action button within S.grab of it (press again to let go). Each end takes one
   player; either may take either end. Holders stand S.endIn outside the ends, so with both holding they are S.gap
   apart, always eased back to that by equal small pieces (never a snap).
     Both holding: carrying, at S.carry of a run, no jumping. One holding: dragging, at S.drag, the free end trails on
     the page like a trailer (never onto a bridge, through a door or along a dotted line).
     It is solid: wall solids (wall: true in the page plan) stop it along its whole length, sampled as a capsule
     (radius S.r) at hand height. The deepest contact is pushed out with a lever split between the two holders, then
     the bodies are pushed out of the walls and the length fixed again, a few times a step. It slides, never jitters,
     never flings anyone. A new contact is a Bump (a wooden knock, at most one every 0.4 s, costs nothing).
   DROPS (counted on the HUD and in the medals): a holder falls off an edge; a door, the train or the ink hits the
     pencil or a holder; the pencil itself goes over an edge. One mishap is one drop: a holder's fall that takes the
     pencil with it counts once, and a door that knocked the pencil down stays open until its next turn. A partner who
     lets go on a bridge or the tower's ramp leaves the pencil resting in the other's hand; it only slips off a bridge
     when it is dragged on along it (after S.dragGrace). A hit knocks the pencil down where it is and both sit for
     S.sitT; a fall sends whoever fell back to the last bookmark, fluttering down like a leaf S.flutT later; when the
     pencil itself goes over, it and both players go back. The Last Page's ink sends both and the pencil back.
   BOOKMARKS: route distances in the page plan (marks). Passing one with the pencil (both holding) lights it.
   DOTTED LINES: within S.lineNear of a line the point dips to the paper; each dot it passes in order (within S.dotNear,
     both holding; up to two dots may be skipped) turns to graphite. Done: what it outlined pops up (solids switched on and off by id).
   PAGES (rooms, roomWord 'Page'): 1 The Hedge Garden (no drops possible), 2 The Folded Bridges (falls, the seesaw),
     3 Clockwork Town (pull-tab doors, the paper train, the clock tower ramp), 4 The Last Page (three lines, the ink,
     the pencil pot finish). Carrying the pencil's middle to a page's exit turns the page.
   GOLD HELP (counted, announced on a gold banner, named on the end screen): after two Splats on the Last Page the ink
   slows by a quarter; after S.guardAfter falls on any page, its edges hold you at the lip for the rest of that page.
   Carried eraser first while a line is still to draw, a paper note says "point first"; stood like that at the line
   for S.spinAfter seconds, the pencil spins round in their hands (gold help too).
   The plans are js/levels/world41/popup-pages.js (POPCARRY); the scenery is js/levels/world41/popup-scenes.js (loaded
   with the 3D kit). Rules never read the renderer: with K3D.noRender the level plays exactly the same.
   MODES.popcarry.plan(st) gives the computer partner the route facts (js/cpu/levels/world41/carry-it-together.js). */
(() => {
  const PC = POPCARRY, U = PC.U;
  const S = {
    carry: 0.8, drag: 0.35, gap: 6.0, endIn: 0.5, half: 2.5, r: 0.18, grab: 0.8, hand: 0.5, fixStep: 0.08,
    sitT: 0.6, flutT: 0.8, leafT: 0.9, knockT: 0.4, lineNear: 0.5, dotNear: 0.45, leash: 9, turnT: 1.2, finT: 4.2,
    doorBack: 1.0, goldT: 255, silverT: 400, guardAfter: 3, spinAfter: 6, dragGrace: 0.6,
  };
  const TITLES = PC.pages.map(p => p.name);
  const hyp = Math.hypot;

  /* ---------- the pencil's pose ---------- */
  // the eraser end (index 0) and the point (index 1): x, z, y
  function ends(pen) {
    const cx = Math.cos(pen.a) * S.half, cz = Math.sin(pen.a) * S.half;
    return [{ x: pen.x - cx, z: pen.z - cz, y: pen.ye }, { x: pen.x + cx, z: pen.z + cz, y: pen.yp }];
  }
  const holderOf = (st, e) => (st.hold[0] === e ? 0 : st.hold[1] === e ? 1 : -1);
  const nHeld = st => (st.hold[0] >= 0 ? 1 : 0) + (st.hold[1] >= 0 ? 1 : 0);
  const both = st => st.hold[0] >= 0 && st.hold[1] >= 0;
  const floorY = (st, x, z, y = 40) => MOVER3.floorAt(st.w, x, z, y, 0);

  /* ---------- a page (room) ---------- */
  function room(st, k) {
    const pg = PC.pages[k];
    st.k = k; st.pg = pg; st.title = TITLES[k];
    st.solids = pg.solids.map(s => Object.assign({}, s));
    st.w = MOVER3.world(st.solids);
    st.byId = {}; for (const s of st.solids) if (s.id) (st.byId[s.id] = st.byId[s.id] || []).push(s);
    st.walls = st.solids.filter(s => s.wall);
    st.R = U.route(pg.route);
    st.lines = pg.lines.map(l => ({ id: l.id, what: l.what, dots: U.dots(l.pts), n: 0, done: false, near: false, rev: 0, popT: -1, def: l }));
    st.marks = pg.marks.slice(); st.mark = 0; st.lit = pg.marks.map((m, i) => i === 0);
    st.s = 0; st.ps = [0, 0];
    st.hold = [-1, -1]; st.sit = [0, 0]; st.fallT = [-1, -1]; st.leaf = [null, null]; st.penFall = -1; st.penLeaf = null;
    st.touching = false; st.bumpQuiet = 0; st.turn = -1; st.fin = -1; st.pops = [];
    st.doors = {}; for (const d of pg.doors || []) st.doors[d.id] = { open: true, hold: 0, ph: d.phase, tick: false };
    st.train = pg.train ? { x: -99, on: false, warn: false, was: false } : null;
    st.see = pg.seesaw ? { tilt: 0 } : null;
    st.ink = pg.ink ? { s: pg.ink.from, t: 0, splats: 0, slow: false } : null;
    st.towerS = pg.tower ? st.R.cum[3] : Infinity;
    st.pageT = 0; st.dropsHere = 0; st.fallsHere = 0; st.guard = false; st.fellT = 0; st.splatT = 0; st.backT = 0; st.spinT = 0; st.spun = 0;
    // the start: the pencil on the page along the route, a player by each end
    const [px, pz, pa] = pg.start.pencil;
    const fy = floorY(st, px, pz);
    st.pen = { x: px, z: pz, a: pa, ye: fy + S.r, yp: fy + S.r, vis: 1, dip: 0 };
    G.players.forEach((p, i) => { const [x, z] = pg.start.players[i]; MOVER3.spawn(p, x, floorY(st, x, z), z); p.b3.heading = Math.PI; st.lastGround[i] = p.b3.y; });
    K3D.heading = (pg.cam && pg.cam.heading) || 0;
    st.camMode = 'follow';
    st.say = null;
  }
  // a mark's spot: the pencil's middle on the route there, along it (the point ahead)
  function markSpot(st, i) {
    const q = st.R.at(st.marks[i]);
    return { x: q.x, z: q.z, a: Math.atan2(q.tz, q.tx), tx: q.tx, tz: q.tz, s: st.marks[i] };
  }
  function toggle(st, ids, on) {
    for (const id of ids || []) for (const s of st.byId[id] || []) {
      s.ghost = !on;
      // a floor popping up under someone lifts them onto it (stairs, the stile)
      if (on && !s.wall) for (const p of G.players) {
        const b = p.b3, [lx, lz] = MOVER3.local(s, b.x, b.z);
        if (Math.abs(lx) < s.w / 2 + MOVER3.r && Math.abs(lz) < s.d / 2 + MOVER3.r) { const top = MOVER3.topAt(s, Math.max(-s.w / 2, Math.min(s.w / 2, lx))); if (top > b.y && top < b.y + 1.6) { b.y = top; b.vy = 0; } }
      }
    }
  }

  // where a dotted line starts along the route
  const lineS = (st, l) => (l.s0 != null ? l.s0 : (l.s0 = st.R.project(l.dots[0][0], l.dots[0][1])));

  /* ---------- drops ---------- */
  function countDrop(st, why) {
    st.stats.drops++; st.dropsHere++; st.stats.pageDrops[st.k]++; st.stats.why.push(st.k + 1 + ':' + why);
    Sfx.play('popcarryDrop'); rumble(0, 0.3, 0.5, 160); rumble(1, 0.3, 0.5, 160);
  }
  function releaseAll(st) { st.hold = [-1, -1]; }
  function knockDown(st) {
    const fy = floorY(st, st.pen.x, st.pen.z, Math.max(st.pen.ye, st.pen.yp) + 0.3);
    st.pen.ye = st.pen.yp = (fy > -10 ? fy : 0) + S.r;
  }
  // a door, the train: knocked down where it is, both sit for a moment
  function hitDrop(st, why) {
    countDrop(st, why); releaseAll(st); knockDown(st);
    st.sit = [S.sitT, S.sitT]; G.shake = Math.max(G.shake, 0.25);
    st.hitT = 0.8; st.hitWhy = why;
  }
  // a player fell (off a bridge, the ramp, a rise, into the hole)
  function playerFell(st, k) {
    const held = st.hold[k] >= 0;
    if (held) { countDrop(st, 'fell'); st.fellT = 1.5; }
    st.hold[k] = -1; st.fallT[k] = S.flutT;
    // gold help: after S.guardAfter falls on a page its edges fold up a paper lip (the rest of the page, nobody
    // walks off an edge: the teeter just holds them there)
    if (held && ++st.fallsHere >= S.guardAfter && !st.guard) { st.guard = true; goldHelp(st, 'Paper edges fold up: no more falling off this page', 'edges'); }
    if (st.pg.splash) { Sfx.play('popcarrySplash'); st.splashAt = { x: G.players[k].b3.x, z: G.players[k].b3.z, t: 1.2 }; }
  }
  function pencilFell(st) {
    // (a holder's fall that takes the pencil with it is one drop, not two)
    if (!(st.fellT > 0)) countDrop(st, 'pencil fell');
    releaseAll(st); st.penFall = S.flutT; st.pen.vis = 0;
    if (st.pg.splash) Sfx.play('popcarrySplash');
    // the page whisks both back to the bookmark with it (nobody walks back down a tower or across a river for it)
    for (const k of [0, 1]) if (st.fallT[k] < 0 && !st.leaf[k]) st.fallT[k] = S.flutT;
  }
  // the Last Page's ink: both and the pencil back to the bookmark, the ink pulled back
  function splat(st) {
    countDrop(st, 'ink'); releaseAll(st);
    st.ink.splats++; st.splatT = 0.9; Sfx.play('popcarrySplat'); G.shake = Math.max(G.shake, 0.3);
    st.fallT = [S.flutT, S.flutT]; st.penFall = S.flutT; st.pen.vis = 0;
    st.ink.s = Math.min(st.ink.s, st.marks[st.mark] - st.pg.ink.back);
    if (!st.ink.slow && st.ink.splats >= st.pg.ink.slowAfter) {
      st.ink.slow = true; goldHelp(st, 'The ink is slowing down', 'ink');
    }
  }
  // a catch-up help: counted, announced on a gold banner, named on the end screen
  function goldHelp(st, msg, what) {
    st.stats.helps++; st.stats.helpWhat.push(what); st.goldT = 3.5; st.goldMsg = msg; Sfx.play('popcarryFwip');
  }
  // fluttering back down at the last bookmark
  function leafDown(st, k) {
    const m = markSpot(st, st.mark), b = G.players[k].b3;
    // with the pencil coming back too: one at each end; else beside the mark
    const side = k === 0 ? -1 : 1;
    let x, z;
    if (st.penFall >= 0 || st.penLeaf) { x = m.x + m.tx * side * (S.half + S.endIn); z = m.z + m.tz * side * (S.half + S.endIn); }
    else { x = m.x - m.tz * 0.8 * side; z = m.z + m.tx * 0.8 * side; }
    // never over an edge: pulled in toward the mark until there is floor all round the body
    const ok = (x2, z2) => { const f0 = floorY(st, m.x, m.z); return [[0, 0], [0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]].every(([dx, dz]) => floorY(st, x2 + dx, z2 + dz) > f0 - 0.3); };
    for (let k = 0; k < 12 && !ok(x, z); k++) { x += (m.x - x) * 0.25; z += (m.z - z) * 0.25; }
    const fy = floorY(st, x, z);
    Object.assign(b, { x, z, y: fy + 2.6, vx: 0, vy: 0, vz: 0, ground: false });
    st.leaf[k] = { t: 0, x, z, y0: fy + 2.6, y1: fy };
    st.ps[k] = st.R.project(x, z, m.s, 4);
  }
  function penLeafDown(st) {
    const m = markSpot(st, st.mark), fy = floorY(st, m.x, m.z);
    Object.assign(st.pen, { x: m.x, z: m.z, a: m.a, ye: fy + 2.4, yp: fy + 2.4, vis: 1 });
    st.penLeaf = { t: 0, y0: fy + 2.4, y1: fy + S.r };
    st.s = m.s;
  }

  /* ---------- the pencil against the walls ---------- */
  // the deepest contact of the capsule (eraser end to point) with a wall: { t (0 eraser .. 1 point), nx, nz, d }
  function deepest(st, E, dragged) {
    let best = null;
    const N = 21, R = S.r;
    const minX = Math.min(E[0].x, E[1].x) - 1, maxX = Math.max(E[0].x, E[1].x) + 1, minZ = Math.min(E[0].z, E[1].z) - 1, maxZ = Math.max(E[0].z, E[1].z) + 1;
    for (const s of st.walls) {
      if (s.ghost && !(dragged && s.door)) continue;
      const ext = Math.max(s.w, s.d) / 2 + 0.5;
      if (s.x + ext < minX || s.x - ext > maxX || s.z + ext < minZ || s.z - ext > maxZ) continue;
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1), x = E[0].x + (E[1].x - E[0].x) * t, z = E[0].z + (E[1].z - E[0].z) * t, y = E[0].y + (E[1].y - E[0].y) * t;
        if (s.y1 <= y - R || s.y0 >= y + R) continue;
        const [lx, lz] = MOVER3.local(s, x, z), hw = s.w / 2, hd = s.d / 2;
        if (Math.abs(lx) > hw + R || Math.abs(lz) > hd + R) continue;
        const cx = Math.max(-hw, Math.min(hw, lx)), cz = Math.max(-hd, Math.min(hd, lz));
        let nx = lx - cx, nz = lz - cz, d = hyp(nx, nz), pen;
        if (d < 1e-6) {
          const ex = hw - Math.abs(lx), ez = hd - Math.abs(lz);
          if (ex < ez) { nx = Math.sign(lx) || 1; nz = 0; pen = ex + R; } else { nx = 0; nz = Math.sign(lz) || 1; pen = ez + R; }
        } else { pen = R - d; nx /= d; nz /= d; }
        if (pen <= 1e-4) continue;
        const wx = nx * s.c + nz * s.s, wz = -nx * s.s + nz * s.c;
        if (!best || pen > best.d) best = { t, nx: wx, nz: wz, d: pen, s };
      }
    }
    return best;
  }
  // both holding: the pencil follows the two holders (eraser holder A, point holder B)
  function poseFromHolders(st) {
    const A = G.players[holderOf(st, 0)].b3, B = G.players[holderOf(st, 1)].b3;
    const dx = B.x - A.x, dz = B.z - A.z, l = hyp(dx, dz) || 1;
    st.pen.a = Math.atan2(dz / l, dx / l);
    st.pen.x = (A.x + B.x) / 2; st.pen.z = (A.z + B.z) / 2;
    st.pen.ye = A.y + S.hand; st.pen.yp = B.y + S.hand;
  }
  // ease the holders back to S.gap apart, half each, in small pieces
  function fixLength(st, cap) {
    const A = G.players[holderOf(st, 0)].b3, B = G.players[holderOf(st, 1)].b3;
    const dx = B.x - A.x, dz = B.z - A.z, l = hyp(dx, dz) || 1, err = l - S.gap;
    const c = Math.max(-cap, Math.min(cap, err / 2)), ux = dx / l, uz = dz / l;
    // the pencil never shoves a holder off an edge: a share that would go over a drop goes to the other holder
    const safe = (b, mx, mz) => !b.ground || MOVER3.floorAt(st.w, b.x + mx, b.z + mz, b.y + MOVER3.stepUp) >= b.y - MOVER3.teeterDrop;
    let ca = c, cb = c;
    if (!safe(A, ux * c, uz * c)) { ca = 0; cb = safe(B, -ux * c * 2, -uz * c * 2) ? c * 2 : 0; }
    else if (!safe(B, -ux * c, -uz * c)) { cb = 0; ca = safe(A, ux * c * 2, uz * c * 2) ? c * 2 : 0; }
    A.x += ux * ca; A.z += uz * ca; B.x -= ux * cb; B.z -= uz * cb;
    // and no speed pulling them apart or together
    const rv = (B.vx - A.vx) * ux + (B.vz - A.vz) * uz;
    if (rv * err > 0) { A.vx += ux * rv / 2; A.vz += uz * rv / 2; B.vx -= ux * rv / 2; B.vz -= uz * rv / 2; }
  }
  const stopInto = (b, nx, nz) => { const vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= vn * nx; b.vz -= vn * nz; } };
  function carry(st) {
    let hit = null;
    const A = G.players[holderOf(st, 0)].b3, B = G.players[holderOf(st, 1)].b3;
    fixLength(st, S.fixStep * 0.5);
    for (let it = 0; it < 4; it++) {
      poseFromHolders(st);
      const c = deepest(st, ends(st.pen), false);
      if (!c) break;
      hit = hit || c;
      // the contact's place between the holders (0 at A, 1 at B), and the lever split that moves it out exactly
      const tt = (S.endIn + c.t * S.half * 2) / S.gap, k = 1 / ((1 - tt) * (1 - tt) + tt * tt);
      const da = (1 - tt) * k * c.d, db = tt * k * c.d;
      A.x += c.nx * da; A.z += c.nz * da; B.x += c.nx * db; B.z += c.nz * db;
      stopInto(A, c.nx, c.nz); stopInto(B, c.nx, c.nz);
      MOVER3.push(st.w, A); MOVER3.push(st.w, B);
      fixLength(st, S.fixStep);
    }
    poseFromHolders(st);
    return hit;
  }
  // one holding: the free end trails (rotating about the holder), at the page
  function drag(st, k) {
    const H = G.players[k].b3, e = st.hold[k];
    let hit = null;
    const place = () => {
      let dx = st.pen.x - H.x, dz = st.pen.z - H.z, l = hyp(dx, dz) || 1;
      // (eased, and never faster than a walk: grabbing an end from the inside slides the pencil out gently)
      const want = S.endIn + S.half, d = l + Math.max(-0.05, Math.min(0.05, (want - l) * 0.35));
      st.pen.x = H.x + dx / l * d; st.pen.z = H.z + dz / l * d;
      // eraser to point: away from the holder if they hold the eraser
      st.pen.a = e === 0 ? Math.atan2(dz, dx) : Math.atan2(-dz, -dx);
      const E = ends(st.pen), fe = E[1 - e], fy = floorY(st, fe.x, fe.z, H.y + 1.5);
      if (e === 0) { st.pen.ye = H.y + S.hand; st.pen.yp = (fy > -10 ? fy : H.y) + S.r; } else { st.pen.yp = H.y + S.hand; st.pen.ye = (fy > -10 ? fy : H.y) + S.r; }
    };
    place();
    for (let it = 0; it < 4; it++) {
      const c = deepest(st, ends(st.pen), true);
      if (!c) break;
      hit = hit || c;
      const tt = (S.endIn + (e === 0 ? c.t : 1 - c.t) * S.half * 2) / S.gap;
      const m = 0.5 / Math.max(0.25, tt);
      st.pen.x += c.nx * c.d * m; st.pen.z += c.nz * c.d * m;
      if (tt < 0.35) { H.x += c.nx * c.d; H.z += c.nz * c.d; stopInto(H, c.nx, c.nz); MOVER3.push(st.w, H); }
      place();
    }
    return hit;
  }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.pg) return;
    const ps = G.players, pg = st.pg;
    st.t += dt; st.pageT += dt;
    if (st.goldT > 0) st.goldT -= dt;
    if (st.hitT > 0) st.hitT -= dt;
    if (st.fellT > 0) st.fellT -= dt;
    if (st.splatT > 0) st.splatT -= dt;
    if (st.spun > 0) st.spun -= dt;
    if (st.splashAt && (st.splashAt.t -= dt) <= 0) st.splashAt = null;
    for (const pp of st.pops) pp.t += dt;
    // the page turning, the finish: nobody moves
    if (st.turn >= 0) {
      st.turn += dt;
      if (st.turn >= S.turnT) { st.turn = -1; st.stats.pageT.push(st.pageT); nextRoom(); }
      return;
    }
    if (st.fin >= 0) {
      st.fin += dt;
      if (st.fin >= S.finT && G.mode === 'play') { st.stats.pageT.push(st.pageT); levelClear(); }
      return;
    }
    const intro = G.introT > 0;
    mechanisms(st, dt);
    // grabbing and letting go
    for (const p of ps) {
      const k = p.id, b = p.b3;
      if (!p.pendingAct) continue;
      p.pendingAct = false;
      if (intro || st.sit[k] > 0 || st.fallT[k] >= 0 || st.leaf[k]) continue;
      if (st.hold[k] >= 0) { st.hold[k] = -1; Sfx.play('popcarryGrab', 0); continue; }
      if (st.penFall >= 0 || st.penLeaf || !b.ground) continue;
      const E = ends(st.pen);
      let best = -1, bd = S.grab + S.endIn;
      for (const e of [0, 1]) {
        if (holderOf(st, e) >= 0) continue;
        const d = hyp(E[e].x - b.x, E[e].z - b.z);
        if (d < bd && Math.abs(E[e].y - S.r - b.y) < 1.2) { bd = d; best = e; }
      }
      if (best >= 0) {
        st.hold[k] = best; Sfx.play('popcarryGrab', 1);
        // the first grab lifts the pencil to hand height from this holder's end
        if (nHeld(st) === 1) st.pen[best === 0 ? 'ye' : 'yp'] = b.y + S.hand;
        st.grabbed = true;
      }
    }
    // moving: carrying 80%, dragging 35%, free 100% (hands-free players can jump)
    const n = nHeld(st);
    for (const p of ps) {
      const k = p.id, b = p.b3;
      if (st.leaf[k]) {
        const L = st.leaf[k]; L.t += dt;
        const f = Math.min(1, L.t / S.leafT);
        b.x = L.x; b.z = L.z; b.y = L.y0 + (L.y1 - L.y0) * f; b.vx = b.vz = b.vy = 0;
        if (f >= 1) { st.leaf[k] = null; b.ground = true; st.lastGround[k] = b.y; }
        continue;
      }
      if (st.fallT[k] >= 0) {
        st.fallT[k] -= dt;
        MOVER3.step(p, st.w, dt, { dir: { x: 0, z: 0, s: 0 }, jump: false, teeter: false });
        if (st.fallT[k] < 0) leafDown(st, k);
        continue;
      }
      const sit = st.sit[k] > 0; if (sit) st.sit[k] -= dt;
      const holding = st.hold[k] >= 0;
      const speed = holding ? (n === 2 ? S.carry : S.drag) : 1;
      const dir = intro || sit ? { x: 0, z: 0, s: 0 } : K3D.moveDir(p);
      if (intro || sit || holding) p.pendingJump = false;
      MOVER3.step(p, st.w, dt, { speed, dir, jump: !holding, teeter: true, guard: st.guard });
      if (b.whoa) Sfx.play('popcarryWhoa');
    }
    // the hands-free leash: two free players are kept within S.leash of each other (softly)
    if (n === 0 && !st.leaf[0] && !st.leaf[1] && st.fallT[0] < 0 && st.fallT[1] < 0) {
      const a = ps[0].b3, c = ps[1].b3, d = hyp(c.x - a.x, c.z - a.z);
      if (d > S.leash) { const f = (d - S.leash) * 0.08 / d, mx = (c.x - a.x) * f, mz = (c.z - a.z) * f; a.x += mx; a.z += mz; c.x -= mx; c.z -= mz; MOVER3.push(st.w, a); MOVER3.push(st.w, c); }
    }
    if (n < 2) MOVER3.separate(ps[0].b3, ps[1].b3);
    // the pencil
    let hit = null;
    if (st.penFall >= 0) { st.penFall -= dt; if (st.penFall < 0) penLeafDown(st); }
    else if (st.penLeaf) {
      const L = st.penLeaf; L.t += dt;
      const f = Math.min(1, L.t / S.leafT); st.pen.ye = st.pen.yp = L.y0 + (L.y1 - L.y0) * f;
      if (f >= 1) st.penLeaf = null;
    } else if (n === 2) hit = carry(st);
    else if (n === 1) hit = drag(st, st.hold[0] >= 0 ? 0 : 1);
    // bumps: a new contact knocks (at most one every S.knockT)
    if (st.bumpQuiet > 0) st.bumpQuiet -= dt;
    if (hit && hit.d > 0.008) {
      if (!st.touching && st.bumpQuiet <= 0) { st.stats.bumps++; Sfx.play('popcarryKnock'); st.bumpQuiet = S.knockT; st.knockAt = { x: st.pen.x, z: st.pen.z, t: 0.3 }; }
      st.touching = true;
    } else st.touching = false;
    if (n === 1) { st.scrape = (st.scrape || 0) + dt; if (st.scrape > 0.45) { st.scrape = 0; if (hyp(ps[0].b3.vx + ps[1].b3.vx, ps[0].b3.vz + ps[1].b3.vz) > 0.3) Sfx.play('popcarryScrape'); } }
    // falls: a player well below where they last stood (or under the page)
    for (const p of ps) {
      const k = p.id, b = p.b3;
      if (st.fallT[k] >= 0 || st.leaf[k]) continue;
      if (b.ground) st.lastGround[k] = b.y;
      if (b.y < st.lastGround[k] - (pg.fallH || 0.9) || b.y < -1.5) playerFell(st, k);
    }
    // the pencil over an edge: not carried, and nothing under its middle and both ends (a dragged pencil also slips
    // off a bridge or a plank)
    if (n !== 1) st.dragT = 0;
    if (n < 2 && st.penFall < 0 && !st.penLeaf && st.pen.vis) {
      // (measured from the holder's feet while dragged, else from where the pencil lies)
      const E = ends(st.pen), y = n === 1 ? G.players[st.hold[0] >= 0 ? 0 : 1].b3.y : Math.min(st.pen.ye, st.pen.yp) - S.r;
      // (only while it is being dragged along: a partner who lets go on a bridge leaves it resting in the other's
      // hand, to be picked up again, as it rests when both let go)
      // (and the one left holding has a moment to stop: S.dragGrace of walking on with it before it slips)
      const hb = n === 1 ? G.players[st.hold[0] >= 0 ? 0 : 1].b3 : null;
      st.dragT = hb ? (st.dragT || 0) + (hyp(hb.vx, hb.vz) > 0.3 ? dt : 0) : 0;
      const dragging = st.dragT > S.dragGrace;
      // (the free end of a pencil held by one may lie a little lower than their feet: down the tower's ramp, where
      // letting go must leave it resting, not send both back to the foot of the tower)
      const free = n === 1 ? 1 - (st.hold[0] >= 0 ? st.hold[0] : st.hold[1]) : -1;
      const under = (q, drop = 0.9) => { const f = floorY(st, q.x, q.z, y + 0.4); return f > y - drop && !(dragging && MOVER3._on && /bridge|plank|seesaw/.test(MOVER3._on.kind)); };
      const sup = [under({ x: st.pen.x, z: st.pen.z }), under(E[0], free === 0 ? 1.25 : 0.9), under(E[1], free === 1 ? 1.25 : 0.9)];
      if (sup.filter(Boolean).length < 2 || (n === 1 && !sup[2 - (st.hold[0] >= 0 ? st.hold[0] : st.hold[1])])) pencilFell(st);
    }
    // where the pencil (and each player) is along the route
    st.s = st.R.project(st.pen.x, st.pen.z, st.s, 6);
    ps.forEach((p, k) => { st.ps[k] = st.R.project(p.b3.x, p.b3.z, st.ps[k], 8); });
    // carried eraser first with a line still to draw on this page: a paper note says so (only the point draws, and
    // a hedge path is too narrow to turn the pencil round in later)
    if (both(st) && st.lines.some(l => !l.done) && st.ps[holderOf(st, 0)] > st.ps[holderOf(st, 1)] + 2) st.backT = (st.backT || 0) + dt; else st.backT = 0;
    // gold help: stood eraser first at a line that is waiting to be drawn (or past it) for S.spinAfter seconds, the
    // pencil spins itself round in their hands, so whoever is in front has the point (a hedge path, a bridge or a
    // narrow bank has no room to turn a pencil this long; nobody should have to walk back a whole page)
    if (st.backT > 0 && st.lines.some(l => !l.done && st.s > lineS(st, l) - 3.5)) {
      if ((st.spinT = (st.spinT || 0) + dt) >= S.spinAfter) {
        st.spinT = 0; st.backT = 0; st.hold = st.hold.map(e => 1 - e); poseFromHolders(st); st.spun = 0.6;
        goldHelp(st, 'The pencil spins round: point first!', 'spin');
      }
    } else st.spinT = 0;
    // bookmarks light as the carried pencil passes them
    if (both(st)) for (let i = st.mark + 1; i < st.marks.length; i++) if (st.s >= st.marks[i] - 0.5 && st.s < st.marks[i] + 6) { st.mark = i; st.lit[i] = true; Sfx.play('popcarryTick'); }
    // dotted lines
    lines(st, dt);
    // the camera's heading (game state, never the picture): Clockwork Town's tower turns it with the players
    heading(st);
    // the way on
    if (pg.exit && both(st) && hyp(st.pen.x - pg.exit.x, st.pen.z - pg.exit.z) < pg.exit.r && (pg.exit.y == null || Math.min(st.pen.ye, st.pen.yp) > pg.exit.y)) {
      st.turn = 0; Sfx.play(st.k === 2 ? 'popcarryBell' : 'popcarryPageTurn'); if (st.k === 2) st.clockT = 0;
    }
    if (pg.pot && both(st) && hyp(st.pen.x - pg.pot.mark[0], st.pen.z - pg.pot.mark[1]) < pg.pot.r) { st.fin = 0; Sfx.play('popcarryClunk'); }
    // the act word: "grab" or "let go" for each player
    if (typeof setActWords === 'function') setActWords([st.hold[0] >= 0 ? 'let go' : 'grab', st.hold[1] >= 0 ? 'let go' : 'grab']);
    void intro;
  }

  function lines(st, dt) {
    const E = ends(st.pen)[1];
    st.pen.dip = 0;
    for (const L of st.lines) {
      if (L.done) { L.near = false; if (L.popT >= 0) L.popT += dt; continue; }
      const y = L.def.y || 0;
      // near the line (on its level): the point dips to the paper by itself
      L.near = Math.abs(E.y - S.hand - y) < 0.9 && U.lineDist(E.x, E.z, L.dots) < S.lineNear;
      if (!L.near) continue;
      st.pen.dip = 1;
      if (!both(st)) continue;
      let moved = false;
      // (in order, but a dot or two skipped in a hurry still counts: the point near any of the next three dots
      // inks up to it)
      for (let go = true; go;) {
        go = false;
        for (let j = L.n; j < Math.min(L.dots.length, L.n + 3); j++) if (hyp(L.dots[j][0] - E.x, L.dots[j][1] - E.z) < S.dotNear) { L.n = j + 1; moved = go = true; break; }
      }
      if (moved) { st.scratch = (st.scratch || 0) + 1; if (st.scratch % 3 === 1) Sfx.play('popcarryScratch'); }
      if (L.n >= L.dots.length) {
        L.done = true; L.popT = 0; st.stats.lines++;
        Sfx.play('popcarryFwip');
        toggle(st, L.def.done.off, false);
        if (L.def.done.stagger) L.def.done.on.forEach((id, i) => st.pops.push({ id, t: -i * L.def.done.stagger }));
        else toggle(st, L.def.done.on, true);
        st.drew = { what: L.what, t: 2.2 };
      }
    }
    // staggered pop-ups (planks one by one)
    for (const pp of st.pops) if (!pp.on && pp.t >= 0) { pp.on = true; toggle(st, [pp.id], true); Sfx.play('popcarryFwip'); }
    if (st.drew && (st.drew.t -= dt) <= 0) st.drew = null;
  }

  function heading(st) {
    const pg = st.pg;
    if (pg.tower && st.s > st.towerS - 3) {
      const a = Math.atan2(st.pen.z - pg.tower.z, st.pen.x - pg.tower.x);
      // the camera sits outside the tower at the players' angle, looking in: up walks toward the tower
      K3D.heading = Math.PI / 2 - a; st.camMode = 'tower'; st.towerA = a;
    } else { K3D.heading = (pg.cam && pg.cam.heading) || 0; st.camMode = 'follow'; }
  }

  /* ---------- doors, the train, the seesaw, the ink ---------- */
  function overlapsBox(s, x, z, r) {
    const [lx, lz] = MOVER3.local(s, x, z);
    return Math.abs(lx) < s.w / 2 + r && Math.abs(lz) < s.d / 2 + r;
  }
  function pencilIn(st, s, pad = 0) {
    if (!st.pen.vis) return false;
    const E = ends(st.pen);
    for (let i = 0; i <= 10; i++) { const t = i / 10; if (overlapsBox(s, E[0].x + (E[1].x - E[0].x) * t, E[0].z + (E[1].z - E[0].z) * t, S.r + pad)) return true; }
    return false;
  }
  function mechanisms(st, dt) {
    const pg = st.pg, ps = G.players;
    // pull-tab doors: open, a ticking wiggle, then shut. Shutting on the pencil or a holder is a drop: it springs open
    if (pg.doors) {
      const DT = pg.doorT, cyc = DT.open + DT.tick + DT.shut;
      for (const d of pg.doors) {
        const D = st.doors[d.id], s = st.byId[d.id][0];
        const t = (st.t + d.phase) % cyc, wantOpen = t < DT.open + DT.tick || D.hold > 0;
        D.tick = t >= DT.open && t < DT.open + DT.tick && D.hold <= 0;
        if (D.hold > 0) D.hold -= dt;
        if (D.tick && !D.wasTick) Sfx.play('popcarryTick');
        D.wasTick = D.tick;
        if (!wantOpen && D.open) {
          // closing: anything in the doorway?
          const inBody = ps.some(p => overlapsBox(s, p.b3.x, p.b3.z, MOVER3.r) && p.b3.y < s.y1);
          const inPen = pencilIn(st, s);
          if (inBody || inPen) {
            D.hold = S.doorBack;
            const holderIn = ps.some(p => st.hold[p.id] >= 0 && overlapsBox(s, p.b3.x, p.b3.z, MOVER3.r));
            // (a pencil only waiting in the doorway, held by one or nobody, just keeps the door open: not a drop)
            // (after a drop it stays open until its next turn to open: picking the pencil straight up again in the
            // doorway is never a second drop from the same shutting)
            if ((inPen && both(st)) || holderIn) { hitDrop(st, 'door'); D.hold = cyc - t + 0.05; }
            Sfx.play('popcarryDoorCreak');
            continue;
          }
          D.open = false; s.ghost = false; Sfx.play('popcarryDoorCreak');
        } else if (wantOpen && !D.open) { D.open = true; s.ghost = true; Sfx.play('popcarryDoorCreak'); }
        D.f = D.open ? Math.min(1, (D.f || 0) + dt * 4) : Math.max(0, (D.f || 0) - dt * 4);
      }
    }
    // the paper train: a bell and the crossing arms, then it crosses the street
    if (st.train) {
      const T = pg.train, Tr = st.train, s = st.byId.train[0];
      const t = (st.t + T.offset) % T.period, run = (T.x1 - T.x0 + T.len) / T.speed;
      Tr.warn = t < T.warn;
      if (Tr.warn && !Tr.wasWarn) Sfx.play('popcarryBell');
      Tr.wasWarn = Tr.warn;
      Tr.on = t >= T.warn && t < T.warn + run;
      const front = T.x0 + (t - T.warn) * T.speed;
      Tr.x = Tr.on ? front - T.len / 2 : T.x0 - T.len;
      if (Tr.on && !Tr.was) Sfx.play('popcarryToot');
      Tr.was = Tr.on;
      s.x = Tr.x; s.ghost = !Tr.on;
      if (Tr.on) {
        let hitHolder = false, hitAny = false;
        for (const p of ps) {
          const b = p.b3;
          if (overlapsBox(s, b.x, b.z, MOVER3.r) && b.y < s.y1) { hitAny = true; if (st.hold[p.id] >= 0) hitHolder = true; b.z = b.z < T.z ? T.z - s.d / 2 - MOVER3.r - 0.15 : T.z + s.d / 2 + MOVER3.r + 0.15; MOVER3.push(st.w, b); st.sit[p.id] = S.sitT; }
        }
        const inPen = pencilIn(st, s);
        if (inPen) {
          hitAny = true; if (nHeld(st) > 0) hitHolder = true;
          // knocked off the track to the side its middle is on
          const E = ends(st.pen), zs = st.pen.z < T.z ? -1 : 1;
          const far = zs < 0 ? Math.max(E[0].z, E[1].z) - (T.z - s.d / 2 - S.r - 0.2) : (T.z + s.d / 2 + S.r + 0.2) - Math.min(E[0].z, E[1].z);
          if (far > 0) st.pen.z -= zs * far;
        }
        if (hitHolder) hitDrop(st, 'train'); else if (hitAny) Sfx.play('popcarryKnock');
      }
    }
    // the seesaw: one person out past S.calm tips it toward them; two on it stay nearly level
    if (st.see) {
      const SS = pg.seesaw, s = st.byId.seesaw[0];
      const onP = ps.filter(p => p.b3.ground && p.b3.on === s), on = onP.map(p => p.b3.z - SS.z);
      // a partner holding the pencil from the bank on the side it leans to steadies it (so the last one across can
      // walk off: only stepping out alone toward the far side with the partner behind tips it)
      const off = onP.length === 1 && ps.find(p => p !== onP[0]);
      const steady = off && st.hold[0] >= 0 && st.hold[1] >= 0 && off.b3.ground && off.b3.on !== s &&
        Math.sign(off.b3.z - SS.z) === Math.sign(on[0]) && Math.abs(off.b3.z - SS.z) > SS.half - 0.3;
      let want = 0;
      if (steady) want = Math.sign(on[0]) * 0.12;
      else if (on.length === 1 && Math.abs(on[0]) > SS.calm) want = Math.sign(on[0]) * SS.tip;
      else if (on.length === 2) want = Math.max(-0.12, Math.min(0.12, (on[0] + on[1]) * 0.03));
      const was = st.see.tilt;
      st.see.tilt += Math.max(-dt * 2.2, Math.min(dt * 2.2, want - st.see.tilt));
      if (Math.abs(st.see.tilt - was) > 1e-5) {
        const base = s.y1 - s.y0;
        s.ramp.h0 = base + st.see.tilt; s.ramp.h1 = base - st.see.tilt;
        // standing bodies ride it
        for (const p of ps) { const b = p.b3; if (b.ground && b.on === s) { const [lx] = MOVER3.local(s, b.x, b.z); b.y = MOVER3.topAt(s, Math.max(-s.w / 2, Math.min(s.w / 2, lx))); } }
        if (Math.abs(want) > 0.5 && Math.abs(st.see.tilt) < 0.1) Sfx.play('popcarryWhoa');
      }
    }
    // the ink: after a head start it spreads along the route; touching a holder or the pencil is a Splat
    if (st.ink && st.fallT[0] < 0 && st.fallT[1] < 0 && !st.leaf[0] && !st.leaf[1] && st.penFall < 0 && !st.penLeaf) {
      const I = pg.ink, ink = st.ink;
      ink.t += dt;
      if (ink.t > I.delay && G.introT <= 0) ink.s += I.speed * (ink.slow ? I.slow : 1) * dt;
      if (ink.t > I.delay - 0.6 && !ink.tipped) { ink.tipped = true; Sfx.play('popcarrySplat'); }
      const E = ends(st.pen), inInk = (x, z, s0) => { const s = st.R.project(x, z, s0, 10); return s < ink.s && U.lineDist(x, z, st.R.pts) < I.width + 2; };
      const touched = ps.some(p => st.hold[p.id] >= 0 && inInk(p.b3.x, p.b3.z, st.ps[p.id])) || (nHeld(st) > 0 && (inInk(E[0].x, E[0].z, st.s) || inInk(E[1].x, E[1].z, st.s)));
      if (touched) splat(st);
      // a hands-free player standing in the ink is just pushed out ahead of it (no drop)
      else for (const p of ps) if (st.hold[p.id] < 0 && inInk(p.b3.x, p.b3.z, st.ps[p.id])) { const q = st.R.at(ink.s + 1.2); p.b3.x += (q.x - p.b3.x) * 0.05; p.b3.z += (q.z - p.b3.z) * 0.05; }
    }
  }

  /* ---------- what the computer partner reads ---------- */
  function plan(st) {
    if (!st.pg) return null;
    const E = ends(st.pen);
    return { pen: st.pen, ends: E, hold: st.hold.slice(), R: st.R, s: st.s, ps: st.ps.slice(), lines: st.lines, doors: st.doors, train: st.train, see: st.see, ink: st.ink,
      busy: st.turn >= 0 || st.fin >= 0, gap: S.gap, endIn: S.endIn, grab: S.grab, half: S.half, k: st.k, pg: st.pg, marks: st.marks, mark: st.mark,
      sit: st.sit.slice(), away: [0, 1].map(k => st.fallT[k] >= 0 || !!st.leaf[k]), penAway: st.penFall >= 0 || !!st.penLeaf, ends3: E, towerS: st.towerS };
  }

  /* ---------- 2D on top: prompts, the Bookworm, progress by a line ---------- */
  const scr = (x, y, z) => K3D.toScreen ? K3D.toScreen(x, y, z) : { x: 0, y: 0, z: 2 };
  function drawTop(st) {
    if (!st.pg || !K3D.toScreen) return;
    const ps = G.players, E = ends(st.pen);
    // a prompt over a free end when a player is near it
    if (st.turn < 0 && st.fin < 0 && st.penFall < 0 && !st.penLeaf) for (const p of ps) {
      if (isCpuPlayer(p.id) || st.hold[p.id] >= 0) continue;
      const b = p.b3;
      for (const e of [0, 1]) {
        if (holderOf(st, e) >= 0) continue;
        if (hyp(E[e].x - b.x, E[e].z - b.z) > S.grab + S.endIn + 0.6) continue;
        const q = scr(E[e].x, E[e].y + 0.55, E[e].z);
        if (q.z > 1) continue;
        const pulse = 0.85 + Math.sin(G.clock * 5) * 0.15;
        drawBtn(p.id, 'act', q.x, q.y - 10, { label: 'grab', alpha: pulse });
        break;
      }
    }
    // the start of each page: a glowing hint at each free end (before anyone has grabbed)
    if (!st.grabbed && st.pageT < 12 && st.turn < 0) for (const e of [0, 1]) {
      const q = scr(E[e].x, E[e].y + 0.1, E[e].z);
      if (q.z > 1) continue;
      ctx.save(); ctx.globalAlpha = 0.45 + Math.sin(G.clock * 4 + e) * 0.25;
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 26); g.addColorStop(0, 'rgba(255,215,110,0.9)'); g.addColorStop(1, 'rgba(255,215,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, 26, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // a thin progress bar by a dotted line being drawn
    for (const L of st.lines) {
      if (L.done || !L.n) continue;
      const d = L.dots[Math.min(L.n, L.dots.length - 1)], q = scr(d[0], (L.def.y || 0) + 0.1, d[1]);
      if (q.z > 1) continue;
      const f = L.n / L.dots.length, w = 54;
      ctx.fillStyle = 'rgba(23,25,29,0.7)'; rr(q.x - w / 2 - 3, q.y + 16, w + 6, 10, 5); ctx.fill();
      ctx.fillStyle = '#3a3742'; rr(q.x - w / 2, q.y + 18, w, 6, 3); ctx.fill();
      ctx.fillStyle = C.gold; rr(q.x - w / 2, q.y + 18, Math.max(6, w * f), 6, 3); ctx.fill();
    }
    // the Bookworm's line under the page card (a worm in glasses and typed text)
    if (G.introT > 0 && !G.introQuick) {
      const a = Math.min(1, G.introT / 0.5), y = introCardBottom() + 14, line = st.pg.worm;
      const typed = line.slice(0, Math.floor(Math.max(0, 3.4 - G.introT) * 46 + 4));
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = 'italic 15px Georgia, "DejaVu Serif", serif';
      const tw = Math.min(W - 60, ctx.measureText(line).width + 86);
      ctx.fillStyle = 'rgba(246,239,223,0.95)'; rr(W / 2 - tw / 2, y, tw, 40, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(43,33,48,0.35)'; ctx.lineWidth = 1.5; rr(W / 2 - tw / 2, y, tw, 40, 14); ctx.stroke();
      wormIcon(W / 2 - tw / 2 + 26, y + 21, 1);
      ctx.fillStyle = '#3b3040'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(typed, W / 2 - tw / 2 + 52, y + 21, tw - 64);
      ctx.restore();
    }
    // "Splash!", "Splat!", what a line drew, the gold ink banner
    const flash = (txt, col, t) => { ctx.save(); ctx.globalAlpha = Math.min(1, t * 3); text(txt, W / 2, 128, 34, col, 'center'); ctx.restore(); };
    if (st.splashAt) flash('Splash!', '#7fc4ea', st.splashAt.t);
    if (st.hitT > 0) flash(st.hitWhy === 'train' ? 'Toot toot! Drop!' : 'Bump! Drop!', C.paper, st.hitT);
    if (st.splatT > 0) flash('Splat!', '#9aa6d8', st.splatT);
    if (st.drew) { ctx.save(); ctx.globalAlpha = Math.min(1, st.drew.t * 2); text('You drew ' + st.drew.what + '!', W / 2, 128, 24, C.gold, 'center'); ctx.restore(); }
    if (st.backT > 1.5 && !(st.goldT > 0)) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (st.backT - 1.5) * 2);
      ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif'; const s = 'Only the point draws. Carry the pencil point first!', w = ctx.measureText(s).width + 36;
      ctx.fillStyle = 'rgba(246,239,223,0.96)'; rr(W / 2 - w / 2, 92, w, 30, 15); ctx.fill(); text(s, W / 2, 107.5, 15, '#3b3040', 'center', 'body'); ctx.restore();
    }
    if (st.goldT > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, st.goldT * 2);
      ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif'; const s = st.goldMsg || '', w = ctx.measureText(s).width + 36;
      ctx.fillStyle = 'rgba(255,197,61,0.95)'; rr(W / 2 - w / 2, 92, w, 30, 15); ctx.fill(); text(s, W / 2, 107.5, 15, '#3a2a08', 'center', 'body'); ctx.restore();
    }
  }
  // the Bookworm: a green worm in round glasses (2D, on cards and the HUD)
  function wormIcon(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#7cc46a'; ctx.strokeStyle = '#2b2130'; ctx.lineWidth = 1.6;
    for (let i = 3; i >= 0; i--) { ctx.beginPath(); ctx.arc(-11 + i * 5, 6 - Math.sin(i * 1.1) * 3, 5.2 - i * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(6, -4, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; for (const ex of [2.5, 9.5]) { ctx.beginPath(); ctx.arc(ex, -5, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#2b2130'; for (const ex of [3, 10]) { ctx.beginPath(); ctx.arc(ex, -4.6, 1.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(5.9, -5); ctx.lineTo(6.1, -5); ctx.stroke();
    ctx.restore();
  }

  function hud(st) {
    if (!st.pg) return;
    // the time and the drops (kept out of the top-right corner, where the Menu button sits)
    const s = fmtTime(G.time);
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(s).width, dw = ctx.measureText(String(st.stats.drops)).width, w = tw + dw + 74;
    const x0 = W - 66 - w;
    pill(x0, 12, w, 28);
    text(s, x0 + 14, 26.5, 14, C.paper, 'left', 'body');
    // a small pencil icon and the drop count
    ctx.save(); ctx.translate(x0 + tw + 30, 26); ctx.rotate(-0.5);
    ctx.fillStyle = '#f6c21c'; ctx.fillRect(-9, -2.5, 14, 5); ctx.fillStyle = '#ef8fa0'; ctx.fillRect(-12, -2.5, 3, 5);
    ctx.fillStyle = '#e2b07a'; ctx.beginPath(); ctx.moveTo(5, -2.5); ctx.lineTo(10, 0); ctx.lineTo(5, 2.5); ctx.fill(); ctx.restore();
    text(String(st.stats.drops), x0 + tw + 44, 26.5, 14, st.dropsHere ? C.gold : C.paper, 'left', 'body');
  }

  MODES.popcarry = {
    S, ends, plan, room, holderOf,
    now() { return G.mst.t || 0; },   // the page clock the doors and the train run on
    scene3dOpts: { bg: '#2e2228', fov: 24, far: 600 },
    medals: {
      bronze: 'Deliver the pencil',
      goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }, { key: 'drops', gold: 2, silver: 6, word: 'drop' }],
    },
    medalValues() { const st = G.mst; return { drops: st.stats ? st.stats.drops : 0 }; },
    setup(st) {
      st.stats = { drops: 0, bumps: 0, lines: 0, helps: 0, helpWhat: [], pageDrops: [0, 0, 0, 0], pageT: [], why: [] };
      st.t = 0; st.lastGround = [0, 0];
      room(st, 0);
    },
    room(k) { const st = G.mst; room(st, k); },
    step(dt) { tick(G.mst, dt); },
    // the scenery is js/levels/world41/popup-scenes.js (K3D.popscene, loaded with the 3D kit)
    scene3d(K) { if (K3D.popscene) K3D.popscene.build(K, G.mst); },
    draw3d(K, dt) { if (K3D.popscene) K3D.popscene.update(K, G.mst, dt); },
    drawTop() { drawTop(G.mst); },
    hud() { hud(G.mst); },
    resultTitle() { return 'The pencil is home!'; },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const all = PC.pages.reduce((a, p) => a + p.lines.length, 0);
      const out = [
        { label: 'Time', value: fmtTime(G.time) },
        { label: 'Drops', value: String(s.drops) },
        { label: 'Lines drawn', value: s.lines + ' of ' + all },
        { label: 'Bumps', value: String(s.bumps) },
      ];
      const most = s.pageDrops.indexOf(Math.max(...s.pageDrops));
      out.push(s.drops ? 'Most drops: Page ' + (most + 1) + ', ' + TITLES[most] + '.' : 'Not one drop. A very careful pair!');
      if (s.helps) out.push('Gold help: ' + [...new Set(s.helpWhat)].map(h => h === 'ink' ? 'the ink slowed down' : h === 'spin' ? 'the pencil spun round' : 'paper edges stopped the falls').join(', ') + '.');
      return out;
    },
  };

  /* ---------- the 2D 'popbook' outfit (previews, world page, ready card): the 3D one is js/levels/world41/popup-outfits.js ----------
     Pip: a folded notepaper hat (yellow, grey rules, a pink margin line) with the sprout through the top fold, and a green
     ribbon scarf like a bookmark. Bo: a gold card crown with a brass paper fastener, between the ears, and a white paper
     ruff. (Pip no blue, Bo no orange or red; the eyes, sprout and ears stay clear.) */
  defineOutfitPart('popPaperHat', { layer: 'head', lift: 7, draw(c) {
    const g = c.g, ink = OF_INK;
    // the two triangles folded to a ridge, the brim band turned up
    ofPoly(g, [-12, -24.5, 0, -35, 12, -24.5]); ofFillStroke(g, '#f7e27a', ink, 1.3);
    g.save(); ofPoly(g, [-12, -24.5, 0, -35, 12, -24.5]); g.clip();
    g.strokeStyle = 'rgba(110,110,130,0.45)'; g.lineWidth = 0.7;
    for (let y = -33; y < -24; y += 2.2) { g.beginPath(); g.moveTo(-12, y); g.lineTo(12, y); g.stroke(); }
    g.strokeStyle = 'rgba(230,110,140,0.8)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-5, -35); g.lineTo(-5, -24); g.stroke();
    g.restore();
    ofRR(g, -12.5, -26.6, 25, 3.6, 1); ofFillStroke(g, '#fbeea0', ink, 1.2);
    g.strokeStyle = 'rgba(28,26,54,0.25)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(0, -34.5); g.lineTo(0, -26.8); g.stroke();
  } });
  defineOutfitPart('popBookmark', { layer: 'body', draw(c) {
    const g = c.g, ink = OF_INK, sw = Math.sin(c.t * 3) * 0.8 - (c.vx || 0) * 0.02;
    ofRR(g, -11, -7.2, 22, 3, 1.4); ofFillStroke(g, '#3f9a5a', ink, 1.1);
    const f = c.face >= 0 ? -1 : 1;
    g.beginPath(); g.moveTo(5.4 * f, -5); g.lineTo((6.4 + sw) * f, 0.5); g.lineTo((4.9 + sw) * f, -0.8); g.lineTo((3.4 + sw) * f, 0.5); g.lineTo(3.6 * f, -5); g.closePath(); ofFillStroke(g, '#3f9a5a', ink, 1);
  } });
  defineOutfitPart('popCrown', { layer: 'head', draw(c) {
    const g = c.g, ink = OF_INK;
    ofPoly(g, [-5.5, -24, -5.5, -30, -3, -27.4, 0, -31.5, 3, -27.4, 5.5, -30, 5.5, -24]); ofFillStroke(g, '#f2c14e', ink, 1.2);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-5, -25.6, 10, 1);
    ofCircle(g, 0, -26, 1.2); ofFillStroke(g, '#c9973a', ink, 0.8);
  } });
  defineOutfitPart('popRuff', { layer: 'body', draw(c) {
    const g = c.g, ink = OF_INK;
    // a pleated paper collar round the bottom of the face (below the cheeks): round folds hanging from a band
    for (let i = 0; i < 6; i++) { const x = -9.2 + i * 3.7; g.beginPath(); g.arc(x, -6, 2.1, 0, Math.PI); g.closePath(); ofFillStroke(g, '#fbf7ec', ink, 0.9); }
    ofRR(g, -11.2, -7.4, 22.4, 1.8, 0.8); ofFillStroke(g, '#fbf7ec', ink, 0.9);
  } });
  defineOutfit('popbook', { pip: [['popBookmark', {}], ['popPaperHat', {}]], bo: [['popRuff', {}], ['popCrown', {}]] });

  /* ---------- the level ---------- */
  const legend = {
    pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move <kbd>F</kbd> grab or let go <kbd>Space</kbd> jump',
    bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> move <kbd>/</kbd> grab or let go <kbd>Shift</kbd> jump',
  };
  PC.def = {
    name: 'Carry It Together', world: 40, kind: 'team', mode: 'popcarry', outfit: 'popbook', music: 'popbook', amb: 'popbook',
    view3d: true, touch: 'stick', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Page',
    legend,
    tip: 'Each grab one end. Walls stop the pencil, so swing it round the corners.',
    howTo: ['Each grab one end of the pencil.', 'Walls stop it. Swing it round corners.', 'Run the point along dotted lines to draw.'],
    act: { label: 'grab', labels: ['grab', 'grab'] },
    map: Array.from({ length: 18 }, () => '.'.repeat(32)),
    rooms: PC.pages.map(p => ({ title: p.name, tip: p.tip, act: { label: 'grab', labels: ['grab', 'grab'] } })),
  };
  PC.def.map[16] = '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10);
  PC.wormIcon = wormIcon;

  /* ---------- sounds (paper, wood, graphite, a little toy town) ---------- */
  const X = Sfx.extra;
  X.popcarryGrab = function (pitch, on) { this.tone(on ? 520 : 380, 0.06, 'triangle', 0.03, on ? 700 : 300); this.noise(0.05, { type: 'highpass', f: 2500, vol: 0.015 }); };
  X.popcarryKnock = function () { this.tone(230, 0.09, 'triangle', 0.06, 160); this.tone(460, 0.04, 'square', 0.012, 300); };
  X.popcarryScrape = function () { this.noise(0.4, { type: 'bandpass', f: 900, q: 1.5, vol: 0.02, a: 0.05 }); };
  X.popcarryScratch = function () { this.noise(0.12, { type: 'highpass', f: 3200, to: 4200, vol: 0.025 }); };
  X.popcarryFwip = function () { this.noise(0.18, { type: 'bandpass', f: 700, to: 2600, q: 1.2, vol: 0.05 }); this.tone(600, 0.12, 'triangle', 0.02, 1100, 0.04); };
  X.popcarryPageTurn = function () { this.noise(0.6, { type: 'bandpass', f: 1400, to: 500, q: 0.8, vol: 0.05, a: 0.1 }); this.noise(0.25, { type: 'highpass', f: 3000, vol: 0.015, delay: 0.35 }); };
  X.popcarryDoorCreak = function () { this.tone(300, 0.3, 'sawtooth', 0.012, 420); this.tone(190, 0.12, 'triangle', 0.02, 140, 0.25); };
  X.popcarryTick = function () { this.tone(1800, 0.03, 'square', 0.015, 1500); };
  X.popcarryBell = function () { for (let k = 0; k < 3; k++) { this.tone(1320, 0.4, 'triangle', 0.03, null, k * 0.28); this.tone(2640, 0.25, 'sine', 0.01, null, k * 0.28); } };
  X.popcarryToot = function () { this.tone(440, 0.35, 'square', 0.03, 430); this.tone(554, 0.35, 'square', 0.02, 545); this.noise(0.4, { type: 'lowpass', f: 600, vol: 0.02 }); };
  X.popcarrySplash = function () { this.noise(0.55, { type: 'lowpass', f: 1800, to: 300, vol: 0.09 }); this.tone(300, 0.2, 'sine', 0.03, 120, 0.05); };
  X.popcarrySplat = function () { this.noise(0.3, { type: 'lowpass', f: 600, to: 120, vol: 0.09 }); this.tone(110, 0.25, 'sine', 0.06, 60); };
  X.popcarryDrop = function () { this.tone(180, 0.18, 'triangle', 0.06, 90); this.noise(0.15, { type: 'lowpass', f: 800, vol: 0.04 }); };
  X.popcarryClunk = function () { this.tone(140, 0.25, 'square', 0.05, 80); this.tone(90, 0.4, 'sine', 0.08, 50, 0.08); };
  X.popcarryWhoa = function () { this.tone(520, 0.22, 'triangle', 0.03, 760); };
})();
