/* Pip & Bo - Level 41-3 Paper Dragon Flight (team, World 41 Pop-Up Storybook, 3D). */
'use strict';

/* ===== 41-3 Paper Dragon Flight (mode 'popdragon', World 41 "Pop-Up Storybook", team, view3d) =====
   The Reader has fallen asleep with the lamp on. A draught lifts the book's last loose page and sails it away; the
   Bookworm folds a paper dragon out of the dragon story, and Pip and Bo ride it out of the book after the page, in one
   unbroken flight: over the desk, through the bookshelf, across the bedroom past the sleeping Reader (and the cat), up
   to the window and back down to the desk. Gavyn (2026-11-17): "Pip is steering left to right and Bo up and down",
   and the seats never swap ("don't switch half way through, that is too disorientating. Just one continuous adventure").

   THE RAIL. The dragon flies forward by itself along one authored path (POPDRAGON_ROUTE, popdragon-route.js) at a set
   speed. The players move it inside a window round the rail, 12 wide and 7 high: st.ox across (+ right), st.oy up.
     Pip (front seat) steers: ◀ ▶ move across.           His button breathes confetti fire (burns cobwebs, lights candles).
     Bo  (back seat) works the wings: ▲ ▼ move up/down.   Her button swishes the tail fan (bats moths, the cat's paw).
     Together is stronger: Bo pushing the same way as Pip's steering (or Pip pushing the same way as Bo's height) makes a
     SWOOP, half again as fast, with a deeper bank and a whoosh. A helper alone, or pushing the other way, does nothing.
     Both hold jump: TUCK, the wings fold flat and the dragon narrows for a slot (at most 1.5 s, then 1 s open). One
     alone gives a half fold (not enough) and a little head shake.
   Movement is eased (0.25 s to full speed) and holds still when let go.
   CRUMPLES. Hitting anything solid (POPDRAGON_ROUTE.solids, and paper that has not been burnt) is a Crumple: crunch,
   dented nose, a push back toward the middle, 1.5 s safe. Three before the next bookmark hoop is a Refold: the dragon
   scrunches up, "Smooth it out!", and the pair start again at the last hoop (stars kept). Two Refolds from one hoop:
   gold help, five Crumples until two more hoops are passed ("The Bookworm added extra paper"). Nothing can lock: the
   rail always carries on, and anything that needs both riders costs a Crumple at most.
   One room in the game's sense; the stretches (the desk, the bookshelf, the bedroom, the window) are places along the
   rail (POPDRAGON_ROUTE.parts), never cards. Only the take-off before control and the landing after the catch are
   non-playing (jump skips them).
   State lives in G.mst; rules never read the renderer (K3D.noRender plays the same). Names are prefixed popdragon. */

const POPDRAGON = {
  VX: 6.6, VY: 4.8, SWOOP: 1.5, EASE: 0.25, STOP: 0.16,
  HW: 1.9, HW_TUCK: 0.62, HW_HALF: 1.35, HH: 0.5,       // the dragon's half width (wing tips) and half height in the window
  TUCK_MAX: 1.5, TUCK_REST: 1.0, FIRE: 0.6, FIRE_CD: 1.5, FIRE_REACH: 6, TAIL: 0.4, TAIL_CD: 0.8,
  SAFE: 1.5, CRUMPLES: 3, GOLD_CRUMPLES: 5, REFOLD: 2.0, STAR_R: 1.35,
};

/* ---------- where the dragon can be hit: a few points in the window, turned into the room ---------- */
function popdragonFootprint(st) {
  const R = POPDRAGON_ROUTE, hw = st.hw;
  // the head (at the rail position), the wing tips a little behind it, the middle of the body
  return [[0, 0, 0, 0.55], [-1.8, -hw, 0.1, 0.3], [-1.8, hw, 0.1, 0.3], [-1.0, 0, -0.05, 0.45], [-2.8, 0, 0.0, 0.4]].map(([ds, dx, dy, r]) => {
    const s = st.s + ds;
    return { p: R.local(s, st.ox + dx, st.oy + dy), r, s, ox: st.ox + dx, oy: st.oy + dy };
  });
}
// distance from a point to a solid's surface (negative inside)
function popdragonDist(sd, p) {
  const [x, y, z] = p;
  if (sd.k === 'cyl') { const dr = Math.hypot(x - sd.x, z - sd.z) - sd.r, dy = y < sd.y0 ? sd.y0 - y : y > sd.y1 ? y - sd.y1 : 0; return dr > 0 ? Math.hypot(dr, dy) : dy > 0 ? dy : Math.max(dr, Math.max(sd.y0 - y, y - sd.y1)); }
  if (sd.k === 'sph') return Math.hypot(x - sd.x, y - sd.y, z - sd.z) - sd.r;
  if (sd.k === 'box') {
    const c = Math.cos(sd.yaw || 0), s = Math.sin(sd.yaw || 0), dx = x - sd.x, dz = z - sd.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c, q = [Math.abs(lx) - sd.hx, Math.abs(y - sd.y) - sd.hy, Math.abs(lz) - sd.hz];
    return Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)) + Math.min(Math.max(q[0], q[1], q[2]), 0);
  }
  if (sd.k === 'cap') {
    const a = sd.a, b = sd.b, ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [x - a[0], y - a[1], z - a[2]];
    const t = clamp((ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]), 0, 1);
    return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t) - sd.r;
  }
  return 1e9;
}
// solids sorted by where they are along the rail (for a quick look-up near s)
function popdragonIndex() {
  const R = POPDRAGON_ROUTE;
  if (R._idx) return R._idx;
  const list = R.solids.map((sd, i) => {
    const c = sd.k === 'cap' ? [(sd.a[0] + sd.b[0]) / 2, (sd.a[1] + sd.b[1]) / 2, (sd.a[2] + sd.b[2]) / 2] : sd.k === 'cyl' ? [sd.x, (sd.y0 + sd.y1) / 2, sd.z] : [sd.x, sd.y, sd.z];
    const rad = sd.k === 'cyl' ? Math.hypot(sd.r, (sd.y1 - sd.y0) / 2) : sd.k === 'sph' ? sd.r : sd.k === 'box' ? Math.hypot(sd.hx, sd.hy, sd.hz) : Math.hypot(sd.b[0] - sd.a[0], sd.b[1] - sd.a[1], sd.b[2] - sd.a[2]) / 2 + sd.r;
    // every rail row this solid could touch
    let s0 = 1e9, s1 = -1e9;
    for (const f of R.tab) { if (Math.hypot(f.p[0] - c[0], f.p[1] - c[1], f.p[2] - c[2]) < rad + 9) { s0 = Math.min(s0, f.s); s1 = Math.max(s1, f.s); } }
    return { i, sd, s0, s1 };
  }).filter(e => e.s1 >= e.s0);
  R._idx = list;
  return list;
}
// is a window spot (s, ox, oy) with this half width clear? (the brain and the fairness checks use it too)
function popdragonHit(s, ox, oy, hw, burnt) {
  const R = POPDRAGON_ROUTE, idx = popdragonIndex();
  const st = { s, ox, oy, hw };
  const pts = popdragonFootprint(st);
  for (const e of idx) {
    if (s + 1 < e.s0 || s - 3 > e.s1) continue;
    if (e.sd.burn && burnt && burnt[e.sd.burn] != null) continue;
    for (const q of pts) if (popdragonDist(e.sd, q.p) < q.r) return e;
  }
  // paper across the flight line (cobwebs, tissue): a disc in the window at its s
  for (const w of R.webs || []) {
    if (burnt && burnt[w.burn] != null) continue;
    if (Math.abs(s - w.s) < 0.5 && Math.hypot(ox, oy - (w.oy || 0)) < w.r) return { web: w };
  }
  return null;
}
// the axes each player pushes: x (+ right) and y (+ up), from keys, the stick or the touch stick
function popdragonAxes(p) {
  const i = p.input || {};
  let x = (i.right ? 1 : 0) - (i.left ? 1 : 0), y = (i.up ? 1 : 0) - (i.down ? 1 : 0);
  if (Math.abs(i.ax || 0) > 0.2) x = clamp(i.ax, -1, 1);
  if (Math.abs(i.ay || 0) > 0.2) y = clamp(-i.ay, -1, 1);
  return { x, y };
}

MODES.popdragon = {
  medals: { bronze: 'Catch the page', goals: [{ key: 'stars', gold: 0.85, silver: 0.55, more: true, pct: true, word: 'the stars' }, { key: 'crumples', gold: 3, silver: 9, word: 'crumple' }] },
  medalValues() { const st = G.mst; return { stars: st.stars / (POPDRAGON_ROUTE.stars.length || 1), crumples: st.crumplesAll }; },
  scene3dOpts: { bg: '#141820', fov: 52, near: 0.3, far: 900 },
  setup(st) {
    const R = POPDRAGON_ROUTE;
    Object.assign(st, {
      phase: 'takeoff', s: 0, ox: 0, oy: 0, vx: 0, vy: 0, clock: 0, hw: POPDRAGON.HW,
      tuck: 0, tuckT: 0, tuckRest: 0, half: 0, shake: 0,
      fire: 0, fireCd: 0, tail: 0, tailCd: 0, swish: 0,
      crumples: 0, maxCrumples: POPDRAGON.CRUMPLES, crumplesAll: 0, safe: 0, dent: 0, refolds: 0, refoldT: 0, swoops: 0, swoopOn: false,
      gold: 0, goldMsg: 0, sameHoop: 0, restart: 0, hoopI: 0, nextSay: 0, says: [], stars: 0, got: R.stars.map(() => false),
      burnt: {}, crumpleAt: {}, place: 0, bat: 0, sparks: [], steer: 0, fly: 0, finished: false,
    });
    for (const p of G.players) p.alive = true;
  },
  // which stretch a rail position is in (for the stats line)
  partAt(s) { const ps = POPDRAGON_ROUTE.parts; let k = 0; for (let i = 0; i < ps.length; i++) if (s >= ps[i].s) k = i; return k; },
  step(dt) {
    const st = G.mst, R = POPDRAGON_ROUTE, K = POPDRAGON, ps = G.players;
    st.clock += dt;
    for (const p of ps) { p.vx = 0; p.vy = 0; }
    // the take-off run: the dragon unfolds off the page and lifts off; jump skips it
    if (st.phase === 'takeoff') {
      st.s += R.at(st.s).v * dt;
      if (ps.some(p => p.pendingJump)) st.s = R.TAKEOFF;
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      if (st.s >= R.TAKEOFF) { st.s = R.TAKEOFF; st.phase = 'fly'; }
      this.events(st);
      return;
    }
    if (st.phase === 'refold') {
      st.refoldT -= dt;
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      if (st.refoldT <= 0) {
        st.phase = 'fly'; st.s = st.restart; st.ox = 0; st.oy = 0; st.vx = 0; st.vy = 0; st.crumples = 0; st.safe = K.SAFE; st.dent = 0;
        st.unfold = 1;
      }
      return;
    }
    if (st.phase !== 'fly') return;
    st.unfold = Math.max(0, (st.unfold || 0) - dt / 0.8);
    // what each rider pushes: Pip's x is the steering and his y a helper, Bo's y is the wings and her x a helper
    const a0 = popdragonAxes(ps[0]), a1 = popdragonAxes(ps[1]);
    st.steer = a0.x; st.fly = a1.y;
    const helpX = a0.x && Math.sign(a1.x) === Math.sign(a0.x) && Math.abs(a1.x) > 0.3;
    const helpY = a1.y && Math.sign(a0.y) === Math.sign(a1.y) && Math.abs(a0.y) > 0.3;
    const mothSlow = 1 - 0.25 * Math.min(3, st.moths || 0);
    const wantX = a0.x * K.VX * (helpX ? K.SWOOP : 1), wantY = a1.y * K.VY * (helpY ? K.SWOOP : 1) * mothSlow;
    const ease = (v, want, full) => { const acc = (want === 0 ? full / K.STOP : full / K.EASE) * dt; return v + clamp(want - v, -acc, acc); };
    st.vx = ease(st.vx, wantX, K.VX * K.SWOOP); st.vy = ease(st.vy, wantY, K.VY * K.SWOOP);
    const swoop = (helpX && Math.abs(a0.x) > 0.3) || (helpY && Math.abs(a1.y) > 0.3);
    if (swoop && !st.swoopOn) { st.swoops++; Sfx.play('popdragonWhoosh'); }
    st.swoopOn = swoop;
    st.ox += st.vx * dt; st.oy += st.vy * dt;
    if (Math.abs(st.ox) > R.WX) { st.ox = Math.sign(st.ox) * R.WX; st.vx = 0; }
    if (Math.abs(st.oy) > R.WY) { st.oy = Math.sign(st.oy) * R.WY; st.vy = 0; }
    // the tuck: both hold jump (one alone: a half fold and a head shake)
    const j0 = !!ps[0].input.jump, j1 = !!ps[1].input.jump;
    ps[0].pendingJump = false; ps[1].pendingJump = false;
    if (st.tuckRest > 0) st.tuckRest -= dt;
    const both = j0 && j1 && st.tuckRest <= 0, one = (j0 || j1) && !both;
    if (both) { if (st.tuckT === 0) Sfx.play('popdragonTuck'); st.tuckT += dt; if (st.tuckT >= K.TUCK_MAX) { st.tuckRest = K.TUCK_REST; st.tuckT = 0; } }
    else st.tuckT = 0;
    st.tuck = approach(st.tuck, both ? 1 : one && st.tuckRest <= 0 ? 0.45 : 0, dt * 8);
    st.shake = one && st.tuckRest <= 0 ? Math.min(1, st.shake + dt * 4) : Math.max(0, st.shake - dt * 3);
    st.hw = K.HW + (K.HW_TUCK - K.HW) * st.tuck;
    // Pip's button: confetti fire; Bo's: the tail swish
    st.fireCd -= dt; st.tailCd -= dt; st.fire = Math.max(0, st.fire - dt); st.tail = Math.max(0, st.tail - dt);
    if (ps[0].pendingAct) { ps[0].pendingAct = false; if (st.fireCd <= 0) { st.fire = K.FIRE; st.fireCd = K.FIRE_CD; Sfx.play('popdragonFire'); } }
    if (ps[1].pendingAct) { ps[1].pendingAct = false; if (st.tailCd <= 0) { st.tail = K.TAIL; st.tailCd = K.TAIL_CD; st.swishDir = st.swishDir === 1 ? -1 : 1; Sfx.play('popdragonTail'); } }
    if (st.fire > 0) for (const w of R.webs || []) if (st.burnt[w.burn] == null && w.s - st.s > -0.5 && w.s - st.s < K.FIRE_REACH && Math.hypot(st.ox, st.oy - (w.oy || 0)) < w.r + 1) { st.burnt[w.burn] = st.clock; Sfx.play('popdragonBurn'); }
    // forward along the rail
    const fr = R.at(st.s);
    st.s += fr.v * dt;
    // crumples
    st.safe -= dt; st.dent = Math.max(0, st.dent - dt * 1.4);
    if (st.safe <= 0) {
      const hit = popdragonHit(st.s, st.ox, st.oy, st.hw, st.burnt);
      if (hit) this.crumple(st, hit);
    }
    // stars
    for (let i = 0; i < R.stars.length; i++) {
      if (st.got[i]) continue;
      const sr = R.stars[i];
      if (sr.s > st.s + 1.5) break;
      if (sr.s < st.s - 3.5) continue;
      if (Math.abs(sr.s - st.s) < 1.1 && Math.hypot(sr.ox - st.ox, sr.oy - st.oy) < K.STAR_R) { st.got[i] = true; st.stars++; Sfx.play('popdragonStar'); st.sparks.push({ i, t: st.clock }); }
    }
    this.events(st);
    if (st.s >= R.end) { st.phase = 'done'; st.finished = true; levelClear(); }
  },
  // hoops, the Bookworm's lines, the stretch names
  events(st) {
    const R = POPDRAGON_ROUTE, K = POPDRAGON;
    while (st.hoopI < R.hoops.length && st.s >= R.hoops[st.hoopI].s) {
      const h = R.hoops[st.hoopI++];
      if (h.s > st.restart + 0.01) { st.sameHoop = 0; if (st.gold > 0 && --st.gold === 0) st.maxCrumples = K.CRUMPLES; }
      st.restart = h.s; st.crumples = 0;
      if (st.phase === 'fly') Sfx.play('popdragonSmooth');
    }
    while (st.nextSay < R.says.length && st.s >= R.says[st.nextSay].s) { st.says.push({ text: R.says[st.nextSay].text, t: st.clock }); st.nextSay++; }
  },
  crumple(st, hit) {
    const K = POPDRAGON;
    st.crumples++; st.crumplesAll++; st.safe = K.SAFE; st.dent = 1;
    const part = this.partAt(st.s); st.crumpleAt[part] = (st.crumpleAt[part] || 0) + 1;
    // a web you fly into tears (so it is never a wall)
    if (hit.web) st.burnt[hit.web.burn] = st.clock;
    if (hit.sd && hit.sd.burn) st.burnt[hit.sd.burn] = st.clock;
    // pushed back toward the middle
    st.vx = -Math.sign(st.ox || 1) * K.VX * 0.9; st.vy = -Math.sign(st.oy || 1) * K.VY * 0.6;
    Sfx.play('popdragonCrumple'); G.shake = Math.max(G.shake, 0.25);
    rumble(0, 0.4, 0.5, 160); rumble(1, 0.4, 0.5, 160);
    if (st.crumples >= st.maxCrumples) {
      st.refolds++; st.sameHoop++;
      st.phase = 'refold'; st.refoldT = K.REFOLD;
      st.says.push({ text: 'Smooth it out!', t: st.clock });
      Sfx.play('popdragonRefold');
      // stars from here to the hoop come back? No: stars kept. The hoops between restart and here count again.
      const R = POPDRAGON_ROUTE; st.hoopI = R.hoops.findIndex(h => h.s > st.restart + 0.01); if (st.hoopI < 0) st.hoopI = R.hoops.length;
      st.nextSay = R.says.findIndex(sy => sy.s > st.restart + 0.01); if (st.nextSay < 0) st.nextSay = R.says.length;
      if (st.sameHoop >= 2 && st.gold <= 0) { st.gold = 2; st.maxCrumples = K.GOLD_CRUMPLES; st.goldMsg = st.clock; }
    }
  },
  hud() {
    const st = G.mst, R = POPDRAGON_ROUTE;
    if (st.noHud) return;
    // stars
    const sText = st.stars + ' / ' + R.stars.length;
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const sw = ctx.measureText(sText).width + 48;
    pill(14, 46, sw, 30);
    ctx.save(); ctx.translate(32, 61); ctx.fillStyle = C.gold; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 3.6 : 8.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore();
    text(sText, 46, 61.5, 15, C.paper, 'left', 'body');
    // the paper dragons: one creased per Crumple (five in gold while the Bookworm's extra paper lasts)
    const n = st.maxCrumples, x0 = 14, y0 = 82;
    pill(x0, y0, 18 + n * 34, 30);
    for (let i = 0; i < n; i++) popdragonHudDragon(x0 + 26 + i * 34, y0 + 15, i < n - st.crumples, st.gold > 0);
    // the seat badges by each player's corner: Pip ◀▶ (bottom left), Bo ▲▼ (bottom right)
    for (const k of [0, 1]) {
      const x = k === 0 ? 70 : W - 70, y = H - 30;
      ctx.fillStyle = 'rgba(23,25,29,0.72)'; rr(x - 52, y - 16, 104, 32, 16); ctx.fill();
      ctx.fillStyle = PCOL[k]; circle(x - 34, y, 11); ctx.fill();
      text(NAMES[k][0], x - 34, y + 1, 13, '#fff', 'center', 'body');
      ctx.strokeStyle = C.paper; ctx.fillStyle = C.paper; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const ax = x + 8;
      if (k === 0) { ctx.beginPath(); ctx.moveTo(ax - 16, y); ctx.lineTo(ax + 16, y); ctx.stroke(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ax + s * 22, y); ctx.lineTo(ax + s * 13, y - 6); ctx.lineTo(ax + s * 13, y + 6); ctx.closePath(); ctx.fill(); } }
      else { ctx.beginPath(); ctx.moveTo(ax, y - 9); ctx.lineTo(ax, y + 9); ctx.stroke(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ax, y + s * 14); ctx.lineTo(ax - 6, y + s * 6); ctx.lineTo(ax + 6, y + s * 6); ctx.closePath(); ctx.fill(); } }
      text(k === 0 ? 'steer' : 'fly', ax + 28, y + 1, 12, C.paper, 'left', 'body');
    }
    // the gold help banner
    if (st.goldMsg && st.clock - st.goldMsg < 4) {
      const a = Math.min(1, (4 - (st.clock - st.goldMsg)) * 2);
      ctx.save(); ctx.globalAlpha = a; ctx.font = '700 18px "Atkinson Hyperlegible", system-ui, sans-serif';
      const m = 'The Bookworm added extra paper', mw = ctx.measureText(m).width + 40;
      ctx.fillStyle = 'rgba(120,84,10,0.92)'; rr(W / 2 - mw / 2, 120, mw, 36, 18); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
      text(m, W / 2, 138.5, 18, '#ffe9a8', 'center', 'body'); ctx.restore();
    }
  },
  drawTop() {
    const st = G.mst;
    // the Bookworm's lines, as a bubble from the dragon's mouth
    const say = st.says.length && st.says[st.says.length - 1];
    if (say && st.clock - say.t < 3.6 && st.headScr && st.headScr.z < 1) {
      const a = Math.min(1, (3.6 - (st.clock - say.t)) * 3, (st.clock - say.t) * 6);
      popdragonBubble(say.text, st.headScr.x, st.headScr.y - 34, a);
    }
    // sparkles where stars were caught
    st.sparks = st.sparks.filter(sp => st.clock - sp.t < 0.6);
    for (const sp of st.sparks) {
      const scr = st.starScr && st.starScr[sp.i]; if (!scr) continue;
      const u = (st.clock - sp.t) / 0.6;
      ctx.save(); ctx.globalAlpha = 1 - u; ctx.fillStyle = '#ffe27a';
      for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2 + sp.i; circle(scr.x + Math.cos(an) * u * 26, scr.y + Math.sin(an) * u * 26, 3 * (1 - u) + 1); ctx.fill(); }
      ctx.restore();
    }
  },
  stats() {
    const st = G.mst, names = POPDRAGON_ROUTE.parts.map(p => p.name);
    let worst = -1, wn = 0; for (const [k, n] of Object.entries(st.crumpleAt)) if (n > wn) { wn = n; worst = +k; }
    const lines = [];
    if (worst >= 0) lines.push('Most Crumples over ' + names[worst] + ' (' + wn + ')');
    else lines.push('Not a single Crumple: a perfect flight!');
    return { tiles: [['Stars', st.stars + ' / ' + POPDRAGON_ROUTE.stars.length], ['Crumples', String(st.crumplesAll)], ['Refolds', String(st.refolds)], ['Swoops', String(st.swoops)]], lines };
  },

  /* ---------- 3D ---------- */
  scene3d(K) {
    POPDRAGON_OUTFITS.define3();
    const T = K3D.T;
    // night in the attic: the lamp is the light (a warm key from the lamp's side, a cool dim fill)
    K.amb.color.set('#e4e6ff'); K.sun.color.set('#fff4e2');
    K.sunDir.set(-0.35, 1, -0.55).normalize();
    K.scene.fog = new T.Fog('#141820', 140, 520);
    const art = POPDRAGON_ART.build(K);
    const dragon = POPDRAGON_DRAGON.build(K); K.add(dragon);
    for (const h of dragon.userData.heroes) {
      K3D.dress(h, 'popdragon');
      // a little lamplight on the riders' own colours so Pip reads orange and Bo blue against the night
      const m = h.userData.body.material; m.emissive = new T.Color(PCOL[h.userData.id]); m.emissiveIntensity = 0.16;
    }
    K.pd = { art, dragon, cam: null, t: 0 };
    K.focusRange = 9; K.maxBlur = 5;
  },
  draw3d(K, dt) {
    const st = G.mst, R = POPDRAGON_ROUTE, T = K3D.T, pd = K.pd;
    if (!pd) return;
    pd.t += dt;
    const fr = R.at(st.s);
    // the dragon's place: the rail point plus the window offset; it lies flat on the page before take-off
    const pos = R.local(st.s, st.ox, st.oy, fr);
    const pre = st.phase === 'takeoff' ? clamp(1 - st.s / 2.5, 0, 1) : 0;
    const v = fr.v || 5;
    const fwd = new T.Vector3(...fr.t).addScaledVector(new T.Vector3(...fr.r), st.vx / v * 0.55).addScaledVector(new T.Vector3(...fr.u), st.vy / v * 0.55).normalize();
    const bank = clamp(-fr.turn * v * 0.55 + st.vx * 0.07, -0.61, 0.61) * (1 - pre);
    const climb = clamp(fr.t[1] * 2.2 + st.vy / POPDRAGON.VY * 0.8, -1, 1) * (1 - pre);
    const ball = st.phase === 'refold' ? clamp((POPDRAGON.REFOLD - st.refoldT) / 0.45, 0, 1) * (st.refoldT > 0.6 ? 1 : st.refoldT / 0.6) : 0;
    // the body's trail starts laid along the rail behind the head (the first picture, a restart, a tool's jump)
    if (st.phase === 'refold' && st.refoldT < 0.62 && !pd.reset) { pd.reset = true; st.prime = st.restart; }
    if (st.phase !== 'refold') pd.reset = false;
    if (!pd.primed || st.prime != null) {
      const s0 = st.prime != null ? st.prime : st.s, ox = st.phase === 'refold' ? 0 : st.ox, oy = st.phase === 'refold' ? 0 : st.oy, tr = pd.dragon.userData.trail;
      tr.length = 0; for (let i = 0; i < 260; i++) tr.push(new T.Vector3(...R.local(Math.max(-12, s0 - i * 0.05), ox, oy)));
      pd.primed = true; st.prime = null;
    }
    const dropY = st.phase === 'refold' ? Math.min(6, (POPDRAGON.REFOLD - st.refoldT) * 5) : 0;
    const p3 = st.phase === 'refold' ? R.local(st.restart, 0, 0) : pos;
    if (st.phase === 'refold' && st.refoldT > 0.62) { p3[0] = pd.lastPos[0]; p3[1] = pd.lastPos[1] - dropY; p3[2] = pd.lastPos[2]; } else pd.lastPos = p3.slice();
    const swishV = st.tail > 0 ? Math.sin((1 - st.tail / POPDRAGON.TAIL) * Math.PI) * (st.swishDir || 1) : 0;
    POPDRAGON_DRAGON.pose(pd.dragon, { pos: p3, fwd: fwd.toArray(), bank, climb, tuck: st.tuck, shake: st.shake, fire: st.fire > 0 ? Math.sin(Math.min(1, (POPDRAGON.FIRE - st.fire) / 0.15) * Math.PI / 2) : 0,
      ready: st.fireCd <= 0 ? 1 : 0, swish: swishV, crumple: st.dent, ball, flat: pre, steer: st.steer, fly: st.fly, time: pd.t }, dt);
    const heroes = pd.dragon.userData.heroes;
    heroes.forEach(h => POPDRAGON_OUTFITS.wind(h, pd.t, v, bank));
    // the camera: behind and a little above the rail, following a third of the dragon's offset; banked like a ride
    const third = [st.ox / 3, st.oy / 3];
    const shot = st.camShot;
    let eye, at, up = new T.Vector3(0, 1, 0), fov = 56;
    if (shot) ({ eye, at, fov } = popdragonShot(shot, pos, fwd, fr));
    else {
      // behind the dragon along the way the rail has just come (a chord, so curves never swing it out to the side)
      const back = R.at(Math.max(0, st.s - 10)), chord = new T.Vector3(...fr.p).sub(new T.Vector3(...back.p));
      if (chord.lengthSq() < 1) chord.set(...fr.t); chord.normalize();
      const base = new T.Vector3(...R.local(st.s, third[0], third[1], fr));
      eye = base.clone().addScaledVector(chord, -12.5).add(new T.Vector3(0, 4.3, 0));
      at = new T.Vector3(...R.local(st.s + 9, third[0], third[1] + 0.4, R.at(st.s + 9)));
      // never inside scenery: pull in toward the dragon until clear of every solid (and above the desk top)
      for (let k = 0; k < 12; k++) {
        const e = eye.toArray(); let bad = e[1] < R.DESK + 1.2 && e[0] > R.DESKBOX.x0 && e[0] < R.DESKBOX.x1 && e[2] > R.DESKBOX.z0 && e[2] < R.DESKBOX.z1;
        // the eye, and the line from it to the dragon, must be clear (no pencil or quill across the view)
        if (!bad) for (const x of popdragonIndex()) if (Math.abs(x.s0 - st.s) < 40 || Math.abs(x.s1 - st.s) < 40) {
          if (popdragonDist(x.sd, e) < 1.6) { bad = true; break; }
          for (let q = 1; q <= 4 && !bad; q++) { const f = q / 5; if (popdragonDist(x.sd, [e[0] + (pos[0] - e[0]) * f, e[1] + (pos[1] - e[1]) * f, e[2] + (pos[2] - e[2]) * f]) < 0.5) bad = true; }
          if (bad) break;
        }
        if (!bad) break;
        eye.lerp(base.clone().add(new T.Vector3(0, 2.6, 0)), 0.18);
      }
      const roll = clamp(-fr.turn * v * 0.12, -0.14, 0.14);
      up.applyAxisAngle(at.clone().sub(eye).normalize(), roll);
      if (st.phase === 'takeoff') { const k = clamp(1 - st.s / R.TAKEOFF, 0, 1); eye.lerp(new T.Vector3(pos[0] + 7, pos[1] + 5.5, pos[2] + 9), k * k); }
    }
    if (!pd.cam || shot) pd.cam = { eye: eye.clone(), at: at.clone(), up: up.clone() };
    else { const k = 1 - Math.exp(-6 * dt); pd.cam.eye.lerp(eye, k); pd.cam.at.lerp(at, k); pd.cam.up.lerp(up, k).normalize(); }
    const cam = K.camera;
    cam.position.copy(pd.cam.eye); cam.up.copy(pd.cam.up); cam.lookAt(pd.cam.at);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    if (shot) K.focus.copy(at); else K.focus.set(...pos);
    K.sunAt(new T.Vector3(...pos), 22);
    // scenery
    const page = popdragonPagePlace(st, pd.t);
    pd.art.tick({ s: st.s, got: st.got, burnt: st.burnt, clock: st.clock, page }, pd.t, dt);
    // screen spots for the 2D layer: name tags over the riders, the Bookworm's bubble, star sparkles
    for (const [k, h] of heroes.entries()) { const w = new T.Vector3(); h.getWorldPosition(w); const sc = K3D.toScreen(w.x, w.y + 1.15, w.z); G.players[k].x = sc.x - PW / 2; G.players[k].y = sc.y; }
    const hw = new T.Vector3(); pd.dragon.userData.head.getWorldPosition(hw); st.headScr = K3D.toScreen(hw.x, hw.y + 0.8, hw.z);
    st.starScr = st.starScr || []; for (const sp of st.sparks) { const p = R.stars[sp.i]; const w = R.local(p.s, p.ox, p.oy); st.starScr[sp.i] = K3D.toScreen(w[0], w[1], w[2]); }
  },
};

// where the runaway page is (drawing only): always ahead on the draught, sometimes near enough to almost touch
function popdragonPagePlace(st, t) {
  const R = POPDRAGON_ROUTE;
  const lead = 13 + Math.sin(t * 0.37) * 4 + Math.sin(t * 0.91) * 1.5;
  const s = Math.min(R.len, st.s + lead);
  const p = R.local(s, Math.sin(t * 0.6) * 3.2, 1.4 + Math.sin(t * 0.83) * 1.6);
  return { pos: p, rx: Math.sin(t * 1.3) * 0.7 - 0.6, ry: t * 0.9, rz: Math.sin(t * 0.7) * 0.8 };
}
// a fixed camera for the look shots (tools only: MODES.popdragon.camShot via st.camShot)
function popdragonShot(shot, pos, fwd, fr) {
  const T = K3D.T, P = new T.Vector3(...pos), f = fwd.clone(), r = new T.Vector3(...fr.r), u = new T.Vector3(0, 1, 0);
  const mid = P.clone().addScaledVector(f, -2.4);
  if (shot === 'side') return { eye: mid.clone().addScaledVector(r, -9.5).addScaledVector(u, 1.4), at: mid.clone().addScaledVector(u, 0.2), fov: 38 };
  if (shot === 'front') return { eye: P.clone().addScaledVector(f, 7.5).addScaledVector(r, 2.6).addScaledVector(u, 1.2), at: mid.clone().addScaledVector(u, 0.4), fov: 42 };
  if (shot === 'back') return { eye: mid.clone().addScaledVector(f, -6.8).addScaledVector(u, 2.3).addScaledVector(r, 1.4), at: P.clone().addScaledVector(u, 0.4), fov: 40 };
  if (shot === 'riders') return { eye: mid.clone().addScaledVector(r, -4.4).addScaledVector(f, 1.6).addScaledVector(u, 3.6), at: mid.clone().addScaledVector(f, 0.9).addScaledVector(u, 0.6), fov: 40 };
  if (shot === 'wide') return { eye: new T.Vector3(150, 40, 150), at: new T.Vector3(10, -4, 0), fov: 40 };
  if (shot && shot.eye) return { eye: new T.Vector3(...shot.eye), at: new T.Vector3(...shot.at), fov: shot.fov || 45 };
  return { eye: P.clone().add(new T.Vector3(0, 5, 10)), at: P, fov: 50 };
}
// a little paper dragon for the HUD: green when smooth, grey and creased once used up (gold while the extra paper lasts)
function popdragonHudDragon(x, y, ok, gold) {
  ctx.save(); ctx.translate(x, y);
  const body = ok ? (gold ? '#e8b84a' : '#4fae64') : 'rgba(200,200,200,0.35)', edge = ok ? '#fbf7ec' : 'rgba(255,255,255,0.3)';
  ctx.fillStyle = body; ctx.strokeStyle = 'rgba(28,26,54,0.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-13, 3); for (let i = 0; i <= 5; i++) ctx.lineTo(-13 + i * 4.4, (i % 2 ? -3 : 1) + 2); ctx.lineTo(9, -6); ctx.lineTo(14, -2); ctx.lineTo(9, 3); ctx.lineTo(9, 6); ctx.lineTo(-13, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = edge; ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(2, -9); ctx.lineTo(4, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (!ok) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-2, 6); ctx.moveTo(-2, -5); ctx.lineTo(6, 5); ctx.stroke(); }
  else { ctx.fillStyle = '#2b2130'; circle(10, -2, 1.3); ctx.fill(); }
  ctx.restore();
}
// the Bookworm's speech bubble
function popdragonBubble(str, x, y, a) {
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
  ctx.font = '700 16px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = Math.min(420, ctx.measureText(str).width + 30), h = 34;
  x = clamp(x, w / 2 + 10, W - w / 2 - 60); y = clamp(y, 140, H - 90);
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#2b2130'; ctx.lineWidth = 2;
  rr(x - w / 2, y - h, w, h, 14); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 8, y - 1); ctx.lineTo(x + 2, y + 12); ctx.lineTo(x + 8, y - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(x - 7, y - 3, 14, 3);
  ctx.fillStyle = '#5a8a2a'; circle(x - w / 2 + 14, y - h / 2, 5); ctx.fill();
  text(str, x + 6, y - h / 2 + 1, 16, '#2b2130', 'center', 'body');
  ctx.restore();
}

/* ---------- sounds (named in plain words so the texture layers apply) ---------- */
Object.assign(Sfx.extra, {
  popdragonWhoosh() { this.noise(0.5, { type: 'bandpass', f: 600, to: 2400, q: 0.8, vol: 0.22, a: 0.08 }); },
  popdragonTuck() { this.noise(0.16, { type: 'highpass', f: 2000, vol: 0.14 }); this.tone(520, 0.08, 'triangle', 0.06, 0, 300); },
  popdragonFire() { for (let i = 0; i < 7; i++) this.noise(0.06, { type: 'bandpass', f: 1800 + i * 300, q: 2, vol: 0.12, delay: i * 0.06 }); this.tone(220, 0.3, 'sawtooth', 0.04, 0, 160); },
  popdragonBurn() { this.noise(0.7, { type: 'highpass', f: 1400, vol: 0.18, a: 0.05 }); for (let i = 0; i < 6; i++) this.noise(0.03, { type: 'highpass', f: 3000, vol: 0.2, delay: 0.05 + i * 0.1 }); },
  popdragonTail() { this.noise(0.25, { type: 'bandpass', f: 900, to: 1800, q: 1.4, vol: 0.16 }); },
  popdragonStar() { this.tone(1180, 0.07, 'triangle', 0.08); this.tone(1580, 0.09, 'triangle', 0.07, 0.05); },
  popdragonCrumple() { this.noise(0.35, { type: 'bandpass', f: 1200, q: 0.6, vol: 0.32 }); for (let i = 0; i < 5; i++) this.noise(0.04, { type: 'highpass', f: 2600, vol: 0.22, delay: i * 0.05 }); this.tone(140, 0.2, 'square', 0.06, 0, 90); },
  popdragonSmooth() { this.noise(0.4, { type: 'bandpass', f: 1500, to: 600, q: 0.8, vol: 0.12 }); [784, 988, 1175].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.08, 0.05 + i * 0.08)); },
  popdragonRefold() { this.noise(0.6, { type: 'bandpass', f: 900, q: 0.5, vol: 0.28 }); this.tone(330, 0.4, 'triangle', 0.08, 0.3, 220); },
  popdragonUnfold() { for (let i = 0; i < 6; i++) this.noise(0.08, { type: 'bandpass', f: 1000 + i * 200, q: 1.2, vol: 0.12, delay: i * 0.12 }); },
  popdragonWing() { this.noise(0.12, { type: 'lowpass', f: 900, vol: 0.06 }); },
});

/* ---------- the level ---------- */
// World 41 is the 41-1 thread's (js/levels/world41/world.js). Until that lands this file adds a stand-in entry so the
// level can be played and tested on its own; once world.js is in, it is left alone.
if (!WORLDS[40]) WORLDS[40] = { name: 'Pop-Up Storybook', blurb: 'Fly a paper dragon out of the book after the runaway page!', outfit: 'popbook',
  theme: { skyTop: '#2e2a3a', skyBot: '#6a5a6a', hillFar: '#5a4a5a', hillNear: '#4a3a4a', sun: 'rgba(255,240,200,0.9)', sunGlow: 'rgba(255,220,160,0.3)', stone: '#c9a27a', stoneLight: '#e0c098', stoneEdge: '#8a6a4a', grass: '#7cc48a', grassDark: '#4f9a5a', plank: '#e8c88a', plankDark: '#a8884a', rope: '#e8d6a8', ropeDark: '#a8966a' } };
LEVELS.push(
  // ----- BEGIN 41-3 Paper Dragon Flight (mode 'popdragon', js/levels/world41/paper-dragon-flight.js) -----
  { name: 'Paper Dragon Flight', world: 40, kind: 'team', mode: 'popdragon', view3d: true, touch: 'stick', ownStep: true, ownHUD: true, noFalls: true, noTime: true,
    outfit: 'popdragon',
    tip: 'One steers, one flies. Push the same way together to swoop.',
    act: { label: 'fire', labels: ['fire', 'swish'] },
    jobs: {
      steer: { title: 'Steers', act: 'fire', legend: '<kbd>A</kbd><kbd>D</kbd> steer left and right <kbd>F</kbd> fire breathe fire <kbd>W</kbd><kbd>S</kbd> help up and down <kbd>Space</kbd> tuck wings with Bo',
        howTo: ['One steers. One flies up and down.'] },
      wings: { title: 'Flies', act: 'swish', legend: '<kbd>W</kbd><kbd>S</kbd> fly up and down <kbd>F</kbd> swish the tail <kbd>A</kbd><kbd>D</kbd> help left and right <kbd>Space</kbd> tuck wings with Pip',
        howTo: ['Push the same way together to swoop.'] },
    },
    job: ['steer', 'wings'],
    howTo: ['One steers. One flies up and down.', 'Push the same way together to swoop.', 'Both hold jump to tuck through gaps.'],
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)] },
  // ----- END 41-3 Paper Dragon Flight -----
);
