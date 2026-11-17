/* Pip & Bo - Level 21-1 Hot Air Balloon Climb (team, World 21 Sky Kingdom). */
'use strict';

/* ===== 21-1 Hot Air Balloon Climb (mode 'balloon', World 21 "Sky Kingdom", team) =====
   Pip and Bo ride together in the basket of one hot air balloon (orange and blue stripes), seen from the side. The
   camera scrolls UP as they rise through the sky to the Cloud Castle. The mode owns the tick, the camera, the whole
   picture and the HUD (def.ownStep + def.ownHUD + def.noFalls); the engine grid is empty apart from the two spawns.
   Two jobs, and they swap every climb (room def `burner`: who burns this climb; the other one steers):
   THE BURNER holds the action (burn), or ▲ (W / ↑, controller A, touch ▲), to fire the burner: a big flame and a whoosh
   that heat the balloon so it rises. Letting go, it cools and slowly sinks. The heat gauge (bottom middle) shows how
   hot it is. Keeping it in the red too long makes the burner sputter out for a moment ("Too hot! Let it cool"), so the
   burner pulses it instead of just holding. The burner's ◀ ▶ do nothing for steering (they only lean in the basket).
   THE STEERER holds ◀ ▶ to pull the left or right vent rope, which drifts the balloon sideways. The action (steady) or
   ▼ holds both ropes, so a sideways drift stops quickly (it's how you line up for a gap or the dock).
   So nobody can do it alone: with nobody burning the balloon never leaves the ground, and with nobody steering it rises
   straight up into the underside of the first floating island (every climb's first island row has its gap away from
   the start) and bonks there.
   Things in the sky:
     floating islands  rows of grassy islands with one or two gaps to thread (a gold ▲ under each gap); bumping into
                       one is a soft "Bonk!". The basket can rest on top of an island.
     storm clouds      grumpy-looking grey clouds (harmless): touching one is a little "Bzzt!" zap-bump that drops the
                       balloon a bit and cools it. Some drift side to side.
     birds             flocks fly across the sky and back; a touch is a "Boing!" that pushes the balloon away and down.
                       The burner waits below them, or hurries through.
     wind              bands with drifting arrows push sideways: the steerer pulls against them.
     star coins        to collect (the score), and party balloons that tie on to the basket.
     checkpoint clouds a flag cloud: once you rise past it, it's where Gus comes back to.
   Each climb ends at a landing dock (a wooden dock on a cloud island, solid from below): rise up beside it, the steerer
   lines up over it, then the burner eases off with little puffs so the basket floats down softly. Too fast (over
   BALLOON.soft px/s) is a bounce ("Too fast! Little puffs!") and you try again.
   Soft fails only: if the balloon sinks off the bottom of the screen, Gus the friendly goose flies in with a rope and
   tows it back up to the last checkpoint. Nobody is ever hurt.
   Gold help (always announced in the gold message line): 3 bumps at one island row, island, storm cloud or flock make
   it gold: a gold breeze that nudges the balloon to the gap (islands), a cloud that cheers up and stops zapping, birds
   that fly around you. 2 tows from one checkpoint: a gold burner for the rest of the climb (lifts more, never
   overheats). 2 bounces on a dock: a gold cushion (any landing is soft). 18 s above the dock: a gold rope reels you in. 25 s with no progress under one row, island or cloud: that one turns gold too. A hint for whoever
   needs to act.
   4 climbs (roomWord 'Climb'): Meadow Liftoff, Windy Cliffs, Storm Clouds, Cloud Castle Dock.
   Room def: { title, burner: 0|1, look: 'meadow'|'cliffs'|'storm'|'castle', startX, bounds: [x0, x1], tip, act,
     course: [items] }. Items (h = altitude in px above the start, y up; x in screen px 0..960):
     ['gap', h, x, w]            a row of islands (bottom at h, 56 thick) with a gap centred at x, w wide
     ['gaps', h, [x, w], ...]    a row with several gaps
     ['isle', h, x, w]           one island to go around
     ['storm', h, x, r, a, per]  a storm cloud (radius r), drifting a px side to side every per s
     ['birds', h, dir, n, speed] a flock of n birds at altitude h, flying in from the left (dir 1) or right (-1)
     ['wind', h0, h1, dir, s]    a wind band pushing dir (1 right, -1 left) with s px/s²
     ['stars', h, x, n, dx, dh]  n star coins from (x, h), each dx, dh further on
     ['pb', h, x]                a party balloon
     ['cp', h, x, safeX]         a checkpoint cloud with its flag at x (Gus brings you back to safeX, h)
     ['sign', h, x, text]        a floating sign ({B} = the burner's name, {S} = the steerer's)
     ['dock', h, x, w]           the landing dock (its top at h): the end of the climb
   MODES.balloon.plan (st.plan, made once a step) is the one place that reads what's ahead: the prompts, the job
   panels and the computer brain all read it.
   Medal (MODES.balloon.medals, js/medals.js): Gold at <= 4:30 with <= 6 bumps (zaps + bird boings + bonks) and 50% of
   the star coins, Silver at <= 6:00 with <= 16 bumps, else Bronze.
   Every global is prefixed balloon / BALLOON (and Sfx.extra.balloon*); all state lives in G.mst. */
const BALLOON = {
  heatUp: 0.5, cool: 0.15, hot: 0.86, hotT: 1.1, sputT: 1.8, hover: 0.4, upK: 300, downK: 175, vyK: 1.4,
  steerA: 250, damp: 1.0, steadyDamp: 3.5, vxMax: 170, goldA: 380,
  bw: 32, bh: 24, mw: 22, mTop: 80, envY: 128, envR: 50, top: 178, feet: 19, stand: 13,
  soft: 62, landT: 2.7, finT: 4.2, ceil: 100,
  zapV: -110, zapHeat: 0.12, birdV: -70, birdPush: 130, inv: 1.2, bonkV: 30, bonkCool: 1.2,
  camBase: 110, camDown: 30, camMin: -100, towT: 3.6, look: 520, stuckT: 25,
  goldBumps: 3, goldTows: 2, goldBounces: 2, reelT: 18, birdGap: 44, birdR: 12, isleT: 56, dockT: 70,
};
const balloonLerp = (a, b, u) => a + (b - a) * u;
const balloonSmooth = u => u * u * (3 - 2 * u);
// the heat that holds a climb (or sink) speed of v px/s
const balloonHeatFor = v => (v >= 0 ? BALLOON.hover + v / BALLOON.upK : BALLOON.hover + v / BALLOON.downK);

/* ---------- the course: items -> islands, clouds, birds, wind, stars, the dock ---------- */
function balloonCompile(def, k) {
  const B = BALLOON, bu = def.burner || 0;
  const name = s => String(s).replace(/\{B\}/g, NAMES[bu]).replace(/\{S\}/g, NAMES[1 - bu]);
  const bounds = def.bounds || [58, 902];
  const c = { x0: bounds[0], x1: bounds[1], startX: def.startX || 300, ground: k === 0, look: def.look || 'meadow',
    solids: [], rows: [], storms: [], flocks: [], winds: [], stars: [], pbs: [], cps: [], signs: [], dock: null, hz: [] };
  if (!c.ground) c.solids.push({ x0: c.startX - 110, x1: c.startX + 110, b: -B.dockT, t: 0, kind: 'pad', hz: null });
  for (const it of def.course || []) {
    const kind = it[0];
    if (kind === 'gap' || kind === 'gaps') {
      const h = it[1], gaps = kind === 'gap' ? [[it[2], it[3]]] : it.slice(2);
      gaps.sort((a, b) => a[0] - b[0]);
      const row = { kind: 'row', b: h, t: h + B.isleT, gaps, bumps: 0, gold: false, last: -9, parts: [] };
      let x = -160;
      for (const [gx, gw] of gaps) { if (gx - gw / 2 - x > 8) row.parts.push({ x0: x, x1: gx - gw / 2 }); x = gx + gw / 2; }
      row.parts.push({ x0: x, x1: W + 160 });
      for (const p of row.parts) c.solids.push({ x0: p.x0, x1: p.x1, b: h, t: h + B.isleT, kind: 'isle', hz: row, edgeL: p.x0 > -100, edgeR: p.x1 < W + 100 });
      c.rows.push(row); c.hz.push(row);
    } else if (kind === 'isle') {
      const [, h, x, w] = it, hz = { kind: 'isle', b: h, t: h + B.isleT, x0: x - w / 2, x1: x + w / 2, bumps: 0, gold: false, last: -9 };
      c.solids.push({ x0: hz.x0, x1: hz.x1, b: h, t: hz.t, kind: 'isle', hz, edgeL: true, edgeR: true });
      c.hz.push(hz);
    } else if (kind === 'storm') {
      const [, h, x, r, a, per] = it;
      const s = { kind: 'storm', h, x0: x, x, r: r || 60, a: a || 0, per: per || 6, ph: (c.storms.length * 1.7) % 6.28, bumps: 0, gold: false, last: -9, zapT: 0 };
      c.storms.push(s); c.hz.push(s);
    } else if (kind === 'birds') {
      const [, h, dir, n, speed] = it;
      const f = { kind: 'birds', h, dir: dir || 1, n: n || 3, speed: speed || 120, state: 'wait', x: 0, t: 0, bumps: 0, gold: false, last: -9 };
      c.flocks.push(f); c.hz.push(f);
    } else if (kind === 'wind') {
      const [, h0, h1, dir, s] = it;
      c.winds.push({ h0, h1, dir: dir || 1, s: s || 140 });
    } else if (kind === 'stars') {
      const [, h, x, n, dx, dh] = it;
      for (let i = 0; i < (n || 1); i++) c.stars.push({ x: x + i * (dx || 0), h: h + i * (dh || 0), got: false, t: 0 });
    } else if (kind === 'pb') c.pbs.push({ h: it[1], x: it[2], got: false, col: c.pbs.length % 4 });
    else if (kind === 'cp') c.cps.push({ h: it[1], x: it[2], safe: it[3] != null ? it[3] : it[2], on: false, t: 0, tows: 0 });
    else if (kind === 'sign') c.signs.push({ h: it[1], x: it[2], text: name(it[3]) });
    else if (kind === 'dock') {
      const [, h, x, w] = it;
      c.dock = { h, x, w: w || 220, x0: x - (w || 220) / 2, x1: x + (w || 220) / 2, bounces: 0, gold: false };
      // (bumping the dock's island from below counts like an island: gold breeze around it)
      const hz = { kind: 'isle', b: h - B.dockT, t: h, x0: c.dock.x0, x1: c.dock.x1, bumps: 0, gold: false, last: -9 };
      c.solids.push({ x0: c.dock.x0, x1: c.dock.x1, b: h - B.dockT, t: h, kind: 'dock', hz });
      c.hz.push(hz);
    }
  }
  if (!c.dock) c.dock = { h: 3000, x: 480, w: 220, x0: 370, x1: 590, bounces: 0, gold: false };
  c.cps.sort((a, b) => a.h - b.h);
  return c;
}
// the wind pushing at the balloon's middle (px/s², + right)
function balloonWindAt(st, h) {
  const mid = (h == null ? st.b.h : h) + 90;
  let a = 0;
  for (const w of st.c.winds) if (mid > w.h0 && mid < w.h1) a += w.dir * w.s;
  return a;
}
// the sideways push besides the ropes: a gold breeze where there is one (it calms the wind there), else the wind
function balloonPushAt(st) { return st.goldPull ? st.goldPull.a : balloonWindAt(st); }
// a gold island row or island near the balloon: the gold breeze's pull toward the way through (px/s², + right)
function balloonGoldPull(st) {
  const b = st.b, B = BALLOON;
  for (const hz of st.c.hz) {
    if (!hz.gold || (hz.kind !== 'row' && hz.kind !== 'isle')) continue;
    if (b.h + B.top < hz.b - 420 || b.h > hz.t + 10) continue;
    const gx = balloonWayX(st, hz);
    // (a damped spring stronger than a rope pull, so a held or mashed rope can't drag you into the rock)
    return { x: gx, a: clamp((gx - b.x) * 5 - b.vx * 2.5, -B.goldA, B.goldA), hz };
  }
  return null;
}
// the middle of the way through a row (the nearest gap) or past an island (the nearer open side)
function balloonWayX(st, hz) {
  const b = st.b, c = st.c;
  if (hz.kind === 'row') {
    let best = hz.gaps[0][0];
    for (const [gx] of hz.gaps) if (Math.abs(gx - b.x) < Math.abs(best - b.x)) best = gx;
    return best;
  }
  const l = hz.x0 - 78, r = hz.x1 + 78, lOk = l > c.x0 + 4, rOk = r < c.x1 - 4;
  if (lOk && (!rOk || Math.abs(l - b.x) <= Math.abs(r - b.x))) return l;
  return rOk ? r : (hz.x0 + hz.x1) / 2;
}

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function balloonKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'burn') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'lr') return pad || touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
  if (what === 'steady') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'S' : '↓';
  return '';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const balloonQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// where each player stands in the basket: Pip on the left, Bo on the right (the job panels match)
const balloonSide = id => (id === 0 ? -1 : 1);

/* ---------- a climb (one room) ---------- */
function balloonRoom(st, L, k) {
  const def = L.def, B = BALLOON;
  st.k = k; st.burner = def.burner || 0; st.title = def.title || '';
  st.c = balloonCompile(def, k);
  st.stats.roomT[k] = null;
  const x = st.c.startX;
  st.b = { x, h: 0, vx: 0, vy: 0, heat: 0.3, hotT: 0, sput: 0, burning: false, inv: 0, lean: 0, pull: 0, steady: false,
    ground: true, flame: 0, burnSnd: 0, zapT: 0, bumpT: 0 };
  st.state = 'ride'; st.tow = null; st.land = null; st.goose = null;
  st.cam = B.camMin; st.t = 0;
  st.cp = { h: 0, safe: x, x, tows: 0, start: true, on: true };
  st.aboveT = 0; st.reel = null;
  st.planX = x; st.goldBurn = false; st.goldPull = null; st.stormWait = 0; st.stormHz = null;
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null; st.bestH = 0; st.stuckT = 0;
  st.segStart = G.time; st.inT = [-99, -99];
  st.plan = balloonPlan(st);
  balloonMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function balloonStep(st, dt) {
  if (!st.c) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act) st.inT[k] = G.time;
  }
  // (the action and jump are read as held buttons; fresh presses are dropped)
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  balloonActLabels(st);
  if (G.introT > 0) { st.b.burning = false; balloonCam(st, dt); balloonFx(st, dt); balloonMirror(st); return; }
  st.t += dt;
  balloonSky(st, dt);
  if (st.state === 'ride') balloonRide(st, dt);
  else if (st.state === 'tow') balloonTowStep(st, dt);
  else if (st.state === 'land') { if (balloonLandStep(st, dt)) return; }
  st.plan = balloonPlan(st);
  if (st.state === 'ride') st.planX = st.plan.tx;
  // (waiting a long time under one drifting cloud: the plan goes anyway, until the balloon is past that cloud)
  if (st.plan.storm) { if (st.stormHz !== st.plan.storm) { st.stormHz = st.plan.storm; st.stormWait = 0; } st.stormWait += dt; }
  else if (st.stormHz && st.b.h > st.stormHz.h + st.stormHz.r) { st.stormHz = null; st.stormWait = 0; }
  balloonCam(st, dt);
  balloonFx(st, dt);
  balloonMirror(st);
}
function balloonRide(st, dt) {
  const B = BALLOON, b = st.b, c = st.c, ps = G.players, bu = ps[st.burner], se = ps[1 - st.burner];
  const ib = bu.input, is = se.input;
  // the burner: hold to burn (a sputtering burner won't light)
  let burn = !!(ib.act || ib.jump || ib.up);
  if (b.sput > 0) {
    b.sput -= dt; burn = false;
    if (b.sput <= 0) { balloonPop(st, b.x, b.h + 60, 'Cooled down!', '#ffe7a8', 20); Sfx.play('balloonRelight'); }
  }
  if (burn && !b.burning) { Sfx.play('balloonBurn'); b.burnSnd = 0.32; }
  b.burning = burn;
  if (burn) {
    b.heat = Math.min(1, b.heat + B.heatUp * (st.goldBurn ? 1.2 : 1) * dt);
    st.stats.burn[st.burner] += dt;
    if ((b.burnSnd -= dt) <= 0) { b.burnSnd = 0.32; Sfx.play('balloonBurn'); }
  } else b.heat = Math.max(0, b.heat - B.cool * dt);
  if (b.heat > B.hot && !st.goldBurn) {
    b.hotT += dt;
    if (b.hotT > B.hotT) {
      b.sput = B.sputT; b.hotT = 0; st.stats.sputters++;
      balloonPop(st, b.x, b.h + 70, 'Too hot! Let it cool', '#ffb08a', 22); Sfx.play('balloonSputter');
      balloonHint(st, st.burner, 'Too hot! Let go now and then: little puffs', 3.2);
      for (let i = 0; i < 8; i++) balloonPart(st, b.x + (Math.random() - 0.5) * 16, b.h + 60, (Math.random() - 0.5) * 60, 40 + Math.random() * 50, 1.0, 'rgba(120,120,140,0.6)', 5 + Math.random() * 4, -20, 'smoke');
    }
  } else b.hotT = Math.max(0, b.hotT - dt * 2);
  // the burner leans (looks only)
  b.lean = approach(b.lean, (ib.right ? 1 : 0) - (ib.left ? 1 : 0), dt * 6);
  // the steerer: ◀ ▶ pull a vent rope, the action (or ▼) holds both (steady)
  const dir = (is.right ? 1 : 0) - (is.left ? 1 : 0), steady = !!(is.act || is.down);
  if (dir && Math.sign(b.pull) !== dir && Math.abs(b.pull) < 0.3) Sfx.play('balloonRope');
  b.pull = approach(b.pull, dir, dt * 8); b.steady = steady;
  if (dir || steady) st.stats.steer[1 - st.burner] += dt;
  // above the dock for a long time without landing: the dock crew throws a gold rope and reels the balloon in
  const d = c.dock;
  // (resting on the dock's very end counts too, so the rope also comes for a basket stuck on the edge)
  if ((b.h > d.h + 12 || (b.h > d.h - 3 && b.x > d.x0 - B.bw && b.x < d.x1 + B.bw)) && !st.reel) {
    st.aboveT += dt;
    if (st.aboveT > B.reelT) {
      st.reel = { t: 0 }; st.stats.helps++;
      balloonMsg(st, 'Gold rope! The dock crew reels you in', C.gold, 4); Sfx.play('balloonHelp');
    }
  }
  if (st.reel) {
    st.reel.t += dt; st.goldPull = null;
    const dx = d.x - b.x;
    b.vx = clamp(dx * 2, -90, 90);
    b.vy = Math.abs(dx) < 40 ? -40 : clamp((d.h + 50 - b.h) * 1.5, -40, 40);
  } else {
    st.goldPull = balloonGoldPull(st);
    const ax = dir * B.steerA + balloonPushAt(st);
    b.vx += ax * dt;
    b.vx *= Math.max(0, 1 - (B.damp + (steady ? B.steadyDamp : 0)) * dt);
    b.vx = clamp(b.vx, -B.vxMax, B.vxMax);
    // the lift: hot rises, cool sinks (it eases toward the speed the heat holds)
    let vT = (b.heat - B.hover) * (b.heat >= B.hover ? B.upK * (st.goldBurn ? 1.2 : 1) : B.downK);
    vT = Math.min(vT, (d.h + B.ceil - b.h) * 1.5);
    b.vy += (vT - b.vy) * Math.min(1, B.vyK * dt);
  }
  b.x += b.vx * dt; b.h += b.vy * dt;
  if (b.inv > 0) b.inv -= dt;
  balloonCollide(st);
  if (st.state !== 'ride') return;
  balloonHazards(st, dt);
  balloonPickups(st);
  // checkpoints
  for (const cp of c.cps) if (!cp.on && b.h > cp.h) {
    cp.on = true; st.cp = cp;
    Sfx.play('balloonCheck'); balloonPop(st, cp.x, cp.h + 70, 'Checkpoint!', '#ffe7a8', 22);
  }
  // sinking off the bottom of the screen: Gus the goose tows you back
  if (b.h + B.bh < st.cam - 24) { balloonStartTow(st); return; }
  balloonHelp(st, dt);
  balloonNudges(st, dt);
}

/* ---------- bumping into islands and docks (rectangles); landing ---------- */
function balloonCollide(st) {
  const B = BALLOON, b = st.b, c = st.c;
  b.ground = false;
  if (b.x < c.x0) { b.x = c.x0; if (b.vx < 0) b.vx = -b.vx * 0.3; }
  if (b.x > c.x1) { b.x = c.x1; if (b.vx > 0) b.vx = -b.vx * 0.3; }
  if (c.ground && b.h < 0) { b.h = 0; if (b.vy < 0) b.vy = 0; b.ground = true; }
  for (const r of c.solids) {
    if (r.x1 < b.x - 70 || r.x0 > b.x + 70 || r.t < b.h - 12 || r.b > b.h + B.top + 12) continue;
    balloonHitBox(st, r, b.x - B.bw, b.h, b.x + B.bw, b.h + B.bh, true);
    if (st.state !== 'ride') return;
    balloonHitBox(st, r, b.x - B.mw, b.h + B.bh, b.x + B.mw, b.h + B.mTop, false);
    balloonHitCircle(st, r, b.x, b.h + B.envY, B.envR);
  }
}
function balloonHitCircle(st, r, cx, cy, rad) {
  const b = st.b, qx = clamp(cx, r.x0, r.x1), qy = clamp(cy, r.b, r.t);
  const dx = cx - qx, dy = cy - qy, d = Math.hypot(dx, dy);
  if (d >= rad) return;
  let nx = 0, ny = 0, push = rad - d;
  if (d < 0.001) {
    // (the middle is inside: out through the nearest side)
    const o = [[cx - r.x0, -1, 0], [r.x1 - cx, 1, 0], [cy - r.b, 0, -1], [r.t - cy, 0, 1]].sort((a, z) => a[0] - z[0])[0];
    nx = o[1]; ny = o[2]; push = o[0] + rad;
  } else { nx = dx / d; ny = dy / d; }
  b.x += nx * push; b.h += ny * push;
  balloonImpact(st, r, nx, ny, false);
}
function balloonHitBox(st, r, x0, y0, x1, y1, basket) {
  const b = st.b, ox = Math.min(x1, r.x1) - Math.max(x0, r.x0), oy = Math.min(y1, r.t) - Math.max(y0, r.b);
  if (ox <= 0 || oy <= 0) return;
  if (oy < ox) {
    const ny = (y0 + y1) / 2 > (r.b + r.t) / 2 ? 1 : -1;
    b.h += ny * oy;
    if (ny > 0 && basket) b.ground = true;
    balloonImpact(st, r, 0, ny, basket && ny > 0);
  } else {
    const nx = (x0 + x1) / 2 > (r.x0 + r.x1) / 2 ? 1 : -1;
    b.x += nx * ox;
    balloonImpact(st, r, nx, 0, false);
  }
}
function balloonImpact(st, r, nx, ny, onTop) {
  const B = BALLOON, b = st.b, vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  if (onTop) {
    // the basket comes down on top of something: the dock is a landing, anything else a soft rest
    const fall = -vn;
    b.vy = 0;
    if (r.kind === 'dock' && st.state === 'ride') {
      const d = st.c.dock, on = b.x >= d.x0 && b.x <= d.x1;
      if (!on) return;
      if (fall > B.soft && !d.gold) {
        d.bounces++; st.stats.bounces++;
        b.vy = 70; b.h += 2;
        balloonPop(st, b.x, b.h + 40, 'Too fast! Little puffs!', '#ffd0a0', 24); Sfx.play('balloonBounce');
        balloonHint(st, st.burner, 'Ease off slowly: little puffs to float down gently', 3.4);
        if (d.bounces >= B.goldBounces) {
          d.gold = true; st.stats.helps++;
          balloonMsg(st, 'Gold cushion on the dock! Any landing is soft now', C.gold, 4); Sfx.play('balloonHelp');
        }
        return;
      }
      balloonStartLand(st);
    }
    return;
  }
  b.vx -= nx * vn; b.vy -= ny * vn;
  if (-vn > B.bonkV) {
    b.vx += nx * -vn * 0.35; b.vy += ny * -vn * 0.35;
    if (G.time - b.bumpT > 0.5) {
      b.bumpT = G.time;
      Sfx.play('balloonBonk');
      balloonPop(st, b.x, b.h + B.top + 6, 'Bonk!', '#ffffff', 20);
      for (let i = 0; i < 5; i++) balloonPart(st, b.x + (Math.random() - 0.5) * 60, b.h + B.top - 10, (Math.random() - 0.5) * 80, -30 - Math.random() * 40, 0.7, ['#ffffff', '#ffe7a8'][i % 2], 3, -60, 'star');
    }
    if (r.hz && G.time - r.hz.last > B.bonkCool) { r.hz.last = G.time; st.stats.bonks++; balloonBump(st, r.hz); }
  }
}
// a bump at a hazard: 3 at one hazard make it gold (announced)
function balloonBump(st, hz) {
  if (!hz) return;
  hz.bumps++;
  if (hz.gold || hz.bumps < BALLOON.goldBumps) return;
  hz.gold = true; st.stats.helps++;
  const words = { row: 'Gold breeze! It blows you to the gap', isle: 'Gold breeze! It blows you around the island',
    storm: 'Gold cloud! That one cheered up: no more zaps', birds: 'Gold birds! They fly around you now' }[hz.kind];
  balloonMsg(st, words, C.gold, 4.2); Sfx.play('balloonHelp');
}

/* ---------- storm clouds and birds (they move even while Gus tows) ---------- */
function balloonSky(st, dt) {
  const c = st.c;
  for (const s of c.storms) { s.x = s.x0 + s.a * Math.sin(st.t * Math.PI * 2 / s.per + s.ph); if (s.zapT > 0) s.zapT -= dt; }
  for (const f of c.flocks) balloonFlockStep(st, f, dt);
  for (const q of c.stars) if (q.got) q.t += dt;
}
function balloonFlockStep(st, f, dt) {
  const b = st.b, B = BALLOON;
  if (f.state === 'gone') return;
  if (f.state === 'wait') {
    if (b.h + B.top > f.h - 560) { f.state = 'fly'; f.x = f.dir > 0 ? -70 : W + 70; Sfx.play('balloonTweet'); }
    return;
  }
  balloonFlockAdvance(f, dt);
  // once the balloon is well past, the flock flies off for good
  if (f.state === 'rest' && b.h > f.h + 60) f.state = 'gone';
  if (f.state === 'rest' && f.t > 0.95 && f.t - dt <= 0.95) f.warn = 1.0;
  if (f.warn > 0) f.warn -= dt;
}
function balloonFlockAdvance(f, dt) {
  const B = BALLOON;
  if (f.state === 'fly') {
    f.x += f.dir * f.speed * dt;
    const tail = f.x - f.dir * (f.n - 1) * B.birdGap;
    if ((f.dir > 0 && tail > W + 70) || (f.dir < 0 && tail < -70)) { f.state = 'rest'; f.t = 1.4; }
  } else if (f.state === 'rest') {
    f.t -= dt;
    if (f.t <= 0) { f.dir = -f.dir; f.x = f.dir > 0 ? -70 : W + 70; f.state = 'fly'; }
  }
}
// bird i of a flock: where it is (its little wave up and down follows the room clock)
function balloonBird(st, f, i) {
  return { x: f.x - f.dir * i * BALLOON.birdGap, h: f.h + (i % 2 ? 14 : -6) + Math.sin(st.t * 3 + i * 1.3) * 5 };
}
// will a flock be over x (±70) at some time between t0 and t1 s from now? (a copy of it is flown ahead)
function balloonFlockHits(st, f, x, t0, t1) {
  if (f.state === 'gone' || f.gold) return false;
  const q = { state: f.state === 'wait' ? 'fly' : f.state, x: f.state === 'wait' ? (f.dir > 0 ? -70 : W + 70) : f.x, dir: f.dir, t: f.t, n: f.n, speed: f.speed };
  const span = (q.n - 1) * BALLOON.birdGap;
  for (let tt = 0; tt <= Math.min(5, t1) + 0.001; tt += 0.1) {
    if (tt >= t0 - 0.3 && q.state === 'fly') {
      const a = Math.min(q.x, q.x - q.dir * span), z = Math.max(q.x, q.x - q.dir * span);
      if (z > x - 76 && a < x + 76) return true;
    }
    balloonFlockAdvance(q, 0.1);
  }
  return false;
}
function balloonHazards(st, dt) {
  const B = BALLOON, b = st.b, c = st.c, ex = b.x, ey = b.h + B.envY;
  void dt;
  if (b.inv > 0) return;
  // storm clouds: a little zap-bump that drops the balloon a bit
  for (const s of c.storms) {
    if (s.gold) continue;
    const ry = s.r * 0.62;
    const e = ((ex - s.x) / (s.r + 42)) ** 2 + ((ey - s.h) / (ry + 42)) ** 2;
    const k = ((ex - s.x) / (s.r + 26)) ** 2 + ((b.h + 12 - s.h) / (ry + 12)) ** 2;
    if (e < 1 || k < 1) {
      b.vy = Math.min(b.vy, B.zapV); b.heat = Math.max(0, b.heat - B.zapHeat);
      b.vx += (b.x >= s.x ? 1 : -1) * 90; b.inv = B.inv; b.zapT = 0.7; s.zapT = 0.7;
      st.stats.zaps++;
      balloonPop(st, b.x, b.h + B.top + 10, 'Bzzt!', '#fff27a', 30); Sfx.play('balloonZap');
      G.shake = reduceMotion ? 0 : 0.12; rumble(0, 0.3, 0.4, 160); rumble(1, 0.3, 0.4, 160);
      for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; balloonPart(st, b.x + Math.cos(a) * 40, b.h + B.envY + Math.sin(a) * 40, Math.cos(a) * 120, Math.sin(a) * 120, 0.45, '#fff27a', 3, 0, 'star'); }
      balloonBump(st, s);
      return;
    }
  }
  // birds: a boing that pushes you away and down
  for (const f of c.flocks) {
    if (f.state !== 'fly') continue;
    for (let i = 0; i < f.n; i++) {
      const q = balloonBird(st, f, i), R = B.birdR;
      const hitE = (q.x - ex) ** 2 + (q.h - ey) ** 2 < (B.envR + R) ** 2;
      const hitK = q.x > b.x - B.bw - R && q.x < b.x + B.bw + R && q.h > b.h - R && q.h < b.h + B.mTop + R;
      if (!hitE && !hitK) continue;
      if (f.gold) { f.dodge = 0.8; continue; }
      b.vx += f.dir * B.birdPush; b.vy = Math.min(b.vy, B.birdV); b.inv = B.inv; b.zapT = 0.5;
      st.stats.birds++;
      balloonPop(st, q.x, q.h + 30, 'Boing! Tweet!', '#ffffff', 24); Sfx.play('balloonBoing');
      for (let j = 0; j < 4; j++) balloonPart(st, q.x, q.h, (Math.random() - 0.5) * 90, 40 + Math.random() * 60, 0.9, '#fff6c8', 4, -40, 'note');
      balloonBump(st, f);
      return;
    }
  }
}
function balloonPickups(st) {
  const B = BALLOON, b = st.b, c = st.c, ey = b.h + B.envY;
  const near = (x, h, r) => (x - b.x) ** 2 + (h - ey) ** 2 < (B.envR + r) ** 2 || (x > b.x - B.bw - r && x < b.x + B.bw + r && h > b.h - r && h < b.h + B.mTop + r);
  for (const q of c.stars) {
    if (q.got || !near(q.x, q.h, 14)) continue;
    q.got = true; st.stats.stars++;
    Sfx.play('balloonStar');
    for (let i = 0; i < 5; i++) { const a = Math.random() * Math.PI * 2; balloonPart(st, q.x, q.h, Math.cos(a) * 90, Math.sin(a) * 90, 0.5, C.gold, 3, 0, 'star'); }
  }
  for (const q of c.pbs) {
    if (q.got || !near(q.x, q.h, 18)) continue;
    q.got = true; st.stats.pbs++; st.tied.push(q.col);
    Sfx.play('balloonParty');
    balloonPop(st, q.x, q.h + 30, 'Party balloon!', '#ffd0f0', 22);
  }
}

/* ---------- Gus the goose tows a sunk balloon back to the last checkpoint ---------- */
function balloonStartTow(st) {
  const b = st.b, cp = st.cp;
  st.state = 'tow';
  st.tow = { t: 0, x0: b.x, h0: b.h, x1: cp.safe, h1: cp.h, side: b.x < W / 2 ? -1 : 1 };
  b.vx = 0; b.vy = 0; b.burning = false; b.sput = 0; b.hotT = 0;
  st.stats.tows++; cp.tows++;
  Sfx.play('balloonGoose');
  balloonMsg(st, 'Whoops! Here comes Gus the goose with a rope', '#ffe7a8', 3);
  if (cp.tows >= BALLOON.goldTows && !st.goldBurn) {
    st.goldBurn = true; st.stats.helps++;
    balloonMsg(st, 'Gold burner! It lifts more and never gets too hot this climb', C.gold, 4.5);
    Sfx.play('balloonHelp');
  }
}
function balloonTowStep(st, dt) {
  const B = BALLOON, b = st.b, tw = st.tow;
  tw.t += dt;
  // 0-1 s: Gus flies down to the basket; then he flies it back up along a gentle curve
  if (tw.t < 1.0) return;
  const u = balloonSmooth(clamp((tw.t - 1.0) / (B.towT - 1.4), 0, 1));
  b.x = balloonLerp(tw.x0, tw.x1, u);
  b.h = balloonLerp(tw.h0, tw.h1, u) + Math.sin(u * Math.PI) * 60;
  if (tw.t >= B.towT) {
    b.x = tw.x1; b.h = tw.h1; b.vx = 0; b.vy = 0; b.heat = Math.max(b.heat, 0.46); b.inv = 1.5;
    if (st.cp.start && !st.c.ground) b.h = 0;
    st.state = 'ride'; st.tow = null;
    st.goose = { t: 0, x: b.x, h: b.h + 20, side: tw.side };
    balloonPop(st, b.x, b.h + B.top + 20, 'Off you go! Honk!', '#ffe7a8', 22);
    st.bestH = Math.min(st.bestH, b.h); st.stuckT = 0;
  }
}

/* ---------- landing on the dock: next climb, or the Cloud Castle ---------- */
function balloonStartLand(st) {
  const b = st.b, d = st.c.dock;
  st.state = 'land'; st.land = { t: 0, last: G.level.def.roomIndex >= G.level.def.roomCount - 1 };
  b.vx = 0; b.vy = 0; b.burning = false; b.h = d.h;
  st.stats.landings++;
  st.stats.roomT[st.k] = G.time - st.segStart;
  balloonPop(st, b.x, b.h + 210, st.land.last ? 'Welcome to the Cloud Castle!' : 'Soft landing!', C.gold, st.land.last ? 30 : 28);
  Sfx.play(st.land.last ? 'balloonFanfare' : 'balloonLand');
  rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
  for (let i = 0; i < 26; i++) { const a = -Math.PI * Math.random(); balloonPart(st, b.x, b.h + 120, Math.cos(a) * 220, -Math.sin(a) * 220, 1.1, ['#ff8a3d', '#5b95ff', '#ffd36b', '#ffffff'][i % 4], 4, -300, 'conf'); }
}
function balloonLandStep(st, dt) {
  const B = BALLOON, b = st.b, ld = st.land, d = st.c.dock;
  ld.t += dt;
  b.h = d.h; b.heat = Math.max(0, b.heat - B.cool * dt);
  if (ld.last && ld.t > 1.2 && !ld.conf) {
    ld.conf = true; Sfx.play('balloonCheer');
    for (let i = 0; i < 60; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()); balloonPart(st, d.x, d.h + 160, Math.cos(a) * 320, -Math.sin(a) * 320, 1.8, ['#ff8a3d', '#5b95ff', '#ffd36b', '#8fe3b0', '#ffffff'][i % 5], 4, -280, 'conf'); }
  }
  if (ld.t >= (ld.last ? B.finT : B.landT)) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    if (!ld.cleared) {
      ld.cleared = true;
      st.stats.finishT = G.time;
      L.goal = { x: d.x, y: H - (d.h + 120 - st.cam) };
      levelClear();
      return true;
    }
  }
  return false;
}

/* ---------- gold help and the hints ---------- */
function balloonHelp(st, dt) {
  const b = st.b;
  if (b.h > st.bestH + 40) { st.bestH = b.h; st.stuckT = 0; } else st.stuckT += dt;
  if (st.stuckT > BALLOON.stuckT) {
    st.stuckT = 10;
    const pl = st.plan || balloonPlan(st), se = 1 - st.burner;
    // stuck under the same island row, island or grumpy cloud for a long time: it turns gold (announced)
    const hz = pl.block && pl.block.hz;
    if (hz && !hz.gold && (pl.burn === 'wait' || b.ground)) { hz.bumps = Math.max(hz.bumps, BALLOON.goldBumps - 1); balloonBump(st, hz); }
    if (pl.steer === 'left' || pl.steer === 'right') balloonHint(st, se, 'Steer ' + (pl.steer === 'left' ? '◀ ' : '') + 'that way' + (pl.steer === 'right' ? ' ▶' : '') + ': hold ' + balloonKey(se, pl.steer), 3.6);
    if (pl.burn === 'burn' || pl.burn === 'climb') balloonHint(st, st.burner, 'Hold ' + balloonKey(st.burner, 'burn') + ' to burn and go up!', 3.6);
    else if (pl.burn === 'land') balloonHint(st, st.burner, 'Let go, then little puffs ' + balloonKey(st.burner, 'burn') + ' to land', 3.6);
  }
  // the gold message repeats once when you reach a gold spot, so the help is never a surprise
  const gp = st.goldPull;
  if (gp && !gp.hz.said) { gp.hz.said = true; balloonMsg(st, 'Gold breeze here! It helps you to the way through', C.gold, 3.2); }
}
// gentle lessons, once each climb, when they first matter
function balloonNudges(st, dt) {
  void dt;
  const b = st.b, c = st.c, B = BALLOON, se = 1 - st.burner, top = b.h + B.top;
  if (c.winds.some(w => b.h + 90 > w.h0 - 120 && b.h + 90 < w.h1)) balloonHintOnce(st, 'wind', se, 'Wind! Pull ' + balloonKey(se, 'lr') + ' against the arrows');
  if (c.flocks.some(f => f.state === 'fly' && top > f.h - 300 && b.h < f.h)) balloonHintOnce(st, 'birds', st.burner, 'Birds! Wait below them, then burn up behind');
  if (top > c.dock.h - 260) {
    balloonHintOnce(st, 'dockS', se, 'The dock! Go up beside it, then line up over it');
    if (b.h > c.dock.h + 10) balloonHintOnce(st, 'dockB', st.burner, 'Over the dock: let go, then little puffs to land softly');
  }
}
function balloonHintOnce(st, key, id, text) {
  if (st.hinted[key]) return;
  st.hinted[key] = true;
  balloonHint(st, id, text, 3.4);
}

/* ---------- what the crew needs to do right now (the prompts, the panels and the computer read this) ----------
   tx: where the steerer should go; vy: the climb speed the burner should hold (px/s, + up);
   steer: 'left' | 'right' | 'steady' | 'ok'; burn: 'burn' | 'ease' | 'keep' | 'wait' | 'birds' | 'land' | 'hold' |
   'cool' | 'hot' | 'none'; why: 'gap' | 'storm' | 'birds' | 'dock' | null */
function balloonPlan(st) {
  const B = BALLOON, b = st.b, c = st.c, d = c.dock;
  const out = { tx: b.x, vy: 118, steer: 'ok', burn: 'climb', why: null, block: null };
  if (!b || st.state !== 'ride') { out.steer = 'none'; out.burn = 'none'; return out; }
  if (st.reel) { out.steer = 'ok'; out.burn = 'none'; out.why = 'dock'; out.vy = -40; out.tx = d.x; return out; }
  const top = b.h + B.top, over = b.x > d.x0 + 14 && b.x < d.x1 - 14, above = b.h > d.h + 12 || (over && b.h > d.h - 3), near = top > d.h - 520;
  const fall = dist => 1 + Math.max(0, dist) / 160;
  // --- where to steer: the cheapest x across the sky
  let best = null;
  for (let x = c.x0 + 4; x <= c.x1 - 4; x += 12) {
    let cost = Math.abs(x - b.x) * 0.25 + Math.abs(x - st.planX) * 0.12;
    for (const r of c.solids) {
      if (r.t < b.h - 4 || (r.kind === 'dock' && above)) continue;
      const dist = r.b - top;
      if (dist > B.look) continue;
      if (x + 74 > r.x0 && x - 74 < r.x1) cost += 2000 / fall(dist);
    }
    for (const s of c.storms) {
      if (s.gold) continue;
      const dist = s.h - s.r * 0.62 - top;
      if (dist > B.look || s.h + s.r * 0.62 + 30 < b.h) continue;
      const reach = s.r + 62;
      // (a drifting cloud: its whole sweep costs the same, so the steerer doesn't chase it about)
      // (and the far side of its sweep is a little better)
      if (s.a) { const off = Math.abs(x - s.x0); if (off < reach + Math.abs(s.a)) cost += (700 + (reach + Math.abs(s.a) - off) * 1.5) / fall(dist); }
      else if (Math.abs(x - s.x) < reach) cost += 900 / fall(dist);
    }
    for (const q of c.stars) if (!q.got && q.h > b.h + 10 && q.h < top + 380 && Math.abs(x - q.x) < 24) cost -= 120 / fall(q.h - top);
    for (const q of c.pbs) if (!q.got && q.h > b.h + 10 && q.h < top + 380 && Math.abs(x - q.x) < 26) cost -= 140 / fall(q.h - top);
    if (above) cost += Math.abs(x - d.x) * 3;
    if (!best || cost < best.cost) best = { x, cost };
  }
  out.tx = best ? best.x : b.x;
  // (a gold breeze knows the way: steer with it, not against it)
  if (st.goldPull && !above) out.tx = st.goldPull.x;
  // --- how fast to climb: wait under anything over us (or over where the drift takes us in the next second)
  let block = null;
  const xa = Math.min(b.x, b.x + b.vx * 0.9), xz = Math.max(b.x, b.x + b.vx * 0.9);
  for (const r of c.solids) {
    if (r.t < b.h || (r.kind === 'dock' && above)) continue;
    const dist = r.b - top, span = dist > 0 ? 60 : 50, a = dist > 0 ? xa : b.x, z = dist > 0 ? xz : b.x;
    if (z + span > r.x0 && a - span < r.x1 && dist > -40 && (!block || dist < block.dist)) block = { dist, why: r.kind === 'dock' ? 'dock' : 'gap', hz: r.hz };
  }
  for (const s of c.storms) {
    if (s.gold) continue;
    const ry = s.r * 0.62, dist = s.h - ry - top;
    if (dist <= -40 || dist >= 320 || (block && dist >= block.dist)) continue;
    let hit = false;
    if (!s.a) hit = xz > s.x - s.r - 58 && xa < s.x + s.r + 58;
    else if (Math.abs(b.x - s.x0) < s.r + 58 + Math.abs(s.a) && !(st.stormHz === s && st.stormWait > 7)) {
      // a drifting cloud: will it be over us while we pass its height? (after a long wait, go anyway)
      const slow = b.vy < 80 ? 0.7 : 0, v = Math.max(80, b.vy, 110);
      const t0 = slow + Math.max(0, dist) / v - 0.3, t1 = slow + (s.h + ry + 50 - b.h) / v + 0.2;
      for (let tt = Math.max(0, t0); tt <= t1 && !hit; tt += 0.1) {
        const cx = s.x0 + s.a * Math.sin((st.t + tt) * Math.PI * 2 / s.per + s.ph);
        if (Math.abs(b.x - cx) < s.r + 60) hit = true;
      }
    }
    if (hit) block = { dist, why: 'storm', hz: s };
  }
  if (block && block.dist < 320) { out.vy = clamp((block.dist - 55) * 0.75, -45, 118); out.burn = 'wait'; out.why = block.why; out.block = block; out.storm = block.why === 'storm' ? block.hz : null; }
  // birds: wait below a flock that will be over us while we pass its band; hurry through once in it
  for (const f of c.flocks) {
    if (f.state === 'gone' || f.gold) continue;
    const fb = f.h - 24, ft = f.h + 26;
    if (b.h > ft) continue;
    if (top < fb) {
      const gapB = fb - top;
      if (gapB > 280) continue;
      const v = Math.max(55, (Math.max(0, b.vy) + 120) / 2), tIn = gapB / v, tOut = (ft - b.h) / v + 0.3;
      if (balloonFlockHits(st, f, b.x, tIn, tOut)) { const vy = clamp((gapB - 50) * 0.75, -45, 118); if (vy < out.vy) { out.vy = vy; out.burn = 'birds'; out.why = 'birds'; } }
    } else if (!out.block) out.vy = Math.max(out.vy, 128);
  }
  // the dock: up beside it, over it, then float down gently
  if (above) {
    const aligned = Math.abs(b.x - d.x) < d.w / 2 - 36;
    if (aligned) { out.vy = b.h - d.h > 70 ? -45 : -24; out.burn = 'land'; }
    else { out.vy = clamp((d.h + 70 - b.h) * 1.2, -30, 80); out.burn = 'hold'; }
    out.why = 'dock';
  } else if (near && !out.block) out.why = out.why || 'dock';
  out.vy = Math.min(out.vy, (d.h + B.ceil - 10 - b.h) * 1.5);
  // the words for the prompts
  const dx = out.tx - b.x;
  out.steer = dx > 26 ? 'right' : dx < -26 ? 'left' : Math.abs(b.vx) > 45 ? 'steady' : 'ok';
  const hw = balloonHeatFor(out.vy);
  if (b.sput > 0) out.burn = 'cool';
  else if (b.heat > BALLOON.hot && !st.goldBurn) out.burn = 'hot';
  else if (out.burn === 'climb') out.burn = out.vy > b.vy + 20 && b.heat < hw + 0.05 ? 'burn' : out.vy < b.vy - 30 && b.heat > hw ? 'ease' : 'keep';
  return out;
}

/* ---------- small helpers ---------- */
function balloonHint(st, id, text, life) { if (balloonQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; }
function balloonMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function balloonPop(st, x, h, s, col, size) { st.pops.push({ x, h, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function balloonPart(st, x, h, vx, vh, life, col, size, grav, kind) {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ x, h, vx, vh, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
// the touch buttons and the top-bar legend name each player's own action this climb: burn or steady
let balloonLabelEls = null;
function balloonActLabels(st) {
  try {
    if (!balloonLabelEls || !balloonLabelEls.every(o => document.contains(o.el))) balloonLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const ds = box && (box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp);
      const id = ds !== undefined && ds !== null ? +ds : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of balloonLabelEls) {
      const want = o.id < 0 ? 'burn/steady' : o.id === st.burner ? 'burn' : 'steady';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function balloonCam(st, dt) {
  const B = BALLOON, b = st.b, d = st.c.dock;
  const want = b.h - B.camBase;
  if (st.state === 'tow') st.cam += (want - st.cam) * Math.min(1, dt * 3);
  else if (want > st.cam) st.cam += (want - st.cam) * Math.min(1, dt * 4);
  else st.cam = Math.max(want, st.cam - B.camDown * dt);
  // (the envelope's top never goes under the top pills)
  if (b.h + B.top - st.cam > H - 70) st.cam = b.h + B.top - (H - 70);
  st.cam = clamp(st.cam, B.camMin, d.h - 185);
}
function balloonFx(st, dt) {
  const b = st.b;
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vh -= q.grav * dt; q.x += q.vx * dt; q.h += q.vh * dt; q.r += dt * 5;
    if (q.kind === 'smoke' || q.kind === 'puff') { q.vx *= 1 - dt * 2; q.vh *= 1 - dt * 1.5; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.3);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  for (const cp of st.c.cps) if (cp.on) cp.t += dt;
  if (st.goose) { st.goose.t += dt; if (st.goose.t > 2) st.goose = null; }
  if (b.zapT > 0) b.zapT -= dt;
  b.flame = approach(b.flame, b.burning ? 1 : 0, dt * 9);
  // puffs out of the far side vent while the steerer pulls a rope
  if (st.state === 'ride' && Math.abs(b.pull) > 0.5 && Math.random() < dt * 10) {
    const s = -Math.sign(b.pull);
    balloonPart(st, b.x + s * 46, b.h + 130, s * 70, (Math.random() - 0.5) * 20, 0.6, 'rgba(255,255,255,0.8)', 4 + Math.random() * 3, 0, 'puff');
  }
  for (const f of st.c.flocks) if (f.dodge > 0) f.dodge -= dt;
}
// where a player's feet are (world px: x, altitude)
function balloonSpot(st, id) {
  const B = BALLOON, b = st.b;
  return { x: b.x + balloonSide(id) * B.stand + (id === st.burner ? b.lean * 3 : 0), h: b.h + B.feet };
}
// copy the spots into the engine players (screen px): name tags and bubbles read p.x / p.y
function balloonMirror(st) {
  for (const p of G.players) {
    const s = balloonSpot(st, p.id);
    p.x = s.x - PW / 2; p.y = H - (s.h - st.cam) - PH * 1.1;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = 0; p.stun = 0;
    p.face = p.id === 0 ? 1 : -1;
  }
}

MODES.balloon = {
  BALLOON,
  medals: { bronze: 'Land at the Cloud Castle', goals: [{ key: 'time', gold: 270, silver: 360 }, { key: 'bumps', gold: 6, silver: 16, word: 'bump' }, { key: 'stars', gold: 0.5, more: true, pct: true, word: 'the star coins' }] },
  medalValues() { const st = G.mst, s = st.stats; return s ? { bumps: s.zaps + s.birds + s.bonks, stars: s.stars / (st.starsAll || 1) } : {}; },
  plan: balloonPlan, heatFor: balloonHeatFor, windAt: balloonWindAt, pushAt: balloonPushAt, key: balloonKey, side: balloonSide,
  // where the computer's speech bubble goes: beside the envelope, on its own side
  bubblePos(p) {
    const st = G.mst;
    if (!st || !st.b) return null;
    return { x: clamp(st.b.x + balloonSide(p.id) * 112, 70, W - 70), y: H - (st.b.h + 150 - st.cam) };
  },
  setup(st, L) {
    st.stats = { stars: 0, pbs: 0, zaps: 0, birds: 0, bonks: 0, tows: 0, bounces: 0, sputters: 0, landings: 0, helps: 0,
      burn: [0, 0], steer: [0, 0], roomT: [], finishT: 0 };
    st.tied = [];
    // count every climb's stars and party balloons up front (the HUD shows "x of all")
    const def = LEVELS[G.levelIndex];
    const rooms = def.rooms || [def];
    st.starsAll = rooms.reduce((n, r) => n + (r.course || []).reduce((m, it) => m + (it[0] === 'stars' ? (it[3] || 1) : 0), 0), 0);
    st.pbsAll = rooms.reduce((n, r) => n + (r.course || []).filter(it => it[0] === 'pb').length, 0);
    balloonRoom(st, L, 0);
  },
  room(k, L) { balloonRoom(G.mst, L, k); },
  step(dt) { balloonStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn in the basket instead
  draw() {
    const st = G.mst;
    if (!st.c) return;
    balloonDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.c) return;
    balloonDrawFront(st);
  },
  hud() { const st = G.mst; if (st.c) balloonHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.starsAll || 1, frac = s.stars / all, bumps = s.zaps + s.birds + s.bonks;
    const out = [
      { label: 'Star coins', value: s.stars + ' of ' + st.starsAll },
      { label: 'Party balloons', value: s.pbs + ' of ' + st.pbsAll },
      { label: 'Bumps', value: String(bumps) },
    ];
    const words = frac >= 0.9 ? 'Every star in the sky! What a team!' : frac >= 0.6 ? 'A basket full of stars. Up, up and away!' : 'All the way up to the Cloud Castle together!';
    out.push(words + ' Zaps: ' + s.zaps + ', bird boings: ' + s.birds + ', bonks: ' + s.bonks + ', bounces: ' + s.bounces + ', Gus tows: ' + s.tows + '.');
    out.push('Burner time: ' + NAMES[0] + ' ' + Math.round(s.burn[0]) + ' s, ' + NAMES[1] + ' ' + Math.round(s.burn[1]) + ' s.' +
      (s.helps ? ' Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!' : ''));
    return out;
  },
};

/* ---------- drawing (world px: x across, altitude up; drawn with y = -altitude after a translate) ---------- */
const balloonSY = (st, h) => H - (h - st.cam);
function balloonDrawWorld(st) {
  balloonDrawSky(st);
  ctx.save(); ctx.translate(0, H + st.cam);
  balloonDrawFar(st);
  balloonDrawWinds(st);
  if (st.c.ground) balloonDrawMeadow(st);
  balloonDrawCliffs(st);
  balloonDrawCastle(st);
  for (const cp of st.c.cps) balloonDrawCheck(st, cp);
  for (const sg of st.c.signs) balloonDrawSign(st, sg);
  for (const r of st.c.solids) balloonDrawSolid(st, r);
  balloonDrawDock(st);
  for (const q of st.c.stars) balloonDrawStar(st, q);
  for (const q of st.c.pbs) if (!q.got) balloonParty(q.x, -q.h, q.col, 1, G.clock + q.x);
  ctx.restore();
}
function balloonDrawFront(st) {
  ctx.save(); ctx.translate(0, H + st.cam);
  balloonDrawBalloon(st);
  for (const s of st.c.storms) balloonDrawStorm(st, s);
  for (const f of st.c.flocks) balloonDrawFlock(st, f);
  balloonDrawGoose(st);
  balloonDrawReel(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1), y = -q.h;
    if (y + H + st.cam < -30 || y + H + st.cam > H + 30) continue;
    ctx.globalAlpha = q.kind === 'smoke' || q.kind === 'puff' ? a * 0.8 : a; ctx.fillStyle = q.col;
    if (q.kind === 'star') { balloonStarPath(q.x, y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'note') { ctx.font = '700 ' + Math.round(q.size * 4) + 'px "Atkinson Hyperlegible", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♪', q.x, y); }
    else if (q.kind === 'smoke' || q.kind === 'puff') { circle(q.x, y, q.size * (1.6 - 0.6 * a)); ctx.fill(); }
    else { circle(q.x, y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x, 130, W - 130), y = clamp(balloonSY(st, q.h) - q.t * 30, 96, H - 120);
    ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.25 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function balloonStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// the sky gets deeper as you climb; each climb has its own colours
const BALLOON_SKY = {
  meadow: [['#79c4f4', '#d8f0ff'], ['#4f9fe6', '#bfe3fb']],
  cliffs: [['#6fb6ee', '#e4f1ff'], ['#5a8fe0', '#d6e6ff']],
  storm: [['#8ea6d6', '#dfe6f4'], ['#7b90cf', '#f1e9f6']],
  castle: [['#f6a7c1', '#ffe9c4'], ['#c89be8', '#ffd7b0']],
};
function balloonDrawSky(st) {
  const look = st.c.look, sk = BALLOON_SKY[look] || BALLOON_SKY.meadow, u = clamp(st.b.h / st.c.dock.h, 0, 1);
  const mix = (a, b) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), ch = s => Math.round(balloonLerp((pa >> s) & 255, (pb >> s) & 255, u)); return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')'; };
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix(sk[0][0], sk[1][0])); g.addColorStop(1, mix(sk[0][1], sk[1][1]));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // the sun (sunbeams in the storm climb)
  const sx = look === 'castle' ? 210 : 790, sy = 110 + u * 20;
  if (look === 'storm') {
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff6d0';
    for (let i = 0; i < 6; i++) { const a = 1.7 + i * 0.22 + Math.sin(G.clock * 0.3 + i) * 0.02; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 900, sy + Math.sin(a) * 900); ctx.lineTo(sx + Math.cos(a + 0.08) * 900, sy + Math.sin(a + 0.08) * 900); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,246,200,0.35)'; circle(sx, sy, 80); ctx.fill();
  ctx.fillStyle = 'rgba(255,248,215,0.6)'; circle(sx, sy, 56); ctx.fill();
  if (look !== 'storm') {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(G.clock * 0.05); ctx.fillStyle = 'rgba(255,250,215,0.3)';
    ctx.beginPath(); for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.moveTo(-5, 46); ctx.lineTo(0, 90 + (i % 2) * 16); ctx.lineTo(5, 46); ctx.closePath(); } ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#fffbe6'; circle(sx, sy, 40); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(sx - 9, sy - 9, 22); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,140,0.7)'; ctx.lineWidth = 2; circle(sx, sy, 40); ctx.stroke();
  // far floating islands drift by very slowly (a hazy layer)
  if (look !== 'storm') {
    const off = st.cam * 0.06, span = 420;
    for (let k = Math.floor((off - 100) / span); k <= Math.floor((off + H + 100) / span); k++) {
      const hs = hash(k, 151), y = H - (k * span - off) - (hs % 160), x = (hs >> 4) % 900 + 30, w = 70 + (hs >> 9) % 60;
      ctx.fillStyle = 'rgba(150,140,210,0.24)'; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.quadraticCurveTo(x + w * 0.35, y + w * 0.2, x + w * 0.05, y + w * 0.42); ctx.quadraticCurveTo(x - w * 0.3, y + w * 0.22, x - w / 2, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(120,200,120,0.32)'; rr(x - w / 2, y - 5, w, 7, 3.5); ctx.fill();
      if (hs % 2) { ctx.fillStyle = 'rgba(90,170,100,0.3)'; circle(x - w * 0.2, y - 12, 8); ctx.fill(); }
    }
  }
  // far cloud banks drift up slowly as you climb
  for (const [par, sz, al] of [[0.12, 0.7, 0.45], [0.3, 1.0, 0.6]]) {
    const off = st.cam * par, span = 260;
    const k0 = Math.floor((off - 60) / span), k1 = Math.floor((off + H + 120) / span);
    for (let k = k0; k <= k1; k++) {
      const hsh = hash(k, 77 + Math.round(par * 100)), y = H - (k * span - off) - (hsh % 90);
      const x = ((hsh >> 4) % 1100) - 70 + Math.sin(G.clock * 0.05 + k) * 20;
      ctx.globalAlpha = al; balloonPuff(x, y, 60 * sz, look === 'storm' ? '#e8ecf6' : '#ffffff'); ctx.globalAlpha = 1;
    }
  }
}
// a soft cloud puff (3 bumps on a flat bottom) centred at x, y
// drawn once into a picture per size and colour, then copied (the shading costs nothing per frame)
function balloonPuff(x, y, s, col) {
  s = Math.round(s * 1) / 1; col = col;
  blitSprite(artSprite('balloonPuff' + s + col, 2.3 * s, 1.75 * s, (1.1 * s), (1.0 * s), c => balloonPuffPaint(c, 0, 0, s, col)), x, y);
}
function balloonPuffPaint(c, x, y, s, col) {
  // a soft blue-grey underside, the puff, then a bright top
  const shape = (dx, dy) => { c.beginPath(); c.arc(x - s * 0.55 + dx, y + dy, s * 0.45, 0, Math.PI * 2); c.arc(x + dx, y - s * 0.22 + dy, s * 0.6, 0, Math.PI * 2); c.arc(x + s * 0.6 + dx, y + dy, s * 0.42, 0, Math.PI * 2); c.roundRect(x - s * 0.95 + dx, y - s * 0.05 + dy, s * 1.95, s * 0.45, s * 0.22); };
  c.fillStyle = 'rgba(150,170,210,0.3)'; shape(s * 0.04, s * 0.08); c.fill();
  c.fillStyle = col; shape(0, 0); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.7)'; circleOn(c, x - s * 0.12, y - s * 0.45, s * 0.24); c.fill(); circleOn(c, x - s * 0.62, y - s * 0.12, s * 0.16); c.fill();
}
// near clouds float by (world layer, a little slower than the balloon)
function balloonDrawFar(st) {
  const span = 340, h0 = st.cam - 200, h1 = st.cam + H + 200;
  for (let k = Math.floor(h0 / span); k <= Math.floor(h1 / span); k++) {
    if (k < 1 && st.c.ground) continue;
    const hs = hash(k, 31 + st.k), h = k * span + (hs % 120), x = ((hs >> 5) % 1000) - 20;
    if (st.c.solids.some(r => h > r.b - 90 && h < r.t + 90 && x > r.x0 - 80 && x < r.x1 + 80)) continue;
    ctx.globalAlpha = 0.75; balloonPuff(x + Math.sin(G.clock * 0.1 + k) * 14, -h, 34 + hs % 26, '#ffffff'); ctx.globalAlpha = 1;
  }
}
// wind bands: drifting white arrows and streaks
function balloonDrawWinds(st) {
  for (const w of st.c.winds) {
    if (w.h1 < st.cam - 20 || w.h0 > st.cam + H + 20) continue;
    const g = ctx.createLinearGradient(0, -w.h1, 0, -w.h0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(225,245,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, -w.h1, W, w.h1 - w.h0);
    const n = Math.max(2, Math.round((w.h1 - w.h0) / 90));
    for (let i = 0; i < n; i++) {
      const h = w.h0 + (i + 0.5) * (w.h1 - w.h0) / n;
      for (let j = 0; j < 4; j++) {
        let x = ((G.clock * 140 * w.dir + j * 260 + i * 97) % 1040 + 1040) % 1040 - 40;
        const y = -h + Math.sin(G.clock * 2 + j + i) * 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - w.dir * 40, y); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - w.dir * 10, y - 9); ctx.lineTo(x, y); ctx.lineTo(x - w.dir * 10, y + 9); ctx.stroke();
        x -= w.dir * 70;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - w.dir * 50, y + 14); ctx.lineTo(x, y + 14); ctx.stroke();
      }
    }
  }
}
// the meadow at the start: rolling hills, a barn, trees, flowers and a fence
function balloonDrawMeadow(st) {
  if (st.cam > 260) return;
  ctx.fillStyle = '#a5dc8a';
  ctx.beginPath(); ctx.moveTo(0, 0);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, -70 - Math.sin(x * 0.008 + 1) * 30 - Math.sin(x * 0.021) * 12);
  ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
  // the barn
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, -69 - Math.sin(x * 0.008 + 1) * 30 - Math.sin(x * 0.021) * 12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(40,40,60,0.12)'; ctx.beginPath(); ctx.ellipse(770, 0, 70, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9584a'; ctx.fillRect(720, -78, 90, 78);
  ctx.strokeStyle = 'rgba(120,30,25,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let bx = 730; bx < 810; bx += 10) { ctx.moveTo(bx, -76); ctx.lineTo(bx, 0); } ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(796, -78, 14, 78);
  ctx.strokeStyle = '#8a2e24'; ctx.lineWidth = 2; ctx.strokeRect(720, -78, 90, 78);
  ctx.fillStyle = '#9e3a30'; ctx.beginPath(); ctx.moveTo(710, -76); ctx.lineTo(765, -118); ctx.lineTo(820, -76); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.strokeRect(745, -48, 40, 48);
  ctx.beginPath(); ctx.moveTo(745, -48); ctx.lineTo(785, 0); ctx.moveTo(785, -48); ctx.lineTo(745, 0); ctx.stroke();
  ctx.fillStyle = '#fff6d8'; ctx.fillRect(757, -72, 16, 14);
  // trees
  for (const [tx, s] of [[90, 1], [150, 0.8], [610, 1.1], [890, 0.9]]) {
    ctx.fillStyle = 'rgba(30,60,30,0.2)'; ctx.beginPath(); ctx.ellipse(tx + 4, 0, 24 * s, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(tx - 4 * s, -28 * s, 8 * s, 28 * s);
    ctx.fillStyle = '#3f9a4a'; circle(tx + 3 * s, -42 * s, 22 * s); ctx.fill(); circle(tx + 15 * s, -31 * s, 15 * s); ctx.fill();
    ctx.fillStyle = '#4fb05a'; circle(tx, -44 * s, 21 * s); ctx.fill(); circle(tx - 14 * s, -32 * s, 14 * s); ctx.fill(); circle(tx + 12 * s, -34 * s, 13 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; circle(tx - 6 * s, -52 * s, 8 * s); ctx.fill();
  }
  // the field
  ctx.fillStyle = '#7bcf62'; ctx.fillRect(0, -6, W, 120);
  ctx.fillStyle = '#62b84c'; ctx.fillRect(0, -6, W, 6);
  // a fence and flowers
  ctx.strokeStyle = '#f4e2b0'; ctx.lineWidth = 3;
  ctx.beginPath(); for (let x = 420; x < 700; x += 28) { ctx.moveTo(x, -6); ctx.lineTo(x, -26); } ctx.stroke();
  ctx.beginPath(); ctx.moveTo(420, -14); ctx.lineTo(672, -14); ctx.moveTo(420, -22); ctx.lineTo(672, -22); ctx.stroke();
  for (let i = 0; i < 26; i++) {
    const x = (hash(i, 5) % 940) + 10, y = 6 + hash(i, 9) % 40;
    ctx.fillStyle = ['#ffe36b', '#ff9ec0', '#ffffff', '#b9a3ff'][i % 4]; circle(x, y, 3.5); ctx.fill();
    ctx.fillStyle = '#ffd34a'; circle(x, y, 1.4); ctx.fill();
  }
  // the launch spot: a picnic blanket under the basket
  ctx.fillStyle = '#ff8a8a'; rr(st.c.startX - 52, -4, 104, 10, 4); ctx.fill();
  ctx.fillStyle = '#ffffff'; for (let x = st.c.startX - 46; x < st.c.startX + 50; x += 16) ctx.fillRect(x, -4, 8, 10);
}
// the windy cliffs: tall rock walls at both sides (with ledges and little pines)
// the cliff face texture (one tile in the wall's own colour, painted at the canvas scale, world-anchored with
// dkPatAlign): rock strata with a lit lip under each seam, blocky cut faces, hairline cracks, specks and a few
// embedded stones
let balloonCliffPat = null;
function balloonCliffTex() {
  if (balloonCliffPat && (typeof balloonCliffPat === 'string' || (balloonCliffPat.sc === canvas.width && balloonCliffPat.col === C.stone))) return dkPatAlign(balloonCliffPat);
  const S = Math.max(1, Math.min(3, canvas.width / W)), n = 180, cv = document.createElement('canvas'); cv.width = cv.height = Math.round(n * S);
  const c = cv.getContext('2d'); c.scale(cv.width / n, cv.width / n);
  c.fillStyle = C.stone; c.fillRect(0, 0, n, n);   // (the wall's own colour is baked in: one fill draws the whole face)
  const wv = (x, k) => Math.sin(x * Math.PI * 2 / n * 2 + k) * 3 + Math.sin(x * Math.PI * 2 / n * 5 + k * 2) * 1.2;
  // strata: each band a touch lighter or darker, a dark seam on top and a lit lip just under it
  for (let k = 0; k < 6; k++) {
    const y0 = k * 30;
    c.fillStyle = k % 3 === 0 ? 'rgba(255,255,255,0.07)' : k % 3 === 1 ? 'rgba(30,20,70,0.07)' : 'rgba(30,20,70,0.0)';
    c.beginPath(); c.moveTo(0, y0 + wv(0, k)); for (let x = 0; x <= n; x += 6) c.lineTo(x, y0 + wv(x, k)); c.lineTo(n, y0 + 30 + wv(n, k + 1)); for (let x = n; x >= 0; x -= 6) c.lineTo(x, y0 + 30 + wv(x, k + 1)); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(30,20,70,0.32)'; c.lineWidth = 1.4; c.beginPath(); for (let x = 0; x <= n; x += 6) { const y = y0 + wv(x, k); if (!x) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1; c.beginPath(); for (let x = 0; x <= n; x += 6) { const y = y0 + 1.6 + wv(x, k); if (!x) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    // joints across the band (blocks), each block lit on its left and shaded on its right
    for (let q = 0; q < 4; q++) {
      const jx = 8 + (hash(k, q + 300) % 160), y1 = y0 + wv(jx, k) + 1, y2 = y0 + 30 + wv(jx, k + 1) - 1;
      if (jx > n - 8) continue;
      c.strokeStyle = 'rgba(30,20,70,0.3)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(jx, y1); c.lineTo(jx + 2, (y1 + y2) / 2); c.lineTo(jx + 1, y2); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(jx + 1.5, y1 + 2, 1.2, y2 - y1 - 4);
      c.fillStyle = 'rgba(30,20,70,0.1)'; c.fillRect(jx - 6, y1 + 2, 6, y2 - y1 - 3);
    }
  }
  // hairline cracks
  c.strokeStyle = 'rgba(30,20,70,0.3)'; c.lineWidth = 1;
  for (let i = 0; i < 9; i++) { let x = 10 + hash(i, 310) % 160, y = 10 + hash(i, 311) % 150; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (hash(i, k + 312) % 9) - 4; y += 4 + hash(i, k + 316) % 5; c.lineTo(x, y); } c.stroke(); }
  // specks
  for (let i = 0; i < 360; i++) { const h = hash(i, 320); c.fillStyle = h % 3 ? 'rgba(30,20,70,0.22)' : 'rgba(255,255,255,0.3)'; c.fillRect(h % n, (h >>> 9) % n, h % 5 === 0 ? 2 : 1, 1); }
  // embedded stones, well inside the tile
  for (let i = 0; i < 6; i++) { const h = hash(i, 330), x = 14 + h % 152, y = 14 + (h >>> 8) % 152, r = 3 + h % 3; c.fillStyle = 'rgba(30,20,70,0.25)'; c.beginPath(); c.ellipse(x + 1, y + 1.5, r * 1.3, r, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(x - r * 0.4, y - r * 0.4, r * 0.5, r * 0.3, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(30,20,70,0.35)'; c.lineWidth = 0.9; c.beginPath(); c.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2); c.stroke(); }
  try { balloonCliffPat = ctx.createPattern(cv, 'repeat'); balloonCliffPat.sc = canvas.width; balloonCliffPat.col = C.stone; } catch (e) { balloonCliffPat = C.stone; }
  return dkPatAlign(balloonCliffPat);
}
// a rock ledge on a cliff (cached per side and tree): a wedge of rock with strata and a lit top, a grass cap with
// blades, and a small two-tone pine on it now and then
function balloonPaintLedge(c, side, tree) {
  const rock = C.stoneLight, edge = C.stoneEdge;
  const shape = () => { c.beginPath(); c.moveTo(0, 0); c.lineTo(40, 0); if (side < 0) { c.quadraticCurveTo(41, 8, 30, 12); c.lineTo(4, 18); c.lineTo(0, 18); } else { c.lineTo(40, 18); c.lineTo(36, 18); c.lineTo(10, 12); c.quadraticCurveTo(-1, 8, 0, 0); } c.closePath(); };
  c.fillStyle = 'rgba(20,20,60,0.18)'; c.save(); c.translate(side < 0 ? 2 : -2, 3); shape(); c.fill(); c.restore();
  c.fillStyle = rock; shape(); c.fill();
  c.save(); shape(); c.clip();
  const g = c.createLinearGradient(0, 0, 0, 18); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(20,20,60,0.35)'); c.fillStyle = g; c.fillRect(-2, 0, 44, 20);
  c.strokeStyle = 'rgba(30,20,70,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 8); c.lineTo(40, 7); c.moveTo(0, 13); c.lineTo(40, 12.5); c.moveTo(side < 0 ? 22 : 18, 8); c.lineTo(side < 0 ? 24 : 16, 13); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 8.8, 40, 0.8);
  c.restore();
  c.strokeStyle = edge; c.lineWidth = 1.4; shape(); c.stroke();
  // the grass cap
  c.fillStyle = '#4fae46'; rrOn(c, side < 0 ? -1 : 1, -3, 40, 6, 3); c.fill();
  c.fillStyle = '#7bd36b'; rrOn(c, side < 0 ? -1 : 1, -4, 40, 4.5, 2.5); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(side < 0 ? 2 : 4, -3.6, 33, 1);
  c.strokeStyle = '#3f9a40'; c.lineWidth = 1; c.beginPath(); for (let x = 4; x < 38; x += 5) { c.moveTo(x, -3); c.lineTo(x - 1, -6 - (x * 7 % 3)); } c.stroke();
  if (tree) {
    const px = side < 0 ? 22 : 18;
    c.fillStyle = 'rgba(30,60,30,0.25)'; c.beginPath(); c.ellipse(px + 1, -3, 9, 2, 0, 0, Math.PI * 2); c.fill();
    dkPlank(c, px - 1.5, -9, 3, 7, '#8a5a34', 41, { vert: true, r: 0.5, lw: 0.6, outline: '#5e3a1c' });
    for (let k = 0; k < 3; k++) {
      const ty = -8 - k * 7, tw = 11 - k * 2.6;
      c.fillStyle = '#2f7a46'; c.beginPath(); c.moveTo(px - tw, ty); c.lineTo(px, ty - 11); c.lineTo(px + tw, ty); c.closePath(); c.fill();
      c.fillStyle = '#4aa865'; c.beginPath(); c.moveTo(px - tw, ty); c.lineTo(px, ty - 11); c.lineTo(px + 1, ty - 1); c.closePath(); c.fill();
      c.strokeStyle = '#25603a'; c.lineWidth = 1; c.beginPath(); c.moveTo(px - tw, ty); c.lineTo(px, ty - 11); c.lineTo(px + tw, ty); c.closePath(); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(px - 2, -26, 1.2, 0, Math.PI * 2); c.fill();
  }
}
function balloonDrawCliffs(st) {
  if (st.c.look !== 'cliffs') return;
  const h0 = st.cam - 40, h1 = st.cam + H + 40, step = 60, t = G.clock;
  for (const side of [-1, 1]) {
    const edge = side < 0 ? st.c.x0 - 54 : st.c.x1 + 54, out = side < 0 ? -10 : W + 10;
    const ex = h => edge + side * (hash(h / step | 0, side + 9) % 22);
    const wall = () => {
      ctx.beginPath(); ctx.moveTo(out, -h0);
      for (let h = Math.floor(h0 / step) * step; h <= h1 + step; h += step) ctx.lineTo(ex(h), -h);
      ctx.lineTo(out, -(h1 + step)); ctx.closePath();
    };
    wall(); dkPatFill(balloonCliffTex());
    // light from the open sky on the inner face: a lit band on the left wall's face, a shaded band on the right's
    // (bands following the edge, filled as polygons: much cheaper than wide strokes)
    const band = (wd, col) => {
      ctx.fillStyle = col; ctx.beginPath();
      const hs0 = Math.floor(h0 / step) * step;
      for (let h = hs0; h <= h1 + step; h += step) ctx.lineTo(ex(h), -h);
      for (let h = Math.floor((h1 + step - hs0) / step) * step + hs0; h >= hs0; h -= step) ctx.lineTo(ex(h) + side * wd, -h);
      ctx.closePath(); ctx.fill();
    };
    band(30, side < 0 ? 'rgba(255,255,255,0.1)' : 'rgba(30,20,70,0.12)');
    band(10, side < 0 ? 'rgba(255,255,255,0.18)' : 'rgba(30,20,70,0.16)');
    ctx.strokeStyle = C.stoneEdge; ctx.lineWidth = 3; wall(); ctx.stroke();
    // moss tufts and hanging vines along the face (hashed per stretch of wall)
    for (let h = Math.floor(h0 / step) * step; h <= h1 + step; h += step) {
      const hs = hash(h / step | 0, side + 70); if (hs % 3) continue;
      const x = ex(h), y = -h, sw = reduceMotion ? 0 : Math.sin(t * 1.6 + h) * 1.5;
      ctx.fillStyle = '#5aa84c'; ctx.beginPath(); ctx.ellipse(x - side * 2, y, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7bd36b'; ctx.beginPath(); ctx.ellipse(x - side * 3, y - 1, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
      const l = 14 + hs % 22;
      ctx.strokeStyle = '#4f9a48'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - side * 4 + sw, y + l / 2, x - side * 1 + sw, y + l); ctx.stroke();
      ctx.fillStyle = '#6fbf5a'; for (let k = 1; k < 4; k++) { const d = k % 2 ? 1 : -1; ctx.beginPath(); ctx.ellipse(x - side * 2 + d * 3 + sw * k / 4, y + l * k / 4, 2.8, 1.5, d * 0.6, 0, Math.PI * 2); ctx.fill(); }
    }
    // ledges with a little pine tree
    for (let k = Math.floor(h0 / 260); k <= Math.floor(h1 / 260); k++) {
      const hs = hash(k, side + 40), h = k * 260 + hs % 80, ha = Math.floor(h / step) * step, u = (h - ha) / step;
      const wx = ex(ha) * (1 - u) + ex(ha + step) * u, x = wx - side * 7;   // tucked into the wall face
      dkPic('bcLedge2|' + side + '|' + (hs % 3 ? 1 : 0) + '|' + C.stoneLight, 48, 52, 4, 36, c => balloonPaintLedge(c, side, !!(hs % 3)), x - (side < 0 ? 0 : 40), -h);
    }
  }
}
// the Cloud Castle behind the last dock: painted once (stone courses, shaded faces, crenels, tiled cone roofs, framed
// lit windows, a planked gate with gold bands, a puffy shaded cloud bank); only the pennants move
function balloonCastleBlock(c, x0, y0, w, h, seed) {
  const stone = '#f7f2ff', mid = '#ebe4fb', lite = '#fdfbff', edge = '#b9a8e8';
  c.fillStyle = stone; c.fillRect(x0, y0, w, h);
  c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  for (let r = 0, yy = y0 + 2; yy < y0 + h; r++, yy += 14) {
    for (let xx = x0 - (r % 2) * 13; xx < x0 + w; xx += 26) {
      const hh = hash(seed + r, xx | 0);
      c.fillStyle = hh % 3 === 0 ? mid : hh % 3 === 1 ? lite : stone; c.fillRect(xx + 1, yy + 1, 24, 12);
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(xx + 1, yy + 1, 24, 1.2);
      if (hh % 13 === 0) { const cx = xx + 4 + hh % 12; c.strokeStyle = 'rgba(150,135,205,0.4)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(cx, yy + 1); c.lineTo(cx + 3, yy + 4); c.lineTo(cx + 8, yy + 5); c.lineTo(cx + 10, yy + 9); c.stroke(); }
      else if (hh % 11 === 0) { c.fillStyle = 'rgba(150,135,205,0.3)'; c.beginPath(); c.arc(xx + 6 + hh % 14, yy + 4 + hh % 5, 1.1, 0, Math.PI * 2); c.fill(); }
    }
  }
  c.strokeStyle = 'rgba(150,135,205,0.5)'; c.lineWidth = 1; c.beginPath();
  for (let r = 0, yy = y0 + 2; yy < y0 + h; r++, yy += 14) { c.moveTo(x0, yy + 0.5); c.lineTo(x0 + w, yy + 0.5); for (let xx = x0 - (r % 2) * 13; xx < x0 + w; xx += 26) { c.moveTo(xx + 0.5, yy); c.lineTo(xx + 0.5, yy + 14); } }
  c.stroke();
  const sw = Math.min(16, w * 0.28);
  const gs = c.createLinearGradient(x0 + w - sw, 0, x0 + w, 0); gs.addColorStop(0, 'rgba(120,105,190,0.05)'); gs.addColorStop(1, 'rgba(120,105,190,0.3)');
  c.fillStyle = gs; c.fillRect(x0 + w - sw, y0, sw, h);
  const g = c.createLinearGradient(0, y0 + h - 50, 0, y0 + h); g.addColorStop(0, 'rgba(160,150,220,0)'); g.addColorStop(1, 'rgba(160,150,220,0.45)');
  c.fillStyle = g; c.fillRect(x0, y0 + h - 50, w, 50);
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.95)'; c.fillRect(x0, y0, 2.2, h);
  c.strokeStyle = edge; c.lineWidth = 2; c.strokeRect(x0, y0, w, h);
}
function balloonCastleWindow(c, x, y, w, h, lit) {
  const edge = '#b9a8e8';
  c.fillStyle = '#e4ddf7'; rrOn(c, x - 3, y - 3, w + 6, h + 5, (w + 6) / 2); c.fill();
  c.strokeStyle = edge; c.lineWidth = 1.2; rrOn(c, x - 3, y - 3, w + 6, h + 5, (w + 6) / 2); c.stroke();
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, lit ? '#fff4c8' : '#bfe2f8'); g.addColorStop(1, lit ? '#ffc96b' : '#7ab4e0');
  c.fillStyle = g; rrOn(c, x, y, w, h, w / 2); c.fill();
  c.strokeStyle = '#ffffff'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x + w / 2, y + 1); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h * 0.5); c.lineTo(x + w, y + h * 0.5); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(x + 2, y + 3, 1.6, h * 0.3);
  c.fillStyle = '#e6e2fa'; c.fillRect(x - 4, y + h + 1, w + 8, 3); c.fillStyle = edge; c.fillRect(x - 4, y + h + 4, w + 8, 1);
}
function balloonCastleTower(c, x, w, h, roof) {
  const top = -h;
  balloonCastleBlock(c, x - w / 2, top, w, h, (x | 0) + 77);
  c.fillStyle = 'rgba(120,105,190,0.3)'; c.fillRect(x - w / 2, top, w, 5);
  // the tiled cone roof
  const ax = x, ay = top - w * 1.1, rp = () => { c.beginPath(); c.moveTo(x - w / 2 - 6, top); c.lineTo(ax, ay); c.lineTo(x + w / 2 + 6, top); c.closePath(); };
  const rl = dkT(roof, 0.25), rd = dkS(roof, 0.18), ol = dkS(roof, 0.4);
  c.fillStyle = roof; rp(); c.fill();
  c.save(); rp(); c.clip();
  const rows = Math.ceil(w * 1.1 / 7);
  for (let r = 0; r < rows; r++) {
    const yy = top - r * 7, half = (w / 2 + 6) * (1 - r * 7 / (w * 1.1));
    c.fillStyle = r % 2 ? roof : rl;
    for (let xx = ax - half - 5 + (r % 2) * 4; xx < ax + half + 5; xx += 8) { c.beginPath(); c.arc(xx + 4, yy, 4.2, 0, Math.PI); c.fill(); }
    c.strokeStyle = 'rgba(40,20,60,0.22)'; c.lineWidth = 1; c.beginPath(); c.moveTo(ax - half - 5, yy); c.lineTo(ax + half + 5, yy); c.stroke();
  }
  c.fillStyle = 'rgba(40,20,60,0.2)'; c.beginPath(); c.moveTo(ax, ay); c.lineTo(x + w / 2 + 6, top); c.lineTo(ax + 3, top); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - w / 2 - 4, top - 1); c.lineTo(ax - 1, ay + 2); c.stroke();
  c.strokeStyle = ol; c.lineWidth = 1.8; rp(); c.stroke();
  c.fillStyle = rd; c.fillRect(x - w / 2 - 6, top - 1, w + 12, 3);
  c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(ax, ay, 3.2, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#c99a2e'; c.lineWidth = 1; c.stroke();
  // windows (the old warm window, now framed) and slits lower down
  balloonCastleWindow(c, x - 7, -h * 0.7 - 2, 14, 20, true);
  if (h > 220) balloonCastleWindow(c, x - 7, -h * 0.42, 14, 20, false);
  c.fillStyle = '#7a6aa8'; rrOn(c, x - 2, -h * 0.25, 4, 14, 2); c.fill();
}
function balloonPaintCastle(c) {
  // the cloud bank behind and under it (shaded puffs)
  const puffs = [];
  for (let i = -5; i <= 5; i++) puffs.push([i * 80, 10 - (hash(i, 3) % 20)]);
  const bank = (dy, r) => { c.beginPath(); for (const [px, py] of puffs) { c.moveTo(px + r, py + dy); c.arc(px, py + dy, r, 0, Math.PI * 2); } };
  c.strokeStyle = '#c9c4ec'; c.lineWidth = 3; bank(0, 54); c.stroke();
  c.fillStyle = '#e2def8'; bank(0, 54); c.fill();
  c.fillStyle = '#ffffff'; bank(-6, 50); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.9)'; for (const [px, py] of puffs) { c.beginPath(); c.ellipse(px - 16, py - 34, 16, 7, -0.3, 0, Math.PI * 2); c.fill(); }
  // towers
  balloonCastleTower(c, -230, 50, 200, '#ff8fb8'); balloonCastleTower(c, 230, 50, 200, '#7fb2ff');
  balloonCastleTower(c, -120, 64, 260, '#b28dff'); balloonCastleTower(c, 120, 64, 260, '#ffb86b');
  balloonCastleTower(c, 0, 90, 320, '#ff8a3d');
  // the wall with crenels, a string course and slits
  balloonCastleBlock(c, -220, -120, 440, 120, 5);
  for (let x = -220; x < 220; x += 40) {
    c.fillStyle = '#f7f2ff'; c.fillRect(x, -136, 22, 16);
    c.fillStyle = 'rgba(120,105,190,0.3)'; c.fillRect(x + 16, -136, 6, 16);
    c.fillStyle = '#ffffff'; c.fillRect(x, -136, 22, 1.8);
    c.strokeStyle = '#b9a8e8'; c.lineWidth = 1.5; c.strokeRect(x, -136, 22, 16);
  }
  c.fillStyle = 'rgba(120,105,190,0.28)'; c.fillRect(-220, -120, 440, 4);
  c.fillStyle = '#ebe4fb'; c.fillRect(-222, -84, 444, 5); c.fillStyle = '#ffffff'; c.fillRect(-222, -84, 444, 1.5); c.fillStyle = '#b9a8e8'; c.fillRect(-222, -79, 444, 1);
  for (const sx of [-190, -150, -80, 72, 140, 182]) { c.fillStyle = '#7a6aa8'; rrOn(c, sx, -66, 5, 20, 2.5); c.fill(); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(sx - 1, -46, 7, 1.5); }
  // the gate: voussoirs round a planked door with gold bands and rivets
  c.fillStyle = '#ebe4fb'; rrOn(c, -48, -104, 96, 104, 48); c.fill();
  c.strokeStyle = '#b9a8e8'; c.lineWidth = 1.2; c.beginPath();
  for (let k = 0; k <= 10; k++) { const a = Math.PI + k * Math.PI / 10; c.moveTo(Math.cos(a) * 40, -56 + Math.sin(a) * 40); c.lineTo(Math.cos(a) * 48, -56 + Math.sin(a) * 48); }
  c.stroke();
  c.strokeStyle = '#b9a8e8'; c.lineWidth = 1.6; rrOn(c, -48, -104, 96, 104, 48); c.stroke();
  c.fillStyle = '#ffd36b'; c.beginPath(); c.moveTo(-6, -104); c.lineTo(6, -104); c.lineTo(4, -94); c.lineTo(-4, -94); c.closePath(); c.fill();
  c.save(); rrOn(c, -40, -96, 80, 96, 40); c.clip();
  for (let k = 0; k < 6; k++) dkPlank(c, -40 + k * 80 / 6, -96, 80 / 6, 96, k % 2 ? '#8a6ad0' : '#9474d8', 90 + k, { vert: true, r: 0, lit: 0.18, lw: 0.8, outline: '#5e4296' });
  c.fillStyle = 'rgba(40,20,70,0.25)'; c.fillRect(-1, -96, 2, 96);
  for (const by of [-74, -30]) { dkPlate(c, -40, by, 80, 7, '#e2b44a', { r: 1, step: 13, outline: '#a8801f' }); }
  c.restore();
  c.strokeStyle = '#5e4296'; c.lineWidth = 2; rrOn(c, -40, -96, 80, 96, 40); c.stroke();
  for (let k = 0; k < 5; k++) dkCobble(c, -30 + k * 15, 2, 7, 3, '#e6e2fa', 140 + k);
}
function balloonDrawCastle(st) {
  if (st.c.look !== 'castle') return;
  const d = st.c.dock, base = d.h - 30, cx = d.x;
  if (base + 360 < st.cam || base - 100 > st.cam + H) return;
  dkPic('bcCastle', 940, 510, 470, 440, c => balloonPaintCastle(c), cx, -base);
  // pennants (live: they wave)
  for (const [x, w, h] of [[cx - 230, 50, 200], [cx + 230, 50, 200], [cx - 120, 64, 260], [cx + 120, 64, 260], [cx, 90, 320]]) {
    const py = -(base + h + w * 1.1);
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py - 18); ctx.stroke();
    const f = Math.sin(G.clock * 5 + x) * 3;
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x, py - 18); ctx.lineTo(x + 16 + f, py - 13); ctx.lineTo(x, py - 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.goldDark; ctx.beginPath(); ctx.moveTo(x, py - 13); ctx.lineTo(x + 16 + f, py - 13); ctx.lineTo(x, py - 8); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#ffd36b'; circle(cx + 22, -(base + 44), 4); ctx.fill();
}
function balloonDrawCheck(st, cp) {
  const y = -cp.h, x = cp.x;
  if (cp.h < st.cam - 80 || cp.h > st.cam + H + 120) return;
  balloonPuff(x, y + 8, 44, '#ffffff');
  const up = cp.on ? clamp(cp.t / 0.5, 0, 1) : 0;
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 62); ctx.stroke();
  const fy = y - 30 - 28 * up;
  ctx.fillStyle = cp.on ? C.gold : '#ffffff'; ctx.strokeStyle = cp.on ? '#b9850f' : '#9aa0c0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, fy - 2); ctx.lineTo(x + 30 + Math.sin(G.clock * 6) * 2, fy + 8); ctx.lineTo(x, fy + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (cp.on) { ctx.fillStyle = '#ffffff'; balloonStarPath(x + 11, fy + 8, 5, 2.2, -Math.PI / 2); ctx.fill(); }
}
function balloonDrawSign(st, sg) {
  if (sg.h < st.cam - 80 || sg.h > st.cam + H + 80) return;
  ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(sg.text).width + 26, x = clamp(sg.x, w / 2 + 8, W - w / 2 - 8), y = -sg.h;
  balloonPuff(x - w / 2 + 10, y + 16, 26, 'rgba(255,255,255,0.95)'); balloonPuff(x + w / 2 - 10, y + 16, 26, 'rgba(255,255,255,0.95)');
  ctx.fillStyle = '#f2d39a'; rr(x - w / 2, y - 15, w, 30, 8); ctx.fill();
  ctx.strokeStyle = '#946232'; ctx.lineWidth = 2.5; rr(x - w / 2, y - 15, w, 30, 8); ctx.stroke();
  text(sg.text, x, y + 0.5, 15, '#4a2f14', 'center', 'body');
}
// ---------- rich still art (cached; dkPic and the dk* kit live in world18/runaway-ship.js) ----------
// a floating island, painted once per size: a dry-stone underside of shaded cobbles with strata and cracks, shading
// toward the bottom, roots and leafy vines hanging off it, then the grass top with blades, flowers and little trees
// (local x 0..w from the island's left, y 0 = its top, hgt = its depth; x0 keeps the hashes where they always were)
function balloonPaintIsle(c, w, hgt, rl, rrd, x0) {
  const bot = hgt, top = 0;
  const shape = () => {
    c.beginPath(); c.moveTo(0, top + 10); c.lineTo(w, top + 10);
    c.lineTo(w, bot - rrd); c.quadraticCurveTo(w, bot, w - rrd, bot);
    for (let x = w - rrd; x > rl; x -= 30) c.lineTo(x - 15, bot + 6 + (hash((x + x0) | 0, 7) % 8));
    c.lineTo(rl, bot); c.quadraticCurveTo(0, bot, 0, bot - rl); c.closePath();
  };
  c.fillStyle = C.stoneEdge; shape(); c.fill();
  c.save(); shape(); c.clip();
  // cobbles in staggered courses
  for (let r = 0, yy = top + 18; yy < bot + 10; r++, yy += 12) {
    for (let x = (r % 2) * 11 - 6; x < w + 12; x += 22) {
      const hh = hash((x + x0) | 0, r * 31 + 5), col = dkMix(C.stone, hh % 3 === 0 ? C.stoneLight : hh % 3 === 1 ? C.stoneEdge : C.stone, 0.45);
      dkCobble(c, x + (hh % 5) - 2, yy + ((hh >>> 4) % 3) - 1, 10.5 + (hh >>> 6) % 3, 6 + (hh >>> 8) % 2, col, hh);
    }
  }
  const sg = c.createLinearGradient(0, top, 0, bot + 10); sg.addColorStop(0, 'rgba(255,255,255,0.06)'); sg.addColorStop(0.4, 'rgba(20,20,40,0)'); sg.addColorStop(1, 'rgba(20,20,40,0.38)');
  c.fillStyle = sg; c.fillRect(-4, top, w + 8, bot - top + 14);
  c.fillStyle = 'rgba(20,20,50,0.18)'; c.fillRect(w - 10, top, 10, bot - top + 10);
  c.fillStyle = 'rgba(20,20,50,0.25)'; c.fillRect(0, top + 12, w, 6);
  c.strokeStyle = 'rgba(20,20,50,0.4)'; c.lineWidth = 1; c.beginPath();
  for (let x = 40; x < w - 20; x += 110) { const hs = hash((x + x0) | 0, 61); c.moveTo(x + hs % 30, top + 20); c.lineTo(x + hs % 30 + 4, top + 32); c.lineTo(x + hs % 30 - 1, top + 44); }
  c.stroke();
  c.restore();
  c.strokeStyle = C.stoneEdge; c.lineWidth = 2.5; shape(); c.stroke();
  // roots and leafy vines hanging down
  for (let x = 40; x < w - 30; x += 90) {
    const l = 10 + hash((x + x0) | 0, 4) % 14;
    c.strokeStyle = '#5d8f4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, bot + 2); c.quadraticCurveTo(x + 5, bot + l / 2, x, bot + l); c.stroke();
    c.strokeStyle = '#8a6a44'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 14, bot + 3); c.quadraticCurveTo(x + 10, bot + 9, x + 15, bot + 14); c.stroke();
    for (let k = 1; k < 4; k++) { const ly = bot + l * k / 4, d = k % 2 ? 1 : -1; c.fillStyle = k % 2 ? '#6fbf5a' : '#5aa84c'; c.beginPath(); c.ellipse(x + d * 3, ly, 3, 1.6, d * 0.6, 0, Math.PI * 2); c.fill(); }
  }
  for (let x = 10; x < w - 10; x += 140) { if (rl === 0 && x < 30) continue; const hs = hash((x + x0) | 0, 63), vx = x + hs % 40; c.strokeStyle = '#4f9a48'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(vx, top + 12); c.quadraticCurveTo(vx - 4, top + 28, vx + 1, top + 40 + hs % 12); c.stroke(); c.fillStyle = '#6fbf5a'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(vx - 1 + (k % 2 ? 3 : -3), top + 18 + k * 7, 2.6, 1.5, 0, 0, Math.PI * 2); c.fill(); } }
  // the grass top
  c.fillStyle = '#7bd36b'; rrOn(c, 0, top - 2, w, 16, 8); c.fill();
  c.fillStyle = '#5fbf55'; c.fillRect(6, top + 10, w - 12, 4);
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(8, top - 1, w - 16, 2);
  c.fillStyle = '#5fbf55'; for (let x = 10; x < w - 8; x += 12) { c.beginPath(); c.arc(x, top + 13, 4, 0, Math.PI); c.fill(); }
  c.fillStyle = 'rgba(40,110,50,0.35)'; for (let x = 4; x < w - 4; x += 5) { const hs = hash((x + x0) | 0, 29); c.fillRect(x, top + 3 + hs % 7, 1, 2); }
  c.strokeStyle = '#4fae46'; c.lineWidth = 1.5; c.beginPath();
  for (let x = 9; x < w - 8; x += 9) { const hs = hash((x + x0) | 0, 23); if (hs % 3) continue; c.moveTo(x, top); c.lineTo(x - 1.5, top - 5 - hs % 4); c.moveTo(x + 2, top); c.lineTo(x + 3.5, top - 4 - hs % 3); }
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1; c.beginPath(); for (let x = 9; x < w - 8; x += 9) { const hs = hash((x + x0) | 0, 23); if (hs % 3) continue; c.moveTo(x - 0.5, top - 1); c.lineTo(x - 1.5, top - 4 - hs % 4); } c.stroke();
  for (let x = 14; x < w - 10; x += 34) {
    const hs = hash((x + x0) | 0, 11);
    if (hs % 5 === 0) {
      c.fillStyle = 'rgba(30,60,30,0.2)'; c.beginPath(); c.ellipse(x + 2, top, 14, 3, 0, 0, Math.PI * 2); c.fill();
      dkPlank(c, x - 3, top - 22, 6, 22, '#8a5a34', hs, { vert: true, r: 1, lit: 0.2, outline: '#5e3a1c', lw: 0.8 });
      c.fillStyle = '#2f7a3c'; c.beginPath(); c.arc(x + 4, top - 26, 14, 0, Math.PI * 2); c.arc(x - 6, top - 19, 9, 0, Math.PI * 2); c.arc(x + 12, top - 20, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3f9a4a'; c.beginPath(); c.arc(x + 2, top - 28, 14, 0, Math.PI * 2); c.arc(x - 7, top - 20, 9, 0, Math.PI * 2); c.arc(x + 11, top - 21, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4fb05a'; c.beginPath(); c.arc(x, top - 30, 12, 0, Math.PI * 2); c.arc(x - 9, top - 22, 7.5, 0, Math.PI * 2); c.arc(x + 8, top - 24, 7.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(x - 4, top - 35, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff6b6b'; for (const [ax, ay] of [[-4, -24], [6, -31], [9, -19]]) { c.beginPath(); c.arc(x + ax, top + ay, 1.8, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#2a6a34'; c.lineWidth = 1; c.beginPath(); c.arc(x + 2, top - 28, 14, Math.PI * 1.6, Math.PI * 0.4); c.stroke();
    } else if (hs % 3 === 0) {
      const fc = ['#ffe36b', '#ff9ec0', '#ffffff'][hs % 3];
      c.strokeStyle = '#4fae46'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, top + 1); c.lineTo(x, top - 3); c.stroke();
      c.fillStyle = fc; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.257) * 2.2, top - 4 + Math.sin(p * 1.257) * 2.2, 1.6, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ffb83a'; c.beginPath(); c.arc(x, top - 4, 1.2, 0, Math.PI * 2); c.fill();
    }
  }
}
// a solid cloud island (the launch pad and the docks' islands), same silhouette as the old flat one
function balloonPaintCloudIsle(c, w, hgt, x0) {
  const bot = hgt, puffs = [];
  for (let x = x0 + 26; x < x0 + w - 10; x += 40) puffs.push([x - x0, bot - 12 + (hash(x | 0, 2) % 10)]);
  const shape = () => { c.beginPath(); rrOn(c, 0, -2, w, Math.max(16, bot - 8), Math.min(20, (bot - 8) / 2)); for (const [px, py] of puffs) { c.moveTo(px + 26, py); c.arc(px, py, 26, 0, Math.PI * 2); } };
  c.fillStyle = 'rgba(110,110,180,0.14)'; c.beginPath(); c.ellipse(w / 2, bot + 22, w * 0.46, 6, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#b4b8e6'; c.lineWidth = 3; shape(); c.stroke();
  c.fillStyle = '#d8dcf6'; shape(); c.fill();
  // the lit body (shifted up so the shade shows under each puff)
  c.save(); shape(); c.clip();
  const g = c.createLinearGradient(0, 0, 0, bot + 14); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#ffffff'); g.addColorStop(1, '#e6e9fb');
  c.fillStyle = g; c.beginPath(); rrOn(c, 0, -2, w, Math.max(16, bot - 12), Math.min(20, (bot - 12) / 2)); for (const [px, py] of puffs) { c.moveTo(px + 23, py - 5); c.arc(px - 2, py - 5, 23, 0, Math.PI * 2); } c.fill();
  // creases between the bottom puffs and soft lavender shade low down
  c.strokeStyle = 'rgba(160,165,220,0.55)'; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath();
  for (let k = 1; k < puffs.length; k++) { const mx = (puffs[k - 1][0] + puffs[k][0]) / 2, my = (puffs[k - 1][1] + puffs[k][1]) / 2; c.moveTo(mx - 5, my + 2); c.quadraticCurveTo(mx, my + 10, mx + 4, my + 18); }
  for (let x = 30; x < w - 30; x += 56) { const hs = hash((x + x0) | 0, 5); c.moveTo(x, bot * 0.45 + hs % 8); c.quadraticCurveTo(x + 9, bot * 0.45 + 7 + hs % 8, x + 18, bot * 0.45 + hs % 8); }
  c.stroke(); c.lineCap = 'butt';
  c.restore();
  // the flat top: a bright cap with puff highlights
  c.fillStyle = 'rgba(255,255,255,0.95)';
  for (let x = 14; x < w - 8; x += 26) { const hs = hash((x + x0) | 0, 9); c.beginPath(); c.ellipse(x + hs % 6, 4 + hs % 3, 9, 3.2, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = 'rgba(200,215,255,0.4)'; for (let x = 40; x < w - 20; x += 70) { c.beginPath(); c.ellipse(x, 12, 10, 2.5, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#ffffff'; c.fillRect(10, -1.5, w - 20, 1.6);
}
// a floating island (or the launch pad / dock island): grass on top, lilac rock below, flowers and trees
function balloonDrawSolid(st, r) {
  if (r.t < st.cam - 30 || r.b - 60 > st.cam + H) return;
  const x0 = Math.max(r.x0, -30), x1 = Math.min(r.x1, W + 30);
  if (x1 <= x0) return;
  const top = -r.t, bot = -r.b, w = x1 - x0, rl = r.edgeL === false ? 0 : 26, rrd = r.edgeR === false ? 0 : 26;
  const cloud = r.kind === 'dock' || r.kind === 'pad';
  // the underside: rock (islands) or a cloud (docks)
  if (cloud) {
    // (cached per size and place) a solid cloud island: puffs outlined in their own lavender, shaded undersides, creases
    const hgt = bot - top;
    dkPic('bcCloudIsle|' + Math.round(x0) + '|' + Math.round(w) + '|' + Math.round(hgt), w + 24, hgt + 50, 12, 10, c => balloonPaintCloudIsle(c, w, hgt, x0), x0, top);
  } else {
    // (cached per island size and place)
    const hgt = bot - top;
    dkPic('bcIsle|' + Math.round(x0) + '|' + Math.round(w) + '|' + Math.round(hgt) + '|' + rl + '|' + rrd, w + 64, hgt + 92, 32, 46, c => balloonPaintIsle(c, w, hgt, rl, rrd, x0), x0, top);
  }
  // a gold breeze: the way through glows
  const hz = r.hz;
  if (hz && hz.gold) { ctx.strokeStyle = 'rgba(255,197,61,0.8)'; ctx.lineWidth = 3; rr(x0 + 2, top, w - 4, bot - top, 14); ctx.stroke(); }
  // a gold ▲ under each gap's edges (where the island ends)
  if (!cloud && hz && hz.kind === 'row') {
    for (const [gx, gw] of hz.gaps) {
      if (Math.abs(gx - gw / 2 - r.x1) > 1) continue;
      const y = bot + 24 + Math.sin(G.clock * 4) * 3;
      ctx.globalAlpha = 0.85; ctx.fillStyle = hz.gold ? C.gold : 'rgba(255,214,107,0.9)';
      ctx.beginPath(); ctx.moveTo(gx, y - 14); ctx.lineTo(gx + 12, y + 4); ctx.lineTo(gx - 12, y + 4); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
// the landing dock: planks with a target, a post and a windsock, on its cloud island
function balloonDrawDock(st) {
  const d = st.c.dock;
  if (d.h < st.cam - 30 || d.h - 80 > st.cam + H) return;
  const y = -d.h;
  dkPic('bcDock|' + d.w, d.w + 4, 20, 2, 8, c => {
    dkPlate(c, 6, -2, d.w - 12, 10, C.plankDark, { rivets: false, r: 1 });
    for (let x = 8, i = 0; x < d.w - 8; x += 22, i++) { dkPlank(c, x, -6, 20, 8, i % 2 ? '#c4864f' : C.plank, 300 + i, { r: 2, lit: 0.35, lw: 0.8 }); dkNail(c, x + 4, -2, 0.9); dkNail(c, x + 16, -2, 0.9); }
  }, d.x0, y);
  // the target ring
  ctx.strokeStyle = d.gold ? C.gold : '#e85a4a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(d.x, y - 3, 34, 5, 0, 0, Math.PI * 2); ctx.stroke();
  if (d.gold) {
    // the gold cushion
    ctx.fillStyle = 'rgba(255,214,107,0.9)'; rr(d.x0 + 10, y - 16, d.w - 20, 14, 7); ctx.fill();
    ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 2; rr(d.x0 + 10, y - 16, d.w - 20, 14, 7); ctx.stroke();
  }
  // posts with a windsock
  for (const px of [d.x0 + 10, d.x1 - 10]) dkPic('bcDockPost', 10, 32, 5, 31, c => { dkPlank(c, -3, -30, 6, 30, C.plankDark, 7, { vert: true, r: 1, lw: 0.8 }); c.fillStyle = '#e0c48a'; c.fillRect(-3.5, -24, 7, 2); c.fillRect(-3.5, -20, 7, 2); }, px, y);
  const px = d.x1 - 10;
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, y - 30); ctx.lineTo(px, y - 66); ctx.stroke();
  const sw = Math.sin(G.clock * 3) * 0.15;
  ctx.save(); ctx.translate(px, y - 62); ctx.rotate(sw);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff6b4a'; ctx.beginPath(); ctx.moveTo(i * 8, -6 + i); ctx.lineTo(i * 8 + 8, -5 + i); ctx.lineTo(i * 8 + 8, 5 - i); ctx.lineTo(i * 8, 6 - i); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // the word, hanging under the dock
  ctx.fillStyle = '#f2d39a'; rr(d.x - 30, y + 14, 60, 20, 6); ctx.fill();
  ctx.strokeStyle = '#946232'; ctx.lineWidth = 2; rr(d.x - 30, y + 14, 60, 20, 6); ctx.stroke();
  text(st.c.look === 'castle' ? 'CASTLE' : 'DOCK', d.x, y + 24.5, 12, '#4a2f14', 'center', 'body');
}
function balloonDrawStar(st, q) {
  if (q.h < st.cam - 30 || q.h > st.cam + H + 30) return;
  if (q.got) {
    if (q.t > 0.4) return;
    ctx.globalAlpha = 1 - q.t / 0.4; ctx.fillStyle = C.gold;
    balloonStarPath(q.x, -q.h - q.t * 40, 12 + q.t * 10, 5, -Math.PI / 2); ctx.fill(); ctx.globalAlpha = 1;
    return;
  }
  const sx = Math.cos(G.clock * 3 + q.x * 0.02);
  ctx.save(); ctx.translate(q.x, -q.h + Math.sin(G.clock * 2 + q.h) * 3); ctx.scale(0.35 + 0.65 * Math.abs(sx), 1);
  ctx.fillStyle = 'rgba(255,230,120,0.35)'; circle(0, 0, 17); ctx.fill();
  ctx.fillStyle = '#ffd34a'; ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 2;
  balloonStarPath(0, 0, 12, 5.2, -Math.PI / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(-3, -3, 2.5); ctx.fill();
  ctx.restore();
}
// a party balloon on a string (y is canvas y; t only sways it)
function balloonParty(x, y, col, s, t) {
  const cl = ['#ff7eb6', '#7ee0a0', '#b28dff', '#ffd34a'][col % 4];
  const sw = Math.sin(t * 2) * 3 * s;
  ctx.strokeStyle = 'rgba(80,70,110,0.7)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x + sw, y + 12 * s); ctx.quadraticCurveTo(x - 4 * s, y + 24 * s, x + sw * 0.5, y + 34 * s); ctx.stroke();
  ctx.fillStyle = cl; ctx.beginPath(); ctx.ellipse(x + sw, y, 10 * s, 12.5 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + sw - 3 * s, y + 13 * s); ctx.lineTo(x + sw + 3 * s, y + 13 * s); ctx.lineTo(x + sw, y + 10 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(x + sw - 3.5 * s, y - 4 * s, 2.6 * s, 4 * s, -0.4, 0, Math.PI * 2); ctx.fill();
}
// a grumpy (harmless) storm cloud; a gold one has cheered up
function balloonDrawStorm(st, s) {
  if (s.h + s.r < st.cam - 20 || s.h - s.r > st.cam + H + 20) return;
  const x = s.x, y = -s.h, r = s.r, ry = r * 0.62, zap = s.zapT > 0;
  const body = s.gold ? '#ffffff' : zap ? '#b9bdd6' : '#9da3bf', dark = s.gold ? '#ffe7a8' : '#7d82a3';
  ctx.fillStyle = dark;
  for (const [ox, oy, rad] of [[-0.62, 0.18, 0.42], [0, 0.22, 0.5], [0.62, 0.18, 0.42]]) { circle(x + ox * r, y + oy * r, rad * r); ctx.fill(); }
  ctx.fillStyle = body;
  for (const [ox, oy, rad] of [[-0.6, 0.05, 0.42], [-0.2, -0.22, 0.5], [0.28, -0.25, 0.48], [0.66, 0.06, 0.38], [0, 0.1, 0.5]]) { circle(x + ox * r, y + oy * r, rad * r); ctx.fill(); }
  if (s.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r * 1.05, ry * 1.25, 0, 0, Math.PI * 2); ctx.stroke(); }
  // the face: grumpy brows and a little frown (a gold cloud smiles)
  const fy = y - ry * 0.05;
  ctx.strokeStyle = '#3a3656'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  if (s.gold) {
    for (const ex of [-0.22, 0.22]) { ctx.beginPath(); ctx.arc(x + ex * r, fy, 4, Math.PI, 0); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, fy + 6, 8, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,170,0.5)'; circle(x - 0.38 * r, fy + 8, 4); ctx.fill(); circle(x + 0.38 * r, fy + 8, 4); ctx.fill();
  } else {
    for (const ex of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + ex * 0.32 * r, fy - 10); ctx.lineTo(x + ex * 0.12 * r, fy - 6); ctx.stroke();
      ctx.fillStyle = '#3a3656'; ctx.beginPath(); ctx.ellipse(x + ex * 0.21 * r, fy, 3.2, zap ? 4.5 : 2.4, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (zap) { ctx.fillStyle = '#3a3656'; ctx.beginPath(); ctx.ellipse(x, fy + 10, 4, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(x, fy + 16, 8, Math.PI + 0.5, -0.5); ctx.stroke(); }
    // little sparks under it now and then
    const ph = (G.clock * 0.7 + s.x0 * 0.01) % 2;
    if (zap || ph < 0.25) {
      const bx = x + Math.sin(s.x0 + Math.floor(G.clock * 3)) * r * 0.4, by = y + ry + 4;
      ctx.strokeStyle = '#fff27a'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 6, by + 10); ctx.lineTo(bx + 3, by + 11); ctx.lineTo(bx - 4, by + 22); ctx.stroke();
    }
  }
}
// a flock of round little birds flapping across (they're friendly: a bump is just a boing)
function balloonDrawFlock(st, f) {
  if (f.state === 'wait' || f.state === 'gone') return;
  const y0 = balloonSY(st, f.h);
  if (y0 < -40 || y0 > H + 40) return;
  // a warning arrow at the screen edge just before they come back in
  if (f.state === 'rest' && f.warn > 0) {
    const ex = -f.dir > 0 ? 24 : W - 24, y = -f.h;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.clock * 16);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex + f.dir * 10, y - 12); ctx.lineTo(ex - f.dir * 12, y); ctx.lineTo(ex + f.dir * 10, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (f.state !== 'fly') return;
  for (let i = 0; i < f.n; i++) {
    const q = balloonBird(st, f, i), x = q.x, y = -q.h - (f.dodge > 0 ? 24 * Math.sin(f.dodge / 0.8 * Math.PI) : 0);
    const flap = Math.sin(G.clock * 14 + i * 1.7), col = f.gold ? '#ffe28a' : ['#ffd86b', '#ff9ec0', '#9fe0ff', '#c9b4ff', '#ffb36b'][i % 5];
    ctx.save(); ctx.translate(x, y); ctx.scale(f.dir, 1);
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(60,50,90,0.7)'; ctx.lineWidth = 1.5;
    // back wing, body, front wing
    ctx.beginPath(); ctx.ellipse(-2, -4 - flap * 6, 9, 4, -0.6 - flap * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    circle(0, 0, 11); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-17, -6); ctx.lineTo(-16, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(4, -3, 3.6); ctx.fill();
    ctx.fillStyle = C.ink; circle(5, -3, 1.8); ctx.fill();
    ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.moveTo(10, -1); ctx.lineTo(16, 1); ctx.lineTo(10, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-3, 1 + flap * 5, 8, 3.5, 0.5 + flap * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(5, 3, 2); ctx.fill();
    ctx.restore();
  }
}
// Gus the goose (with a little blue scarf): flies in, tows the balloon, flies off
function balloonGus(x, y, face, flap) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#8a8aa8'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(-4, -10 - flap * 10, 20, 7, -0.5 - flap * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14, -4); ctx.quadraticCurveTo(26, -10, 24, -24); ctx.lineWidth = 8; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  ctx.lineWidth = 1.6; ctx.strokeStyle = '#8a8aa8'; circle(25, -26, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.moveTo(31, -28); ctx.lineTo(42, -25); ctx.lineTo(31, -22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; circle(27, -28, 1.9); ctx.fill();
  ctx.fillStyle = '#5b95ff'; rr(17, -14, 12, 5, 2); ctx.fill(); ctx.fillRect(18, -11, 4, 9);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#8a8aa8';
  ctx.beginPath(); ctx.ellipse(-6, 3 + flap * 8, 16, 6, 0.4 + flap * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function balloonDrawGoose(st) {
  const B = BALLOON, b = st.b, flap = Math.sin(G.clock * 12);
  if (st.state === 'tow' && st.tow) {
    const tw = st.tow, top = b.h + B.top + 40;
    let gx = b.x + tw.side * 20, gy = -(top + 30);
    if (tw.t < 1.0) { const u = balloonSmooth(tw.t / 1.0); gx = balloonLerp(tw.side < 0 ? -80 : W + 80, gx, u); gy = balloonLerp(-(st.cam + H + 40), gy, u); }
    balloonGus(gx, gy, -tw.side, flap);
    if (tw.t >= 0.9) {
      ctx.strokeStyle = '#e8d29a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(gx - tw.side * 34, gy - 25); ctx.quadraticCurveTo(b.x + tw.side * 50, -(b.h + 120), b.x + tw.side * B.bw, -(b.h + B.bh)); ctx.stroke();
    }
  } else if (st.goose) {
    const g = st.goose, u = g.t / 2;
    balloonGus(g.x + g.side * u * 600, -(g.h + B.top + 70 + u * 200), g.side, flap);
  }
}
// the gold rope from the dock post to the basket
function balloonDrawReel(st) {
  if (!st.reel || st.state === 'tow') return;
  const B = BALLOON, b = st.b, d = st.c.dock, s = b.x < d.x ? -1 : 1, px = s < 0 ? d.x0 + 10 : d.x1 - 10, py = -(d.h + 30);
  const bx = b.x + s * B.bw, by = -(b.h + 6), u = clamp(st.reel.t / 0.5, 0, 1);
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo((px + bx) / 2, Math.max(py, by) + 20, balloonLerp(px, bx, u), balloonLerp(py, by, u)); ctx.stroke();
  ctx.fillStyle = '#fff3c4'; circle(balloonLerp(px, bx, u), balloonLerp(py, by, u), 4); ctx.fill();
}
// the balloon: envelope (orange and blue stripes), ropes, burner and flame, Pip and Bo in the wicker basket
function balloonDrawBalloon(st) {
  const B = BALLOON, b = st.b, x = b.x, h = b.h;
  const cy = -(h + B.envY), r = B.envR, my = -(h + 76), byT = -(h + B.bh), byB = -h;
  const pcol = PCOL[0], bcol = PCOL[1];
  // tied party balloons float up from the basket's back corners
  st.tied.forEach((col, i) => {
    const s = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    const px = x + s * (B.bw + 8 + k * 9), py = -(h + B.bh + 44 + k * 14);
    ctx.strokeStyle = 'rgba(80,70,110,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + s * (B.bw - 3), byT + 4); ctx.lineTo(px, py + 12); ctx.stroke();
    balloonParty(px, py, col, 0.8, G.clock + i);
  });
  // the envelope
  const env = () => {
    ctx.beginPath(); ctx.moveTo(x - 14, my);
    ctx.bezierCurveTo(x - 26, my - 14, x - r, cy + r * 0.6, x - r, cy);
    ctx.arc(x, cy, r, Math.PI, Math.PI * 2);
    ctx.bezierCurveTo(x + r, cy + r * 0.6, x + 26, my - 14, x + 14, my);
    ctx.closePath();
  };
  ctx.save();
  env(); ctx.clip();
  ctx.fillStyle = '#fff4dc'; ctx.fillRect(x - r - 4, cy - r - 4, 2 * r + 8, my - cy + r + 8);
  const lens = (wd, col) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, cy - r - 6);
    ctx.bezierCurveTo(x + wd * r * 1.35, cy - r * 0.7, x + wd * r * 1.15, cy + r * 0.7, x, my + 4);
    ctx.bezierCurveTo(x - wd * r * 1.15, cy + r * 0.7, x - wd * r * 1.35, cy - r * 0.7, x, cy - r - 6);
    ctx.fill();
  };
  lens(1.25, pcol); lens(0.86, '#fff4dc'); lens(0.62, bcol); lens(0.36, '#fff4dc'); lens(0.14, pcol);
  // shading: light from the top left; a warm glow from the burner when it's hot
  const sh = ctx.createRadialGradient(x - r * 0.4, cy - r * 0.45, 4, x, cy, r * 1.3);
  sh.addColorStop(0, 'rgba(255,255,255,0.45)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(40,30,80,0.28)');
  ctx.fillStyle = sh; ctx.fillRect(x - r - 4, cy - r - 4, 2 * r + 8, my - cy + r + 8);
  if (b.heat > 0.05) {
    const wg = ctx.createLinearGradient(0, cy - r * 0.3, 0, my);
    wg.addColorStop(0, 'rgba(255,170,90,0)'); wg.addColorStop(1, 'rgba(255,150,70,' + (b.heat * 0.3 + b.flame * 0.15).toFixed(3) + ')');
    ctx.fillStyle = wg; ctx.fillRect(x - r - 4, cy - r * 0.3, 2 * r + 8, my - cy + r * 0.3 + 6);
  }
  // a gold band with scallops
  const bandY = cy + r * 0.58;
  ctx.fillStyle = C.gold; ctx.fillRect(x - r, bandY, 2 * r, 6);
  ctx.fillStyle = '#ffffff';
  for (let i = -3; i <= 3; i++) { circle(x + i * 12, bandY + 3, 2); ctx.fill(); }
  ctx.restore();
  env(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.stroke();
  // vent flaps: the one the steerer pulls opens a little
  for (const s of [-1, 1]) {
    const open = Math.max(0, b.pull * s);
    ctx.fillStyle = s < 0 ? bcol : pcol; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    ctx.save(); ctx.translate(x + s * (r - 4), cy + 6); ctx.rotate(s * open * 0.5);
    rr(-4, -10, 8, 20, 3); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // the skirt
  ctx.fillStyle = '#e0b070'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 14, my); ctx.lineTo(x + 14, my); ctx.lineTo(x + 10, my + 8); ctx.lineTo(x - 10, my + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  // ropes from the envelope to the basket and the burner frame
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.8;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + s * 30, cy + r * 0.82); ctx.lineTo(x + s * (B.bw - 2), byT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * 12, my + 6); ctx.lineTo(x + s * 9, -(h + 54)); ctx.stroke();
  }
  // the burner and its flame (a little pilot light when off; it sputters with smoke when too hot)
  const fy = -(h + 54);
  ctx.fillStyle = '#6a6f8c'; rr(x - 10, fy - 2, 20, 8, 3); ctx.fill();
  ctx.fillStyle = '#9aa0bf'; rr(x - 7, fy - 6, 14, 5, 2); ctx.fill();
  const fl = b.flame, flick = Math.sin(G.clock * 40) * 0.12 + Math.sin(G.clock * 23) * 0.08;
  const fh = (b.sput > 0 ? 4 : 6) + fl * (30 + flick * 18);
  ctx.fillStyle = 'rgba(255,220,120,0.5)'; circle(x, fy - 6 - fh * 0.4, 4 + fl * 12); ctx.fill();
  ctx.fillStyle = b.sput > 0 ? '#9aa0bf' : '#ff8a3d';
  ctx.beginPath(); ctx.moveTo(x - 5 - fl * 3, fy - 5); ctx.quadraticCurveTo(x - 6 - fl * 4, fy - 6 - fh * 0.5, x, fy - 6 - fh); ctx.quadraticCurveTo(x + 6 + fl * 4, fy - 6 - fh * 0.5, x + 5 + fl * 3, fy - 5); ctx.closePath(); ctx.fill();
  if (b.sput <= 0) { ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.moveTo(x - 3, fy - 5); ctx.quadraticCurveTo(x - 3, fy - 6 - fh * 0.4, x, fy - 6 - fh * 0.7); ctx.quadraticCurveTo(x + 3, fy - 6 - fh * 0.4, x + 3, fy - 5); ctx.closePath(); ctx.fill(); }
  // Pip and Bo (drawn behind the basket's front, so only their tops show)
  for (const p of G.players) balloonDrawRider(st, p);
  // the basket
  ctx.fillStyle = '#c98e57'; rr(x - B.bw, byT, 2 * B.bw, B.bh, 6); ctx.fill();
  ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 1.4;
  ctx.beginPath(); for (let yy = byT + 8; yy < byB - 2; yy += 6) { ctx.moveTo(x - B.bw + 3, yy); ctx.lineTo(x + B.bw - 3, yy); } ctx.stroke();
  ctx.beginPath(); for (let xx = x - B.bw + 8; xx < x + B.bw - 4; xx += 9) { ctx.moveTo(xx, byT + 6); ctx.lineTo(xx, byB - 2); } ctx.stroke();
  ctx.fillStyle = '#9a6234'; rr(x - B.bw - 2, byT - 2, 2 * B.bw + 4, 7, 3.5); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(x - B.bw, byT, 2 * B.bw, B.bh, 6); ctx.stroke();
  // sandbags
  for (const s of [-1, 1]) { ctx.fillStyle = '#d9bf8a'; ctx.beginPath(); ctx.ellipse(x + s * (B.bw + 4), byT + 14, 5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.2; ctx.stroke(); }
}
function balloonDrawRider(st, p) {
  const B = BALLOON, b = st.b, s = balloonSpot(st, p.id), burner = p.id === st.burner, side = balloonSide(p.id);
  const save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive };
  const sc = 1.15;
  ctx.save(); ctx.translate(s.x, -s.h);
  ctx.rotate(burner ? b.lean * 0.12 : -b.pull * 0.08);
  ctx.scale(sc, sc);
  p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = burner ? -60 : 0;
  p.face = -side; p.sx = 1; p.sy = 1;
  p.stun = b.zapT > 0 ? 0.5 : 0;
  drawPlayer(p);
  ctx.restore();
  Object.assign(p, save);
  // arms: the burner reaches up to the burner valve; the steerer holds both vent ropes
  const shY = -(s.h + PH * sc * 0.45);
  const arm = (hx, hy, shX) => {
    for (const [col, lw] of [[PDARK[p.id], 5.5], [PCOL[p.id], 3.2]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(shX, shY); ctx.quadraticCurveTo((shX + hx) / 2 + Math.sign(shX - s.x || -side) * 5, (shY + hy) / 2 + 3, hx, hy); ctx.stroke();
    }
    ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 1.4; circle(hx, hy, 3.4); ctx.fill(); ctx.stroke();
  };
  if (burner && st.state !== 'land') arm(b.x - side * 5, -(b.h + 54 - (b.burning ? 4 : 0)), s.x - side * 8);
  else if (!burner && st.state !== 'land') {
    // the vent ropes come down from the envelope's sides to the steerer's hands
    for (const k of [-1, 1]) {
      const pulled = Math.max(0, b.pull * k), hx = s.x + k * 15, hy = -(s.h + PH * sc * 0.82 - pulled * 9);
      ctx.strokeStyle = k < 0 ? '#ff6b4a' : '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x + k * (B.envR - 4), -(b.h + B.envY - 4)); ctx.lineTo(hx, hy); ctx.stroke();
      arm(hx, hy, s.x + k * 8);
    }
  }
}

/* ---------- the HUD: clock and stars, the altimeter, the heat gauge, the job panels, prompts ---------- */
function balloonHud(st) {
  const B = BALLOON, big = hudBig(), z = big ? 1.35 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock, b = st.b;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.stats.stars + ' / ' + st.starsAll;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    ctx.fillStyle = '#ffd34a'; balloonStarPath(x0 + 15 + tw + gap + icon / 2, cy, fs * 0.6, fs * 0.26, -Math.PI / 2); ctx.fill();
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe7a8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const pl = st.plan || balloonPlan(st);
  // the altimeter (right edge): the start at the bottom, checkpoints, the dock at the top
  {
    const x = W - 22, y0 = (big ? 70 : 56) + 14, y1 = big ? 330 : 380, d = st.c.dock;
    ctx.fillStyle = 'rgba(28,26,54,0.6)'; rr(x - 8, y0 - 14, 16, y1 - y0 + 28, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(x - 3, y0, 6, y1 - y0, 3); ctx.fill();
    const yy = hh => y1 - (y1 - y0) * clamp(hh / d.h, 0, 1);
    for (const cp of st.c.cps) { ctx.fillStyle = cp.on ? C.gold : '#ffffff'; rr(x - 7, yy(cp.h) - 2, 14, 4, 2); ctx.fill(); }
    ctx.fillStyle = C.plank; rr(x - 9, y0 - 6, 18, 6, 2); ctx.fill();
    ctx.fillStyle = '#ff6b4a'; ctx.beginPath(); ctx.moveTo(x + 2, y0 - 6); ctx.lineTo(x + 2, y0 - 18); ctx.lineTo(x + 12, y0 - 14); ctx.lineTo(x + 2, y0 - 10); ctx.fill();
    const by = yy(b.h);
    ctx.fillStyle = PCOL[0]; circle(x, by - 6, 7); ctx.fill(); ctx.fillStyle = PCOL[1]; circle(x, by - 6, 3.5); ctx.fill();
    ctx.fillStyle = '#c98e57'; ctx.fillRect(x - 3, by + 2, 6, 5);
  }
  // the heat gauge and climb meter, bottom centre
  {
    const pw = Math.round(250 * z), ph = Math.round(62 * z), px = W / 2 - pw / 2, py = H - ph - 10;
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = b.sput > 0 ? '#ff6b4a' : '#ffd8a8'; ctx.lineWidth = 2; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const gx = px + 14 * z, gw = 150 * z, gy = py + 26 * z, gh = 14 * z;
    text(b.sput > 0 ? 'TOO HOT! COOLING...' : 'HEAT', gx, py + 13 * z, 10.5 * z, b.sput > 0 ? '#ff8a6b' : '#ffd8a8', 'left', 'body');
    const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    grad.addColorStop(0, '#6fb6ff'); grad.addColorStop(0.4, '#ffe36b'); grad.addColorStop(0.75, '#ff9a3d'); grad.addColorStop(0.86, '#ff6b4a'); grad.addColorStop(1, '#e83a2a');
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(gx, gy, gw, gh, gh / 2); ctx.fill();
    ctx.save(); rr(gx, gy, gw, gh, gh / 2); ctx.clip();
    ctx.fillStyle = grad; ctx.fillRect(gx, gy, gw * clamp(b.heat, 0, 1), gh);
    // the red zone
    ctx.fillStyle = 'rgba(232,58,42,0.35)'; ctx.fillRect(gx + gw * B.hot, gy, gw * (1 - B.hot), gh);
    ctx.restore();
    ctx.strokeStyle = st.goldBurn ? C.gold : 'rgba(255,255,255,0.5)'; ctx.lineWidth = st.goldBurn ? 2.5 : 1.5; rr(gx, gy, gw, gh, gh / 2); ctx.stroke();
    // the "hover" mark
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx + gw * B.hover, gy - 3); ctx.lineTo(gx + gw * B.hover, gy + gh + 3); ctx.stroke();
    const note = st.state === 'land' ? 'Landed!' : st.goldBurn ? 'Gold burner!' : b.hotT > 0.2 ? 'Hot! Let go a moment' : b.burning ? 'Whoosh!' : b.heat < B.hover ? 'Cooling: sinking' : 'Warm: rising';
    text(note, gx, py + ph - 10 * z, 10.5 * z, st.goldBurn ? C.gold : b.hotT > 0.2 ? '#ff8a6b' : '#d9d3ef', 'left', 'body');
    // the climb meter: an arrow up or down (green when gentle enough to land)
    const mx = px + pw - 36 * z, my = py + ph / 2 - 7 * z, v = b.vy, gentle = v > -B.soft && v < 10;
    const len = clamp(Math.abs(v) / 120, 0.15, 1) * 18 * z, up = v >= 0;
    ctx.fillStyle = gentle && pl.why === 'dock' ? '#8fe3b0' : up ? '#ffe7a8' : '#9fd0ff';
    ctx.beginPath();
    if (up) { ctx.moveTo(mx, my - len - 6 * z); ctx.lineTo(mx + 9 * z, my - len + 4 * z); ctx.lineTo(mx - 9 * z, my - len + 4 * z); }
    else { ctx.moveTo(mx, my + len + 6 * z); ctx.lineTo(mx + 9 * z, my + len - 4 * z); ctx.lineTo(mx - 9 * z, my + len - 4 * z); }
    ctx.closePath(); ctx.fill();
    ctx.fillRect(mx - 3 * z, Math.min(my, up ? my - len : my), 6 * z, len);
    const word = Math.abs(v) < 12 ? 'Floating' : up ? 'Rising' : 'Sinking';
    text(word, mx + 2 * z, py + ph - 10 * z, 10.5 * z, gentle && pl.why === 'dock' && !up ? '#8fe3b0' : '#d9d3ef', 'center', 'body');
  }
  // the job panels: Pip's bottom left, Bo's bottom right
  for (const id of [0, 1]) {
    const pw = Math.round(214 * z), ph = Math.round(56 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const quiet = balloonQuiet(id), burner = id === st.burner;
    text(NAMES[id] + (burner ? ' · burner' : ' · steerer') + (quiet ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 14 * z, PCOL[id], 'left');
    const ride = st.state === 'ride' && G.introT <= 0;
    const chips = burner
      ? [['burn', b.burning ? 'BURNING' : 'BURN', ride && pl.burn === 'burn', b.burning]]
      : [[ride && (pl.steer === 'left' || pl.steer === 'right') ? pl.steer : 'lr', 'STEER', ride && (pl.steer === 'left' || pl.steer === 'right'), Math.abs(b.pull) > 0.4],
        ['steady', 'STEADY', ride && pl.steer === 'steady', b.steady]];
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 8 * z) / n;
    chips.forEach(([k, lab, lit, held], i) => {
      const cx = px + 12 * z + i * (cw + 8 * z), cy = py + 26 * z, chh = 24 * z;
      ctx.fillStyle = lit && !quiet ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(255,138,61,0.85)' : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = quiet ? '' : balloonKey(id, k);
      let fs = 12 * z;
      const str = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(str).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(str, cx + cw / 2, cy + chh / 2 + 0.5, fs, lit && !quiet ? C.ink : '#ffffff', 'center', 'body');
    });
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the climb pill
  if (st.msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = big ? 96 : 80;
      while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || st.state !== 'ride') return;
  // prompts beside the basket: Pip's on the left, Bo's on the right. A hint bubble replaces that player's prompt.
  const fs = 14 * z, bx = b.x, byS = balloonSY(st, b.h + 30), yMax = H - Math.round(66 * z) - 18 - (fs + 12 * z);
  const spot = (id, w, h, n) => {
    const side = balloonSide(id);
    let x = side < 0 ? bx - 64 - w : bx + 64, y = clamp(byS - h / 2 - n * (h + 6), big ? 96 : 80, yMax);
    if (x < 4 || x + w > W - 34) { x = clamp(bx - w / 2, 4, W - w - 34); y = clamp(balloonSY(st, b.h + B.top) - h - 10 - n * (h + 6) - (id === 0 ? h + 6 : 0), big ? 96 : 80, yMax); }
    return { x, y };
  };
  const say = (id, str, col, pulse) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = spot(id, w, h, 0);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const bubble = (id, str) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 14 * z, o = spot(id, w, h, 0);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(str, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  for (const p of ps) {
    const id = p.id;
    if (balloonQuiet(id)) continue;
    if (st.hints[id]) { bubble(id, st.hints[id].text); continue; }
    if (id === st.burner) {
      const k = balloonKey(id, 'burn');
      if (pl.burn === 'cool') say(id, 'Too hot! Let it cool...', '#ff8a6b', false);
      else if (pl.burn === 'hot') say(id, 'Hot! Let go of ' + k, '#ff8a6b', true);
      else if (pl.burn === 'burn') say(id, 'Burn! Hold ' + k, C.gold, true);
      else if (pl.burn === 'wait' && b.vy > 25) say(id, 'Ease off! Wait for ' + NAMES[1 - id], '#ffe7a8', false);
      else if (pl.burn === 'wait' && b.vy < -25 && b.heat < balloonHeatFor(pl.vy)) say(id, 'A little puff ' + k, '#ffe7a8', false);
      else if (pl.burn === 'birds' && b.vy > 20) say(id, 'Birds! Wait below them', '#ffe7a8', false);
      else if (pl.burn === 'land' && b.vy < -B.soft + 12) say(id, 'Too fast! A puff ' + k, '#ffb08a', true);
      else if (pl.burn === 'land' && b.heat > balloonHeatFor(pl.vy) + 0.06) say(id, 'Let go: float down', '#8fe3b0', false);
      else if (pl.burn === 'hold' && b.vy < -20) say(id, 'Puff ' + k + ': stay up high', '#ffe7a8', false);
      else if (pl.burn === 'ease') say(id, 'Ease off a little', '#ffe7a8', false);
    } else {
      const wind = balloonWindAt(st);
      if (pl.steer === 'left' || pl.steer === 'right') {
        const goingRight = pl.steer === 'right', ok = goingRight ? b.vx > 40 : b.vx < -40;
        if (!ok) {
          const word = pl.why === 'dock' ? (b.h > st.c.dock.h ? 'to the dock' : 'beside the dock') : pl.why === 'storm' ? 'around the cloud' : wind && Math.sign(wind) !== (goingRight ? 1 : -1) ? 'against the wind' : 'to the gap';
          const k = balloonKey(id, pl.steer), kk = k === '◀' || k === '▶' ? '' : ' (hold ' + k + ')';
          say(id, goingRight ? 'Steer ' + word + ' ▶' + kk : '◀ Steer ' + word + kk, C.gold, true);
        }
      } else if (pl.steer === 'steady') say(id, 'Steady! Hold ' + balloonKey(id, 'steady'), '#ffe7a8', false);
    }
  }
}

/* ---------- sounds ---------- */
Sfx.extra.balloonBurn = function () { this.tone(110 + Math.random() * 30, 0.34, 'sawtooth', 0.018, 70); this.tone(220 + Math.random() * 60, 0.25, 'triangle', 0.012, 140, 0.03); };
Sfx.extra.balloonSputter = function () { [0, 0.12, 0.26].forEach((d, i) => this.tone(180 - i * 30, 0.08, 'square', 0.04, 90, d)); this.tone(500, 0.4, 'sine', 0.03, 200, 0.3); };
Sfx.extra.balloonRelight = function () { this.tone(140, 0.2, 'sawtooth', 0.02, 220); };
Sfx.extra.balloonRope = function () { this.tone(320, 0.08, 'triangle', 0.025, 260); };
Sfx.extra.balloonZap = function () { this.tone(900, 0.06, 'square', 0.035, 300); this.tone(600, 0.08, 'square', 0.03, 1200, 0.06); this.tone(220, 0.2, 'sawtooth', 0.025, 120, 0.12); };
Sfx.extra.balloonBoing = function () { this.tone(180, 0.3, 'sine', 0.08, 560); this.tone(1800, 0.06, 'sine', 0.03, 2200, 0.05); this.tone(2100, 0.06, 'sine', 0.03, 2500, 0.14); };
Sfx.extra.balloonTweet = function () { this.tone(2000, 0.07, 'sine', 0.025, 2600); this.tone(2200, 0.07, 'sine', 0.025, 2800, 0.1); };
Sfx.extra.balloonBonk = function () { this.tone(260, 0.14, 'sine', 0.06, 180); this.tone(120, 0.12, 'triangle', 0.04, 90, 0.02); };
Sfx.extra.balloonStar = function () { [1319, 1760].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.balloonParty = function () { this.tone(600, 0.12, 'sine', 0.05, 1200); [784, 988, 1175].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, 0.1 + i * 0.06)); };
Sfx.extra.balloonCheck = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.balloonBounce = function () { this.tone(160, 0.35, 'sine', 0.08, 480); this.tone(90, 0.1, 'triangle', 0.05, 60); };
Sfx.extra.balloonLand = function () { this.tone(120, 0.12, 'triangle', 0.06, 80); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, 0.12 + i * 0.08)); };
Sfx.extra.balloonFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.035, null, i * 0.11)); };
Sfx.extra.balloonCheer = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.04, null, i * 0.06)); };
Sfx.extra.balloonHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.balloonGoose = function () { this.tone(330, 0.16, 'square', 0.035, 280); this.tone(330, 0.2, 'square', 0.035, 260, 0.22); };
// a dot added to the current path, so many dots fill in one call
function balloonDot(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
