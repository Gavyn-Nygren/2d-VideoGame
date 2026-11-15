/* Pip & Bo - Level 40-1 The Iron Colossus: Part 2 'leg' (The Swinging Leg). */
'use strict';

/* ===== 40-1 Part 2: The Swinging Leg (IRON_PHASES.leg) ===============================================================
   Climb the outside of a leg that keeps walking, ankle to hip (13 ledges, about 4 screens). Tumbleweed Gulch below.
   THE STRIDE (IRONLEG.stride s): planted and upright for `up` s, then it swings forward for `swing` s, leaning up to
   `lean` and back. The page really tilts (the part's view): the camera stays level with the horizon.
   THE PHYSICS is done in the leg's own frame (ledges level, ramps at `plateA`). A surface's slope on screen is its own
   slope minus the lean, so the steep greased plates (50 deg) can only be run while the leg leans past 14 deg: in the
   swing. Upright they are too steep: you slide back down to the ledge (no jumping off a sliding plate).
   THE PLANT: a jolt (KLANG) with a "kla..." tell `tell` s before. In the air at the plant: knocked back. On a plate:
   it is steep again, you slide back to your ledge. On a ledge: fine.
   STATIONS, bottom to top (the plan alternates who leads at the two-hero ones):
     ramps     plates from one ledge up to the next (rivets on them; some have a steam vent that puffs mid-swing on
               alternate strides, hissing for `vent.tell` s first: a puff knocks you off, a Clang)
     ballast   a block on a rail slides downhill (right) in every swing and creeps back when upright. One BRACES it
               (holds the action beside it), the climber hops block -> upper ledge, then gives the HAND UP from the edge.
     pistons   two pistons: crouch on one and the other rises 150 px. The rider steps off onto the ledge above and
               pulls the LEVER there: both lock high, a lift for the presser.
     the knee  a gate in the knee hinge opens in the swing and shuts at the plant. Through it, the far side's LEVER
               (hold the action) keeps it open for the partner. Safe spot.
     the hip   a huge slow gear: both stand on its tooth at once and it carries them up into the belt gallery.
   FAILS (Clangs): a vent's puff; a fall of more than a ledge and a half. Crows (oil birds) on some ledges flap in
   your face if you walk into them: a stumble, no Clang.
   GOLD HELP after IRON.goldAfter misses (Clangs, or sliding back down a ramp): the swing takes `goldSwing` s and the plant
   tell is `goldTell` s.
   Rivets: 10 (8 on ramps that only work in a swing, 2 on ledges).   Stats (st.stats.leg): ramps, braces, lifts.
   Names: ironLeg* / IRONLEG*, sounds ironleg*. */
const IRONLEG = {
  stride: 3.3, up: 1.5, swing: 1.8, lean: 30 * Math.PI / 180, tell: 0.6, goldUp: 1.5, goldSwing: 2.5, goldTell: 1.0,
  plateA: 50 * Math.PI / 180, maxA: 38 * Math.PI / 180, lip: 26, dropHold: 0.4, slideV: 270, storey: 150, plateDX: 126,
  halfW: 290, view: { cx: 480, cy: 300 },
  // ledges: [y, x0, x1] in the leg's frame (y up is negative; 0 is the ankle cuff)
  ledges: [[0, -290, 290], [-150, -144, 290], [-300, 66, 290], [-450, -290, 200], [-600, -134, 290], [-750, 26, 290], [-900, -290, 100],
    [-1050, -134, 290], [-1200, 36, 290], [-1350, -290, 200], [-1500, -134, 290], [-1650, -290, 100], [-1800, -134, 290], [-1950, 66, 290]],
  // plates (ramps): [x at the bottom, the ledge it starts on, vent (0 none, 1 puffs on odd strides, 2 on even)]
  plates: [[-270, 0, 0], [-60, 1, 0], [-260, 3, 1], [-100, 4, 0], [-260, 6, 0], [-90, 7, 2], [-260, 9, 0], [-260, 11, 1], [-60, 12, 0]],
  // the stations, by the ledge they start from
  blocks: [{ from: 2, rest: 110, end: 196, w: 60, h: 75 }, { from: 8, rest: 80, end: 196, w: 60, h: 75 }],
  pistons: [{ from: 5, a: 100, b: 170, w: 60, h0: 30, lever: 66 }, { from: 10, a: 100, b: 170, w: 60, h0: 30, lever: 66 }],
  knee: { ledge: 6, gate: -70, gateW: 16, gateH: 110, lever: -128 },
  ring: { ledge: 13, x0: 130, x1: 290 },
  crows: [[4, 60], [9, -170], [12, 180]],
  vent: { tell: 0.7, puff: 0.45, at: 0.5 },
  rivets: [[-207, -95], [3, -245], [-197, -545], [-37, -695], [-197, -995], [-27, -1145], [-197, -1445], [-197, -1745], [-180, -470], [-104, -1822]],
};
const ironLegLedge = i => IRONLEG.ledges[i];
const ironLegPlate = i => { const [x, from, vent] = IRONLEG.plates[i]; return { i, x0: x, x1: x + IRONLEG.plateDX, yb: ironLegLedge(from)[0], yt: ironLegLedge(from)[0] - IRONLEG.storey, from, to: from + 1, vent }; };
const ironLegUp = st => (ironHasGold(st, 'leg') ? IRONLEG.goldUp : IRONLEG.up);
const ironLegSwing = st => (ironHasGold(st, 'leg') ? IRONLEG.goldSwing : IRONLEG.swing);
const ironLegTellT = st => (ironHasGold(st, 'leg') ? IRONLEG.goldTell : IRONLEG.tell);

function ironLegSetup(st, L) {
  const ph = st.ph, K = IRONLEG;
  ph.first = L.def.first || 0;
  ph.t = 0; ph.sc = 0.4; ph.strides = 0; ph.theta = 0; ph.swinging = false; ph.told = false;
  ph.plateList = K.plates.map((_, i) => ironLegPlate(i));
  ph.blocks = K.blocks.map((b, i) => Object.assign({ i, x: b.rest, dx: 0, braced: -1, done: false }, b));
  ph.pistons = K.pistons.map((q, i) => Object.assign({ i, ha: q.h0, hb: q.h0, locked: false, done: false }, q));
  ph.gate = { open: 0, held: -1, done: false };
  ph.crows = K.crows.map(([l, x], i) => ({ i, l, x, t: 0, away: 0, flap: 0 }));
  ph.vents = ph.plateList.filter(p => p.vent).map(p => ({ plate: p.i, state: 'idle', t: 0 }));
  ph.ring = { t: -1 }; ph.camY = -380;
  ph.ledgeOf = [0, 0]; ph.fallFrom = [0, 0];
  st.cam = { x: -480, y: -380 };
  const ps = G.players;
  ps.forEach((p, k) => Object.assign(p, { x: -230 + k * 46 - p.w / 2 - st.cam.x, y: -p.h - st.cam.y, vx: 0, vy: 0, face: 1, grounded: true, alive: true }));
  ironRivetsSetup(st, K.rivets);
  const s = ironStats(st); Object.assign(s, { ramps: s.ramps || 0, braces: s.braces || 0, lifts: s.lifts || 0 });
  Object.assign(st.tick, { hidden: true });
  ironLegBuild(ph);
  ph.prep = [];
  for (let l = 0; l < 2; l++) ph.prep.push(() => IRON_ART.gulch(l));
  for (let k = 0; k < 5; k++) ph.prep.push(() => IRON_ART.legChunk(k));
  ph.prep.push(() => IRON_ART.farLeg(), () => IRON_ART.cloudBank(0), () => IRON_ART.cloudBank(1), () => IRON_ART.kneeDrum(), () => IRON_ART.legCuff());
  ph.prep.push(() => IRON_ART.legPlate(0), () => IRON_ART.legPlate(1), () => IRON_ART.ballast(), () => IRON_ART.piston(), () => IRON_ART.legLever(), () => IRON_ART.kneeGate(), () => IRON_ART.hipGear(), () => IRON_ART.legVent());
  K.ledges.forEach(([y, x0, x1], i) => ph.prep.push(() => IRON_ART.legLedge(x1 - x0, i)));
  for (const pose of ['sit', 'flap']) ph.prep.push(() => IRON_ART.crow(pose));
}
// the solids (the leg's frame): ledges (one-way), plates (one-way slopes), the side walls, blocks, pistons, the gate
function ironLegBuild(ph) {
  const K = IRONLEG, S = [];
  K.ledges.forEach(([y, x0, x1], i) => S.push({ x0, y0: y, x1, y1: y + 16, one: true, kind: 'ledge', ledge: i }));
  for (const p of ph.plateList) S.push({ slope: true, x0: p.x0, x1: p.x1, ya: p.yb, yb: p.yt, one: true, kind: 'plate', plate: p.i, a: K.plateA });
  S.push({ x0: -K.halfW - 60, y0: -2600, x1: -K.halfW, y1: 400, kind: 'side' }, { x0: K.halfW, y0: -2600, x1: K.halfW + 60, y1: 400, kind: 'side' });
  for (const b of ph.blocks) { const y = ironLegLedge(b.from)[0]; b.solid = { x0: b.x, y0: y - b.h, x1: b.x + b.w, y1: y, kind: 'block', block: b, dx: 0, dy: 0 }; S.push(b.solid); }
  for (const q of ph.pistons) {
    const y = ironLegLedge(q.from)[0];
    q.sa = { x0: q.a, y0: y - q.ha, x1: q.a + q.w, y1: y + 4, kind: 'piston', piston: q, side: 'a', dx: 0, dy: 0 };
    q.sb = { x0: q.b, y0: y - q.hb, x1: q.b + q.w, y1: y + 4, kind: 'piston', piston: q, side: 'b', dx: 0, dy: 0 };
    S.push(q.sa, q.sb);
  }
  const G0 = K.knee, gy = ironLegLedge(G0.ledge)[0];
  ph.gateSolid = { x0: G0.gate, y0: gy - G0.gateH, x1: G0.gate + G0.gateW, y1: gy, kind: 'gate', off: false };
  S.push(ph.gateSolid);
  ph.solids = S;
}
// the stride clock: 0 .. up (planted), up .. up + swing (the swing); theta follows a half sine
function ironLegClock(st, dt) {
  const ph = st.ph, K = IRONLEG, up = ironLegUp(st), sw = ironLegSwing(st), T = up + sw;
  const was = ph.sc;
  ph.sc += dt;
  if (!ph.told && ph.sc >= T - ironLegTellT(st)) { ph.told = true; Sfx.play('ironStompTell'); ironWord(st, 'kla...', st.cam.x + 480, st.cam.y + 470, 18, { life: ironLegTellT(st), grow: 1.1, fill: SKETCH.PAL.ochre, key: 'kla' }); }
  if (ph.sc >= T) { ph.sc -= T; ph.strides++; ph.told = false; ironLegPlant(st); }
  const u = (ph.sc - up) / sw;
  ph.theta = u > 0 && u < 1 ? K.lean * Math.sin(Math.PI * u) : 0;
  ph.swinging = u > 0 && u < 1;
  ph.u = u;
  if (was < up && ph.sc >= up) Sfx.play('ironlegSwingCreak');
}
function ironLegPlant(st) {
  const ph = st.ph;
  Sfx.play('ironlegPlantClang'); rumble(0, 0.6, 0.5, 200); rumble(1, 0.6, 0.5, 200);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.25);
  ironWord(st, 'KLANG!', st.cam.x + 480, st.cam.y + 120, 40, { life: 0.9, grow: 0.25, rise: 8 });
  for (const p of G.players) if (p.alive && !p.grounded && !(st.haul && st.haul.who === p.id)) { p.vx -= 160; ironPop(st, p.x + p.w / 2, p.y - 6, 'WHOA!', { size: 12 }); }
  if (!ph.gate.done && ph.gate.held < 0) ph.gate.open = 0;
}
// how steep a surface is on screen right now (radians, positive rising to the right)
const ironLegSlopeNow = (ph, r) => (r && r.kind === 'plate' ? r.a : 0) - ph.theta;
// a hero's own control on the leg: on a plate too steep to stand on, slide down it (no running up, no jumping)
function ironLegCtl(p, dt) {
  const ph = G.mst.ph, K = IRONLEG, g = p.ground;
  const steep = p.grounded && g && g.kind === 'plate' && ironLegSlopeNow(ph, g) > K.maxA;
  // the top lip: nearly at the top when it turns too steep, you catch it and scramble over onto the ledge above; and
  // a pawl there stops anyone stepping back down onto a plate from its ledge (ramps only go up)
  const pl = p.grounded && g && g.kind === 'plate' ? ph.plateList[g.plate] : null;
  if (pl && p.x + p.w / 2 > pl.x1 - K.lip && (steep || p.input.left && !p.input.right)) { p.x = pl.x1 + 1; p.y = pl.yt - p.h; p.vy = 0; p.vx = 0; p.grounded = false; p.sliding = false; return; }
  // dropping through a ledge takes a deliberate hold of down (a crouch for the pistons never drops you by mistake)
  p.downHeld = p.input.down ? (p.downHeld || 0) + dt : 0;
  if (!steep && p.input.down && p.grounded && g && g.kind === 'ledge' && p.downHeld < K.dropHold) {
    const real = p.input; p.input = Object.assign({}, real, { down: false });
    try { control(p, dt); } finally { p.input = real; }
    p.sliding = false; return;
  }
  if (!steep) { control(p, dt); p.sliding = false; return; }
  // starting to slide back down a ramp counts as a miss toward the gold help (no Clang)
  if (!p.sliding && p.y + p.h < pl.yb - 30 && ironMiss(G.mst, 'leg') >= IRON.goldAfter) ironLegGold(G.mst);
  const real = p.input;
  p.input = Object.assign({}, real, { left: false, right: false, jump: false, up: false }); p.pendingJump = false;
  try { control(p, dt); } finally { p.input = real; }
  p.vx = -K.slideV; p.face = -1; p.sliding = true;
}
function ironLegStep(st, dt) {
  const ph = st.ph, K = IRONLEG, ps = G.players;
  ph.t += dt;
  if (ph.ring.t >= 0) { ironLegRingStep(st, dt); return; }
  if (st.idle) { ironCoast(st, dt, ph.solids); return; }
  ironLegClock(st, dt);
  ironLegBlocks(st, dt);
  ironLegPistons(st, dt);
  ironLegGate(st, dt);
  ironHandUp(st, dt, { edge: 70 });
  for (const p of ps) {
    if (st.haul && st.haul.who === p.id) continue;
    const was = p.grounded;
    ironBody(p, dt, ph.solids, { partner: true, ctl: ironLegCtl });
    // falls: a long drop is a Clang (slid off a plate and down past the ledge below)
    if (was && !p.grounded) ph.fallFrom[p.id] = p.y + p.h;
    if (!p.grounded && p.vy < 0) ph.fallFrom[p.id] = Math.min(ph.fallFrom[p.id], p.y + p.h);
    if (!was && p.grounded) {
      const drop = p.y + p.h - ph.fallFrom[p.id];
      if (drop > K.storey * 1.45 && !p.onPartner) { if (ironClang(st, p, { still: true, kind: 'fall', word: 'CLANG!' }) && ironMiss(st, 'leg') >= IRON.goldAfter) ironLegGold(st); }
    }
    if (p.grounded) ph.fallFrom[p.id] = p.y + p.h;
    if (p.grounded && p.ground && p.ground.kind === 'ledge' && p.ground.ledge !== ph.ledgeOf[p.id]) {
      const l0 = ph.ledgeOf[p.id], l1 = p.ground.ledge;
      if (l1 === l0 + 1 && ph.plateList.some(q => q.from === l0)) ironStats(st).ramps++;
      ph.ledgeOf[p.id] = l1;
    }
    // fell out under the ankle (should not happen): back onto the cuff
    if (p.y > 300) { p.x = -200; p.y = -p.h - 2; p.vy = 0; }
  }
  ironLegVents(st, dt);
  ironLegCrows(st, dt);
  // the hip gear: both on its tooth
  const R = K.ring, ry = ironLegLedge(R.ledge)[0];
  const on = ps.filter(p => p.alive && p.grounded && Math.abs(p.y + p.h - ry) < 3 && p.x + p.w / 2 > R.x0 && p.x + p.w / 2 < R.x1);
  if (on.length === 2) { ph.ring.t = 0; Sfx.play('ironlegGearCarry'); ironNews(st, 'The hip gear turns. Hold on!'); ironCelebrate(st, 0.5); }
  else if (on.length === 1 && !(ph.ringNag > 0)) { ph.ringNag = 6; ironSay(st, 'It needs both of you on the gear!', 3, { caption: true }); }
  if (ph.ringNag > 0) ph.ringNag -= dt;
  ironLegCamera(st, dt);
  ironRivetsStep(st, dt);
  ironLegHints(st);
}
function ironLegGold(st) { ironGoldOnce(st, 'leg', 'Gold help! The leg swings slower now, and the stomp is called earlier.'); }
// the camera: follows the lower hero, keeps the upper in view when it can
function ironLegCamera(st, dt) {
  const ps = G.players.filter(p => p.alive);
  if (!ps.length) return;
  const lo = Math.max(...ps.map(p => p.y + p.h)), hi = Math.min(...ps.map(p => p.y));
  let want = lo - 400;
  if (hi < want + 70) want = Math.max(hi - 70, lo - 500);
  want = clamp(want, -2180, -380);
  st.ph.camY += (want - st.ph.camY) * Math.min(1, dt * 3);
  st.cam.y = st.ph.camY; st.cam.x = -480;
}
/* --- ballast blocks --- */
function ironLegBlocks(st, dt) {
  const ph = st.ph, K = IRONLEG;
  for (const b of ph.blocks) {
    const y = ironLegLedge(b.from)[0], x0 = b.x;
    // a brace: a hero on the block's ledge right beside it, holding the action
    // (a brace stays wedged for a moment after letting go, so a blink does not lose it)
    const was = b.braced;
    b.braced = -1;
    for (const p of G.players) {
      // the action beside it, or simply leaning on it (pushing into its side)
      if (!p.alive || !p.grounded || !p.ground || p.ground.ledge !== b.from) continue;
      const cx = p.x + p.w / 2, R = cx > b.x + b.w - 2 && cx < b.x + b.w + 30, L = cx < b.x + 2 && cx > b.x - 30;
      const lean = R && p.input.left && p.x <= b.x + b.w + 1 || L && p.input.right && p.x + p.w >= b.x - 1;
      if ((R || L) && p.input.act || lean) b.braced = p.id;
    }
    if (b.braced >= 0) b.wedge = 1.2; else if ((b.wedge = (b.wedge || 0) - dt) > 0 && was >= 0) b.braced = was;
    if (b.braced >= 0 && !b.bracedWas) { Sfx.play('ironlegBlockBrace'); ironStats(st).braces++; }
    // braced from the downhill side while upright: the bracer shoves it home and walks with it
    if (b.braced >= 0 && !ph.swinging && b.x > b.rest) {
      const bp = G.players[b.braced];
      if (bp.x + bp.w / 2 > b.x + b.w / 2) { const m = Math.min(110 * dt, b.x - b.rest); b.x -= m; bp.x -= m; }
    }
    b.bracedWas = b.braced >= 0;
    if (b.braced < 0) {
      if (ph.theta > 0.1) b.x = Math.min(b.end, b.x + 150 * dt * ph.theta / K.lean);
      else if (!ph.swinging) b.x = Math.max(b.rest, b.x - 40 * dt);
      // a hero standing in its way at the wall end stops it
      for (const p of G.players) { if (!p.alive || p.ground !== null && p.ground && p.ground.ledge !== b.from) continue; const px = p.x; if (b.x + b.w > px && x0 + b.w <= px + 1 && p.y + p.h > y - b.h && px + p.w >= K.halfW - 1) b.x = px - b.w; }
    }
    if (Math.abs(b.x - x0) > 0.5 && ph.theta > 0.1 && b.braced < 0 && !b.sliding) { b.sliding = true; Sfx.play('ironlegBlockSlide'); }
    if (b.x === x0) b.sliding = false;
    b.solid.x0 = b.x; b.solid.x1 = b.x + b.w; b.solid.dx = b.x - x0;
    // heroes standing in its path get shoved along
    for (const p of G.players) {
      if (!p.alive || p.grounded && p.ground === b.solid) continue;
      if (p.y + p.h > y - b.h + 2 && p.y < y && p.x < b.x + b.w && p.x + p.w > b.x) { if (b.x > x0) p.x = b.x + b.w; else if (b.x < x0) p.x = b.x - p.w; }
    }
    if (!b.done && G.players.every(p => (p.y + p.h) <= ironLegLedge(b.from + 1)[0] + 2)) { b.done = true; ironCelebrate(st, 0.5); ironSwap(st); }
  }
}
/* --- pistons --- */
function ironLegPistons(st, dt) {
  const ph = st.ph, K = IRONLEG;
  for (const q of ph.pistons) {
    const on = side => G.players.filter(p => p.alive && p.grounded && p.ground === (side === 'a' ? q.sa : q.sb));
    const pa = on('a').some(p => p.input.down), pb = on('b').some(p => p.input.down);
    let ta = q.h0, tb = q.h0;
    // locked: the near one stays up as a bridge to the ledge; the far one is a lift (down empty, up with someone on it)
    if (q.locked) { ta = K.storey; tb = on('b').length ? K.storey : 0; }
    else if (pa && !pb) { ta = 0; tb = K.storey; }
    else if (pb && !pa) { tb = 0; ta = K.storey; }
    const v = 170 * dt, ha0 = q.ha, hb0 = q.hb;
    q.ha += clamp(ta - q.ha, -v, v); q.hb += clamp(tb - q.hb, -v, v);
    if ((q.ha !== ha0 || q.hb !== hb0) && !q.hissT) { q.hissT = 0.6; Sfx.play('ironlegPistonHiss'); }
    q.hissT = Math.max(0, (q.hissT || 0) - dt);
    const y = ironLegLedge(q.from)[0];
    q.sa.y0 = y - q.ha; q.sa.dy = -(q.ha - ha0); q.sb.y0 = y - q.hb; q.sb.dy = -(q.hb - hb0);
    // a rising piston has a rim: whoever rides it up stays on it until it stops
    for (const [sol, h, h0] of [[q.sa, q.ha, ha0], [q.sb, q.hb, hb0]]) {
      if (h <= h0 + 1e-6) continue;
      for (const p of G.players) if (p.alive && p.grounded && p.ground === sol) p.x = clamp(p.x, sol.x0 - p.w / 2 + 4, sol.x1 - p.w / 2 - 4);
    }
    // the lever on the ledge above: anyone up there pressing the action beside it locks both high
    const ly = ironLegLedge(q.from + 1)[0];
    if (!q.locked) for (const p of G.players) {
      if (!p.alive || !p.grounded || Math.abs(p.y + p.h - ly) > 3 || !(p.input.act || p.pendingAct)) continue;
      if (Math.abs(p.x + p.w / 2 - q.lever) < 30) { q.locked = true; p.pendingAct = false; Sfx.play('ironlegLeverClunk'); ironPop(st, q.lever, ly - 50, 'CLUNK!', { size: 15 }); ironStats(st).lifts++; ironNews(st, 'Locked! Ride the far piston up.'); }
    }
    if (!q.done && G.players.every(p => (p.y + p.h) <= ly + 2 && p.x + p.w / 2 < q.a + 4)) { q.done = true; ironCelebrate(st, 0.5); ironSwap(st); }
  }
}
/* --- the knee gate --- */
function ironLegGate(st, dt) {
  const ph = st.ph, K = IRONLEG, G0 = K.knee, gy = ironLegLedge(G0.ledge)[0], gt = ph.gate;
  gt.held = -1;
  for (const p of G.players) if (p.alive && p.grounded && Math.abs(p.y + p.h - gy) < 3 && p.input.act && Math.abs(p.x + p.w / 2 - G0.lever) < 24) gt.held = p.id;
  const want = ph.theta > 0.18 || gt.held >= 0 || gt.done ? 1 : (ph.swinging ? gt.open : 0);
  const was = gt.open;
  gt.open += clamp(want - gt.open, -dt * 5, dt * 3);
  if (was < 0.5 && gt.open >= 0.5) Sfx.play('ironlegKneeOpen');
  if (was >= 0.5 && gt.open < 0.5) Sfx.play('ironlegKneeShut');
  ph.gateSolid.off = gt.open > 0.5;
  // shutting on a hero: they are pushed out to the side they are more on
  if (!ph.gateSolid.off) for (const p of G.players) {
    const s = ph.gateSolid;
    if (p.alive && p.x + p.w > s.x0 && p.x < s.x1 && p.y + p.h > s.y0 && p.y < s.y1) p.x = p.x + p.w / 2 < (s.x0 + s.x1) / 2 ? s.x0 - p.w : s.x1;
  }
  if (!gt.done && G.players.every(p => p.x + p.w / 2 < G0.gate - 10 && Math.abs(p.y + p.h - gy) < 40)) { gt.done = true; ironCelebrate(st, 0.6); ironSwap(st); ironNews(st, 'Through the knee! Halfway up.'); }
}
/* --- steam vents on some plates: they puff mid-swing on alternate strides --- */
function ironLegVents(st, dt) {
  const ph = st.ph, K = IRONLEG, up = ironLegUp(st);
  const at = up + ironLegSwing(st) * K.vent.at;
  for (const v of ph.vents) {
    const pl = ph.plateList[v.plate], due = pl.vent === 1 ? ph.strides % 2 === 1 : ph.strides % 2 === 0;
    v.t += dt;
    if (v.state === 'idle' && due && ph.sc >= at - K.vent.tell && ph.sc < at) { v.state = 'tell'; v.t = 0; Sfx.play('ironlegVentPuff'); }
    else if (v.state === 'tell' && v.t >= K.vent.tell) { v.state = 'puff'; v.t = 0; Sfx.play('ironlegVentPuff'); }
    else if (v.state === 'puff') {
      for (const p of G.players) {
        if (!p.alive || st.safe[p.id] > 0) continue;
        const cx = p.x + p.w / 2;
        if (Math.abs(cx - (pl.x0 + pl.x1) / 2) < 40 && p.y + p.h > pl.yt - 30 && p.y + p.h < pl.yb - 8) {   // the middle of the plate, where the nozzle is
          knock(p, -240, -260, 0.3, 0.3);
          if (ironClang(st, p, { still: true, kind: 'vent', word: 'PFFT!' }) && ironMiss(st, 'leg') >= IRON.goldAfter) ironLegGold(st);
        }
      }
      if (v.t >= K.vent.puff) { v.state = 'idle'; v.t = 0; }
    }
  }
}
/* --- the oil birds --- */
function ironLegCrows(st, dt) {
  const ph = st.ph;
  for (const c of ph.crows) {
    c.t += dt; c.flap = Math.max(0, c.flap - dt);
    if (c.away > 0) { c.away -= dt; continue; }
    const y = ironLegLedge(c.l)[0];
    for (const p of G.players) {
      if (!p.alive || !p.grounded || Math.abs(p.y + p.h - y) > 3) continue;
      if (Math.abs(p.x + p.w / 2 - c.x) < 16) {
        c.away = 6; c.flap = 0.8; p.stun = Math.max(p.stun, 0.45); p.vx = 0;
        Sfx.play('ironlegCrowFlap'); Sfx.play('ironlegCrowCaw'); ironPop(st, c.x, y - 40, 'CAW!', { size: 14 });
      }
    }
  }
}
/* --- the hip gear carries them up --- */
function ironLegRingStep(st, dt) {
  const ph = st.ph, r = ph.ring, R = IRONLEG.ring, ry = ironLegLedge(R.ledge)[0];
  r.t += dt;
  ph.theta = Math.max(0, ph.theta - dt * 0.6);
  G.players.forEach((p, k) => { p.vx = 0; p.vy = 0; p.grounded = true; const a = Math.min(1, r.t / 2.2) * 1.2; p.x = 210 - k * 34 + Math.sin(a) * 40 - p.w / 2; p.y = ry - p.h - (1 - Math.cos(a)) * 160 - a * 60; });
  st.cam.y += ((ry - 520) - st.cam.y) * Math.min(1, dt * 2);
  if (r.t > 2.4 && !st.cut) ironPhaseDone(st, { say: 'Up to its belt. It is looking at you now...' });
}

/* --- the plan: what each hero should be doing (hints, badges and the brain read it) --- */
// the station a ledge starts: { kind: 'ramp' | 'block' | 'piston' | 'knee' | 'ring', ... }
function ironLegStation(ph, ledge, p) {
  const K = IRONLEG;
  const b = ph.blocks.find(q => q.from === ledge); if (b) return { kind: 'block', b };
  const q = ph.pistons.find(q2 => q2.from === ledge); if (q) return { kind: 'piston', q };
  if (ledge === K.knee.ledge && p && p.x + p.w / 2 > K.knee.gate + K.knee.gateW / 2) return { kind: 'knee' };
  if (ledge === K.ring.ledge) return { kind: 'ring' };
  const pl = ph.plateList.find(r => r.from === ledge); if (pl) return { kind: 'ramp', pl };
  return { kind: 'none' };
}
// can a hero at x start this ramp now and be up before the plant? (the brain's rule, with 0.25 s to spare)
function ironLegRampOk(st, pl, x) {
  const ph = st.ph, K = IRONLEG, up = ironLegUp(st), sw = ironLegSwing(st), u = (ph.sc - up) / sw;
  const uOff = Math.asin(Math.min(1, (K.plateA - K.maxA) / K.lean)) / Math.PI;   // the share of the swing it is too steep
  if (u < uOff - 0.04 || u > 1 - uOff) return false;
  const tLeft = (1 - uOff - u) * sw, need = (Math.abs(pl.x0 - x) + K.plateDX) / PHYS.maxRun + 0.25;
  return tLeft > need;
}
function ironLegPlan(st) {
  const ph = st.ph, K = IRONLEG, ps = G.players, out = [{}, {}];
  if (ph.ring.t >= 0) return [{ why: 'ride' }, { why: 'ride' }];
  const L = ps.map(p => ph.ledgeOf[p.id]);
  const lo = Math.min(L[0], L[1]);
  for (const id of [0, 1]) {
    const p = ps[id], o = ps[1 - id], l = L[id], cx = p.x + p.w / 2, s = ironLegStation(ph, l, p);
    const ahead = l > lo;
    if (s.kind === 'block') {
      const b = s.b, climb = (ph.first + b.i) % 2, ly = ironLegLedge(l + 1);
      out[id] = L[1 - id] === l + 1 ? { why: 'reach', x: ly[2] + 22, say: 'Stand under the edge for a hand up!' }
        : id === climb
        ? (p.grounded && p.ground === b.solid ? { why: 'hop', x: b.x + 11, say: 'Jump up onto the ledge!' } : { why: 'climb', x: b.x + 11, say: b.braced >= 0 ? 'Up onto the block, then the ledge!' : 'Brace it!' })
        : { why: 'brace', x: Math.min(b.x + b.w + 12, IRONLEG.halfW - 12), hold: 'act', say: 'Lean on the block (or hold ' + ironKey(id, 'act') + ' beside it): brace it!' };
      void ly;
    } else if (s.kind === 'piston') {
      const q = s.q, rider = (ph.first + q.i) % 2;
      if (q.locked) out[id] = { why: 'lift', x: q.b + q.w / 2 };
      else out[id] = id === rider ? { why: 'ride', x: q.a + q.w / 2, say: 'Stand on the near piston and ride it up!' } : { why: 'press', x: q.b + q.w / 2, hold: 'down', say: 'When ' + NAMES[1 - id] + ' is on the near piston, crouch on the far one!' };
    } else if (s.kind === 'knee') {
      out[id] = { why: 'knee', x: K.knee.gate + 30, say: 'Run through the knee while it swings open!' };
    } else if (s.kind === 'ring') {
      out[id] = { why: 'ring', x: 250 - id * 40, say: L[1 - id] === l ? null : 'Wait on the hip gear for ' + NAMES[1 - id] + '.' };
    } else if (s.kind === 'ramp') {
      out[id] = { why: 'ramp', x: s.pl.x0 - 14, plate: s.pl, say: ph.swinging ? 'Run up the ramp now!' : 'Wait for the swing, then run up!' };
    }
    // someone on the ledge above a two-hero station helps from there
    if (ahead && l === lo + 1) {
      const sl = ironLegStation(ph, lo, o);
      if (sl.kind === 'block') out[id] = { why: 'hand', x: ironLegLedge(l)[2] - 36, hold: 'act', say: 'Hold ' + ironKey(id, 'act') + ' at the edge: pull ' + NAMES[1 - id] + ' up!' };
      else if (sl.kind === 'piston' && !sl.q.locked) out[id] = { why: 'lever', x: sl.q.lever, tap: 'act', say: 'Pull the lever! (' + ironKey(id, 'act') + ')' };
      else if (sl.kind === 'piston') out[id] = { why: 'wait', x: sl.q.lever - 40 };
      else if (sl.kind === 'ramp') out[id] = { why: 'wait', x: ironLegWaitX(ph, l) };
    } else if (ahead && l >= lo + 2) out[id] = { why: 'drop', x: ironLegDropX(l, cx), say: 'Too far ahead! Hold ' + ironKey(id, 'down') + ' to drop back down to ' + NAMES[1 - id] + '.' };
    else if (ahead) out[id] = { why: 'wait', x: ironLegWaitX(ph, l), say: 'Wait for ' + NAMES[1 - id] + '.' };
    // the knee: the one through holds the lever for the other
    if (l === K.knee.ledge && L[1 - id] === l) {
      const through = q => q.x + q.w / 2 < K.knee.gate - 4;
      if (through(p) && !through(o) && !ph.gate.done) out[id] = { why: 'gate', x: K.knee.lever, hold: 'act', say: 'Hold ' + ironKey(id, 'act') + ' on the lever: keep the gate open!' };
      else if (!through(p) && through(o) && !ph.gate.done) out[id] = { why: 'through', x: K.knee.gate - 40, say: ph.gate.held >= 0 ? 'Through the gate, quick!' : 'Wait for the lever.' };
    }
    void cx;
  }
  return out;
}
// where to wait on a ledge (out of the way, not on a crow)
// where to drop from ledge l to the ledge below (over both, clear of the ramps up from below)
function ironLegDropX(l, cx) {
  const K = IRONLEG, a = ironLegLedge(l), b = ironLegLedge(l - 1), x0 = Math.max(a[1], b[1]) + 16, x1 = Math.min(a[2], b[2]) - 16;
  const no = K.plates.filter(q => q[1] === l - 1).map(q => [q[0] - 20, q[0] + K.plateDX + 20])
    .concat(K.pistons.filter(q => q.from === l).map(q => [q.a - 16, q.b + q.w + 16]), K.blocks.filter(q => q.from === l).map(q => [q.rest - 16, q.end + q.w + 16]));
  let best = (x0 + x1) / 2, bd = 1e9;
  for (let x = x0; x <= x1; x += 4) if (!no.some(([r0, r1]) => x > r0 && x < r1) && Math.abs(x - cx) < bd) { best = x; bd = Math.abs(x - cx); }
  return best;
}
function ironLegWaitX(ph, l) {
  const [, x0, x1] = ironLegLedge(l);
  return clamp((x0 + x1) / 2, x0 + 30, x1 - 30);
}
function ironLegHints(st) {
  const ph = st.ph, P = ironLegPlan(st);
  for (const id of [0, 1]) {
    const s = P[id] && P[id].say;
    if (s && ph['said' + id] !== s) { ph['said' + id] = s; ironHint(st, id, s, { life: 3.2, cpu: '' }); }
    if (!s) ph['said' + id] = null;
  }
}

/* --- drawing --- */
// the sky and Tumbleweed Gulch far below (unturned)
function ironLegDrawSky(st) {
  const ph = st.ph, cy = st.cam.y, K = IRONLEG;
  SKETCH.paper(ctx, 'sand');
  // height: a cool sky deepening upward, the gulch sinking away below as they climb (slow parallax)
  const up = Math.max(0, Math.min(1, (-cy - 380) / 2100));
  const gr = ctx.createLinearGradient(0, 0, 0, 540);
  gr.addColorStop(0, `rgba(120,142,160,${0.34 + up * 0.18})`); gr.addColorStop(0.55, 'rgba(160,176,182,0.08)'); gr.addColorStop(1, 'rgba(160,176,182,0)');
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = gr; ctx.fillRect(0, 0, 960, 540); ctx.restore();
  const sink = (-cy - 380) * 0.16;
  SKETCH.blit(ctx, IRON_ART.gulch(0), 0, 40 + sink * 0.5);
  SKETCH.blit(ctx, IRON_ART.gulch(1), 0, 120 + sink);
  SKETCH.glow(ctx, 800, 110, 560, '255,210,140', 0.32);
  SKETCH.glow(ctx, 800, 110, 120, '255,240,200', 0.6);
  // the other leg, far behind in the haze: planted while this one swings (it leans the other way a little)
  const hip = 1500 - (-cy) * 0.35;
  SKETCH.blit(ctx, IRON_ART.farLeg(), 130, hip - 1600 + Math.min(0, sink * 0.3), { rot: -ph.theta * 0.35, sx: 1.25, sy: 1.25, alpha: 0.55 });
  // cloud banks drifting past at our height, the near one quicker
  for (const [k, sp, py, a] of [[0, 9, 0.45, 0.5], [1, 16, 0.75, 0.62]]) {
    const x = -((G.clock * sp) % 980), y = ((-cy * py + k * 260) % 900) - 200;
    for (const xx of [x, x + 980]) SKETCH.blit(ctx, IRON_ART.cloudBank(k), xx, y, { alpha: a });
  }
  // birds wheeling far below
  const d = SKETCH.live(ctx, 4130, SKETCH.boil());
  SKETCH.birds(d, 760, 470 + sink * 0.4, 5, G.clock, { s: 3.5, spread: 140, spreadY: 26, w: 0.9, alpha: 0.6, seed: 9 });
  void K;
}
function ironLegDrawBack(st) {
  const ph = st.ph, K = IRONLEG, d = SKETCH.live(ctx, 4140, SKETCH.boil());
  // the leg: five chunks of riveted shell, each 540 tall (chunk k covers y from 160 - 540 (k + 1) to 160 - 540 k)
  // an opaque underpaint first (the sheets are glazes: nothing behind the leg may show through it)
  { const ky = ironLegLedge(K.knee.ledge)[0] - 80; ctx.save(); ctx.fillStyle = '#eadcbf';
    { const a = Math.max(-2540, st.cam.y - 500), b = Math.min(160, st.cam.y + 900); if (b > a) ctx.fillRect(-K.halfW, a, 2 * K.halfW, b - a); } ctx.fillRect(-K.halfW - 16, 38, 2 * K.halfW + 32, 86);
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 320, ky, 94, 118, 0, 0, Math.PI * 2); ctx.fill(); }
    { const gy = ironLegLedge(K.ring.ledge)[0] - 40; ctx.beginPath(); ctx.arc(236, gy, 168, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); }
  for (let k = 0; k < 5; k++) { const y0 = 160 - 540 * (k + 1); if (y0 > st.cam.y + 900 || y0 + 540 < st.cam.y - 400) continue; SKETCH.blit(ctx, IRON_ART.legChunk(k), -K.halfW - 40, y0); }
  // the cylinder: a cool shade pooled down the left, a warm lit band on the right, a cool rim at the far right
  { const y0 = st.cam.y - 400, y1 = st.cam.y + 940, x0 = -K.halfW, x1 = K.halfW;
    const g1 = ctx.createLinearGradient(x0, 0, x1, 0);
    g1.addColorStop(0, 'rgba(58,66,104,0.55)'); g1.addColorStop(0.25, 'rgba(70,80,116,0.22)'); g1.addColorStop(0.55, 'rgba(70,80,116,0)'); g1.addColorStop(0.92, 'rgba(70,80,116,0)'); g1.addColorStop(1, 'rgba(58,66,104,0.32)');
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(176,128,102,0.32)'; ctx.fillRect(x0, Math.max(y0, -2540), x1 - x0, Math.min(y1, 160) - Math.max(y0, -2540)); ctx.fillStyle = g1; ctx.fillRect(x0, Math.max(y0, -2540), x1 - x0, Math.min(y1, 160) - Math.max(y0, -2540));
    const g2 = ctx.createLinearGradient(x0, 0, x1, 0);
    g2.addColorStop(0.6, 'rgba(255,214,150,0)'); g2.addColorStop(0.78, 'rgba(255,214,150,0.24)'); g2.addColorStop(0.9, 'rgba(255,214,150,0)');
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g2; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.restore(); }
  // the ankle cuff at the bottom, the knee drum across the middle (behind the catwalks)
  SKETCH.blit(ctx, IRON_ART.legCuff(), 0, 20);
  SKETCH.blit(ctx, IRON_ART.kneeDrum(), 0, ironLegLedge(K.knee.ledge)[0] - 80);
  // the catwalks' shadows on the shell (the sun is low at the right: they fall down and left)
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  for (const [y, x0, x1] of K.ledges) { if (y < st.cam.y - 300 || y > st.cam.y + 800) continue; const g3 = ctx.createLinearGradient(0, y + 14, 0, y + 64); g3.addColorStop(0, 'rgba(60,62,96,0.42)'); g3.addColorStop(1, 'rgba(60,62,96,0)'); ctx.fillStyle = g3; ctx.beginPath(); ctx.moveTo(x0 + 4, y + 14); ctx.lineTo(x1, y + 14); ctx.lineTo(x1 - 22, y + 64); ctx.lineTo(x0 - 18, y + 64); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // the ankle cuff below the first ledge, the hip gear at the top
  const R = K.ring, ry = ironLegLedge(R.ledge)[0];
  SKETCH.blit(ctx, IRON_ART.hipGear(), 236, ry - 40, { rot: (ph.ring.t >= 0 ? ph.ring.t * 0.9 : 0) + Math.sin(G.clock * 0.3) * 0.01 });
  // the plates (ramps): drawn shiny when they can be run
  for (const pl of ph.plateList) {
    const now = ironLegSlopeNow(ph, { kind: 'plate', a: K.plateA }) <= K.maxA;
    SKETCH.blit(ctx, IRON_ART.legPlate(pl.i % 2), pl.x0, pl.yb);
    if (now) { ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.clock * 10); d.stroke([[pl.x0 + 8, pl.yb - 12], [pl.x1 - 6, pl.yt - 12]], { w: 2.2, col: SKETCH.PAL.core, sh: 0, p: [0.2, 1, 0.2] }); ctx.restore(); }
    const v = ph.vents.find(q => q.plate === pl.i);
    if (v) ironLegDrawVent(st, pl, v, d);
  }
  // pistons (their shafts go down behind the catwalks), ledges (catwalks), blocks, the knee gate and its lever
  for (const q of ph.pistons) {
    const y = ironLegLedge(q.from)[0];
    for (const [x, h] of [[q.a, q.ha], [q.b, q.hb]]) SKETCH.blit(ctx, IRON_ART.piston(), x, y - h);
    IRON_ART.helpers.ironPipe(d, [[q.a + q.w / 2, y + 8], [q.a + q.w / 2, y + 26], [q.b + q.w / 2, y + 26], [q.b + q.w / 2, y + 8]], 4, {});
    const ly = ironLegLedge(q.from + 1)[0];
    SKETCH.blit(ctx, IRON_ART.legLever(), q.lever, ly, { rot: q.locked ? 0.7 : -0.5 });
  }
  K.ledges.forEach(([y, x0, x1], i) => SKETCH.blit(ctx, IRON_ART.legLedge(x1 - x0, i), x0, y));
  for (const b of ph.blocks) {
    const y = ironLegLedge(b.from)[0];
    d.stroke([[b.rest - 4, y - 3], [b.end + b.w + 4, y - 3]], { w: 2, sh: 0 }); d.stroke([[b.rest - 4, y - 7], [b.end + b.w + 4, y - 7]], { w: 1, sh: 0, alpha: 0.6 });
    SKETCH.blit(ctx, IRON_ART.ballast(), b.x, y);
    if (b.braced >= 0) d.word('BRACED', b.x + b.w / 2, y - b.h - 12, 11, { align: 'center', fill: SKETCH.PAL.core });
  }
  const G0 = K.knee, gy = ironLegLedge(G0.ledge)[0];
  SKETCH.blit(ctx, IRON_ART.kneeGate(), G0.gate + G0.gateW / 2, gy - G0.gateH * ph.gate.open * 0.92, {});
  SKETCH.blit(ctx, IRON_ART.legLever(), G0.lever, gy, { rot: ph.gate.held >= 0 || ph.gate.done ? 0.7 : -0.5 });
  // crows
  for (const c of ph.crows) {
    const y = ironLegLedge(c.l)[0];
    if (c.away > 0 && c.flap <= 0) continue;
    if (c.flap > 0) SKETCH.blit(ctx, IRON_ART.crow('flap'), c.x - (0.8 - c.flap) * 120, y - 20 - (0.8 - c.flap) * 140, { sx: Math.sin(G.clock * 30) > 0 ? 1 : -1 });
    else SKETCH.blit(ctx, IRON_ART.crow('sit'), c.x, y, { sx: Math.sin(c.t * 0.4 + c.i) > 0.8 ? -1 : 1 });
  }
}
function ironLegDrawVent(st, pl, v, d) {
  const mx = (pl.x0 + pl.x1) / 2, my = (pl.yb + pl.yt) / 2 + 10;
  SKETCH.blit(ctx, IRON_ART.legVent(), mx, my, { rot: -IRONLEG.plateA });
  if (v.state === 'tell') { const k = v.t / IRONLEG.vent.tell; for (let i = 0; i < 3; i++) d.stroke([[mx - 8 + i * 8, my - 14], [mx - 6 + i * 8 + Math.sin(G.clock * 20 + i) * 3, my - 24 - k * 10]], { w: 1, sh: 0, alpha: 0.7, curve: true }); d.word('hsss', mx + 34, my - 30, 11, { fill: SKETCH.PAL.ochre }); }
  if (v.state === 'puff') { const k = v.t / IRONLEG.vent.puff; for (let i = 0; i < 4; i++) d.cloud(mx - 20 - i * 18 * (0.5 + k), my - 20 - i * 10 - k * 30, 12 + i * 4 + k * 10, { fill: '#efe8d8', puffs: 6, w: 1.2, curls: 1 }); }
}
function ironLegDraw(st) { void st; }
function ironLegDrawHero(st, p) {
  // heroes stand upright on screen (the page tilts, gravity does not): turn them back about their feet
  const a = st.ph.theta, fx = p.x + p.w / 2, fy = p.y + p.h, dark = ironDark(st);
  const o = Object.assign({ dark }, ironLegHeroO(st, p) || {});
  if (p.crouch && o.sy == null) { o.sy = p.sy * 0.72; o.sx = p.sx * 1.12; }
  ctx.save(); ctx.translate(fx, fy); ctx.rotate(-a); ctx.translate(-fx, -fy);
  if (st.safe[p.id] > 0 && ((G.clock * 10) | 0) % 2) ctx.globalAlpha *= 0.55;
  SKETCH.hero(ctx, p, o);
  ctx.restore();
  return true;
}
function ironLegHeroO(st, p) {
  if (p.sliding) return { sx: 1.08, sy: 0.9, mood: 'dizzy' };
  return null;
}

IRON_PHASES.leg = {
  setup(st, L) { ironLegSetup(st, L); },
  wait(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironCoast(st, dt, ph.solids); },
  step(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironLegStep(st, dt); },
  plan(st) { return ironLegPlan(st); },
  busy(st) { return st.ph.ring.t >= 0; },
  labels(st) { const P = ironLegPlan(st); return [0, 1].map(id => ({ brace: 'brace', hand: 'pull up', lever: 'lever', gate: 'hold' }[P[id] && P[id].why] || 'brace')); },
  hudText(st) {
    const ph = st.ph, L = Math.max(ph.ledgeOf[0], ph.ledgeOf[1]);
    return (ph.swinging ? 'Swing: run the ramps!' : 'Planted') + '  ·  Ledge ' + L + ' of ' + (IRONLEG.ledges.length - 1);
  },
  view(st) { return { cx: IRONLEG.view.cx, cy: IRONLEG.view.cy, a: st.ph.theta }; },
  drawSky(st) { ironLegDrawSky(st); },
  drawBack(st) { ironLegDrawBack(st); },
  draw(st) { ironLegDraw(st); },
  drawHero(st, p) { return ironLegDrawHero(st, p); },
  music() { return { song: 'ironmarch2', amb: 'ironHeights' }; },
  stat(st) { const s = st.stats.leg; return s && s.ramps ? { label: 'Ramps run', value: s.ramps } : null; },
  leave() { for (const k of ['iron:gulch', 'iron:legchunk', 'iron:legledge', 'iron:farleg', 'iron:cloudbank', 'iron:kneedrum', 'iron:legcuff']) SKETCH.forget(k); },
};

/* --- sounds --- */
Sfx.extra.ironlegSwingCreak = function () { this.tone(110, 1.3, 'sawtooth', 0.018, 70); this.noise(1.2, { f: 500, q: 6, vol: 0.012, a: 0.3 }); };
Sfx.extra.ironlegPlantClang = function () { this.tone(70, 0.5, 'sine', 0.09, 40); this.tone(420, 0.25, 'square', 0.025, 300); this.noise(0.4, { type: 'lowpass', f: 1200, to: 200, vol: 0.05 }); };
Sfx.extra.ironlegBlockSlide = function () { this.noise(0.8, { f: 700, q: 3, vol: 0.02, a: 0.1 }); this.tone(90, 0.7, 'sawtooth', 0.012, 70); };
Sfx.extra.ironlegBlockBrace = function () { this.tone(160, 0.12, 'square', 0.03, 120); this.noise(0.12, { f: 900, vol: 0.02 }); };
Sfx.extra.ironlegPistonHiss = function () { this.noise(0.5, { type: 'highpass', f: 2500, to: 1500, vol: 0.025, a: 0.05 }); };
Sfx.extra.ironlegLeverClunk = function () { this.tone(140, 0.12, 'square', 0.05, 90); this.tone(90, 0.18, 'sine', 0.05, null, 0.06); };
Sfx.extra.ironlegKneeOpen = function () { this.tone(80, 0.5, 'sawtooth', 0.02, 130); this.noise(0.4, { f: 400, q: 4, vol: 0.015 }); };
Sfx.extra.ironlegKneeShut = function () { this.tone(130, 0.2, 'sawtooth', 0.025, 60); this.noise(0.15, { type: 'lowpass', f: 600, vol: 0.04, delay: 0.15 }); };
Sfx.extra.ironlegVentPuff = function () { this.noise(0.45, { type: 'highpass', f: 1800, to: 900, vol: 0.03, a: 0.04 }); };
Sfx.extra.ironlegCrowFlap = function () { for (let k = 0; k < 4; k++) this.noise(0.06, { f: 900, q: 2, vol: 0.02, delay: k * 0.08 }); };
Sfx.extra.ironlegCrowCaw = function () { this.tone(520, 0.18, 'sawtooth', 0.025, 380); this.tone(500, 0.16, 'sawtooth', 0.02, 360, 0.22); };
Sfx.extra.ironlegGearCarry = function () { for (let k = 0; k < 12; k++) this.tone(200 + (k % 3) * 40, 0.05, 'square', 0.015, null, k * 0.18); };

ironRoom('leg', {
  act: { label: 'brace', labels: ['brace', 'brace'] },
  tip: IRON_PARTS.leg.tip,
});
