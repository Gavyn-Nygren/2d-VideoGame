/* Pip & Bo - Level 40-1 The Iron Colossus: Part 7 'fall' (Coming Apart). */
'use strict';

/* ===== 40-1 Part 7: Coming Apart (IRON_PHASES.fall) ================================================================
   Get out while the drawing is rubbed out behind you. Scrolling right and DOWN: out of the head, down the neck to the
   shoulder, along the falling arm, down the collapsing leg, off the knee into Sunny Meadow at dawn (the backdrop: the
   first full, bright colour in the level). Everything they run on is now pencil.
   THE ERASER EDGE (ph.ex) sweeps in from the left: a platform it reaches is trimmed, then gone. It waits at the
   launch plates and at the knee until the heroes are through. Overtaken, or a fall, is a Clang: a pop back to the last
   platform that still exists, and the edge backs off `ex.back` px. Some platforms CRUMBLE once both heroes have stood
   on them: full pencil, then faint (1 s left; gold 2 s), then a dotted outline (gone).
   TICK: at the start one hero scoops him up (walk into him). He rides on their head shouting directions that are
   sometimes wrong, for fun only: the gold arrows drawn on the page are always right.
   LAUNCH PLATES (twice): one stands on the spring plate, the partner jumps onto the foot pump: the first is flung over a
   gap too wide to jump. On the far side they throw the chain back (the action, "throw") and the pumper runs across.
   THE ARM SLIDE: the forearm tips and both slide down it fast (hop the loose plates, ▼ to duck the snapped cables).
   THE LEG: two walls as it folds (a Boost up, then a hand up). THE LAST JUMP: off the knee as it buckles, both press
   jump inside the same half second of a drawn "ready... JUMP" count. They land in the meadow grass; behind them the
   Colossus is rubbed away except its two hands and its great key, which thump down in the grass. Part clear.
   Gold help: platforms give 2 s of warning, the edge is 25% slower, the slide's loose plates and cables are cleared,
   and the jump window doubles.   Rivets: 10.   Stats (st.stats.fall): erased, falls.   Names: ironFall* / IRONFALL. */
const IRONFALL = {
  ex: { start: -320, v: 62, goldV: 46, catchUp: 170, back: 300 },
  crumble: { full: 1.0, faint: 1.0, goldFaint: 2.0 },
  slide: { v: 300, goldV: 220, top: [1600, 180] },
  jump: { ready: 1.0, win: 0.5, goldWin: 1.0, rest: 0.6 },
  meadow: 1300, endX: [4540, 4600], hands: 4990, key: 4710, home: 5260, camEnd: 4430,
  rivets: [[580, 46], [790, 106], [1330, 50], [2000, 366], [2200, 474], [2840, 490], [3330, 686], [3540, 536], [3850, 626], [4100, 476]],
};
// the course: platforms [id, x0, x1, top y, opts]
const IRONFALL_PLATS = [
  ['head', -200, 420, 0, {}], ['neck1', 520, 640, 60, { crumble: true }], ['neck2', 730, 850, 120, { crumble: true }],
  ['shoulder', 940, 1180, 180, {}], ['armtop', 1480, 1640, 180, {}],
  ['hand', 2440, 2700, 620, {}], ['wrist', 3000, 3200, 620, {}], ['shin', 3230, 3440, 700, { crumble: true }],
  ['thigh1', 3440, 3640, 550, { wall: true }], ['hip', 3720, 3980, 640, { crumble: true }], ['thigh2', 3980, 4220, 490, { wall: true }],
  ['knee', 4300, 4540, 560, {}],
];
const IRONFALL_LAUNCH = [
  { pump: [960, 1000], plate: [1100, 1160], from: 'shoulder', to: 'armtop', land: 1530, post: 1500, ex: 900 },
  { pump: [2470, 2510], plate: [2610, 2670], from: 'hand', to: 'wrist', land: 3050, post: 3020, ex: 2300 },
];
const IRONFALL_WALLS = [{ x: 3440, low: 700, top: 550, plat: 'thigh1' }, { x: 3980, low: 640, top: 490, plat: 'thigh2' }];
const IRONFALL_SLIDE = { x0: 1640, x1: 2440, ya: 180, yb: 620, plates: [1860, 2240], cables: [2050, 2350] };
const ironFallSlideY = x => IRONFALL_SLIDE.ya + (IRONFALL_SLIDE.yb - IRONFALL_SLIDE.ya) * (x - IRONFALL_SLIDE.x0) / (IRONFALL_SLIDE.x1 - IRONFALL_SLIDE.x0);
const ironFallGold = st => ironHasGold(st, 'fall');
const IRONFALL_TICK_LINES = ['LEFT! No, the other left!', 'JUMP! ...Not yet. NOW!', 'Down! Up! Whichever!', 'Faster! It is rubbing out my boots!',
  'Mind the gap. Mind ALL the gaps.', 'Right! I mean... correct! Go right!', 'Wheee! ...I mean, careful.'];

function ironFallSetup(st, L) {
  const ph = st.ph, K = IRONFALL;
  ph.first = L.def.first || 0;
  ph.t = 0; ph.ex = K.ex.start; ph.exOn = false; ph.say = 6;
  ph.plats = {}; ph.solids = [];
  for (const [id, x0, x1, y, o] of IRONFALL_PLATS) {
    const r = { id, ox0: x0, x0, x1, y0: y, y1: y + (o.wall ? 230 : 34), kind: 'plat', crumble: !!o.crumble, wall: !!o.wall, st: 'full', t: 0, touched: [false, false] };
    ph.plats[id] = r; ph.solids.push(r);
  }
  ph.slide = { slope: true, x0: IRONFALL_SLIDE.x0, x1: IRONFALL_SLIDE.x1, ya: IRONFALL_SLIDE.ya, yb: IRONFALL_SLIDE.yb, y0: IRONFALL_SLIDE.ya, kind: 'slide', ox0: IRONFALL_SLIDE.x0 };
  ph.solids.push(ph.slide);
  ph.launch = IRONFALL_LAUNCH.map((l, i) => {
    const from = ph.plats[l.from], pump = { x0: l.pump[0], x1: l.pump[1], y0: from.y0 - 12, y1: from.y0, kind: 'pump', ox0: l.pump[0] };
    ph.solids.push(pump);
    return Object.assign({}, l, { i, st: 'set', who: i === 0 ? ph.first : 1 - ph.first, pumpS: pump, y: from.y0, toY: ph.plats[l.to].y0, bridge: null, squash: 0 });
  });
  ph.walls = IRONFALL_WALLS.map((w, i) => Object.assign({}, w, { i, done: false, first: i === 0 ? 1 - ph.first : ph.first }));
  ph.fly = [null, null]; ph.last = [[], []];
  ph.jump = { st: 'off', t: 0, press: [null, null], prev: [false, false] };
  ph.end = null; ph.meadowOn = false;
  st.cam = { x: -60, y: -330 };
  const sx = [150, 210];
  G.players.forEach((p, k) => Object.assign(p, { x: sx[k] - p.w / 2 - st.cam.x, y: -p.h - st.cam.y, vx: 0, vy: 0, face: 1, grounded: true, alive: true }));
  ph.lastPos = [{ x: sx[0], y: 0, plat: ph.plats.head }, { x: sx[1], y: 0, plat: ph.plats.head }];
  ironRivetsSetup(st, K.rivets);
  const s = ironStats(st); Object.assign(s, { erased: s.erased || 0, falls: s.falls || 0 });
  Object.assign(st.tick, { hidden: false, ride: -1, x: 330, y: 0, face: -1, pose: 'gasp', s: 1, mood: 'cross' });
  ph.prep = [];
  for (let l = 0; l < 3; l++) for (let c = 0; c < 2; c++) ph.prep.push(() => IRON_ART.meadow(l, c));
  ph.prep.push(() => IRON_ART.fallBody(0), () => IRON_ART.fallBody(1), () => IRON_ART.fallBody(2), () => IRON_ART.fallBody(3), () => IRON_ART.fallBody(4),
    () => IRON_ART.fallPump(), () => IRON_ART.fallSpring(), () => IRON_ART.fallPost(), () => IRON_ART.fallHands(), () => IRON_ART.fallKey(), () => IRON_ART.fallHome());
  for (const [, x0, x1, , o] of IRONFALL_PLATS) ph.prep.push(() => IRON_ART.fallPlate(x1 - x0, !!o.wall));
}

/* --- the step --- */
function ironFallCtl(p, dt) {
  control(p, dt);
  const st = G.mst, ph = st && st.ph;
  if (ph && p.grounded && p.ground === ph.slide) p.vx = Math.max(p.vx, ironFallGold(st) ? IRONFALL.slide.goldV : IRONFALL.slide.v);
}
function ironFallStep(st, dt) {
  const ph = st.ph, ps = G.players;
  ph.t += dt;
  if (st.idle) { ironCoast(st, dt, ph.solids); ironFallCamera(st, dt); return; }
  if (ph.end) { ironFallEnd(st, dt); return; }
  ironFallEraser(st, dt);
  ironFallCrumble(st, dt);
  ironHandUp(st, dt, { edge: 60 });
  for (const p of ps) {
    if (ph.fly[p.id]) { ironFallFlight(st, p, dt); continue; }
    if (ironHauled(p)) continue;
    ironBody(p, dt, ph.solids, { partner: true, ctl: ironFallCtl });
  }
  ironTrack(st);
  ironFallTickRide(st, dt);
  ironFallLaunch(st, dt);
  ironFallSlideHits(st);
  ironFallWalls(st);
  ironFallFalls(st);
  ironFallKnee(st, dt);
  ironFallCamera(st, dt);
  ironRivetsStep(st, dt);
  ironFallHints(st);
}
function ironFallMiss(st) { if (ironMiss(st, 'fall') >= IRON.goldAfter) ironGoldOnce(st, 'fall', 'Gold help! The edge slows down, the platforms warn you longer, and the slide is cleared.'); }
/* --- the eraser edge --- */
function ironFallEraser(st, dt) {
  const ph = st.ph, K = IRONFALL;
  if (!ph.exOn) return;
  const minX = Math.min(...G.players.filter(p => p.alive).map(p => p.x + p.w / 2));
  let cap = Infinity;
  for (const l of ph.launch) if (l.st !== 'done') { cap = l.ex; break; }
  if (cap === Infinity && ph.jump.st === 'off') cap = 4150;
  if (cap === Infinity) cap = 4250;
  const v = minX - ph.ex > 640 ? K.ex.catchUp : ironFallGold(st) ? K.ex.goldV : K.ex.v;
  if (ph.ex < cap) ph.ex = Math.min(cap, ph.ex + v * dt);
  // the page under the edge is rubbed out: trim what it reached
  for (const r of ph.solids) {
    if (r.ox0 == null) continue;
    if (ph.ex >= r.x1 - 2) { if (!r.off) { r.off = true; if (r.kind === 'plat') r.st = 'gone'; } }
    else if (ph.ex > r.ox0 && r !== ph.slide) r.x0 = ph.ex;
  }
  for (const l of ph.launch) if (l.bridge && ph.ex >= l.bridge.x1) l.bridge.off = true;
  ph.crumbs = (ph.crumbs || 0) + dt;
  if (ph.crumbs > 0.9) { ph.crumbs = 0; if (Math.abs(ph.ex - st.cam.x - 300) < 500) Sfx.play('ironfallEraser'); }
  // overtaken by the edge
  for (const p of G.players) {
    if (!p.alive || st.safe[p.id] > 0 || ph.fly[p.id]) continue;
    if (p.x + p.w / 2 < ph.ex + 6) {
      const to = ironFallSafeSpot(st, p);
      if (ironClang(st, p, { kind: 'erase', word: 'RUB!', to })) { ironStats(st).erased++; ph.ex = Math.max(K.ex.start, ph.ex - K.ex.back); ironFallMiss(st); ironFallRestore(st); }
    }
  }
}
// after the edge backs off, the plates it had only trimmed come back to their full length
function ironFallRestore(st) {
  const ph = st.ph;
  for (const r of ph.solids) if (r.ox0 != null && !r.off) r.x0 = Math.max(r.ox0, ph.ex);
}
// where a hero pops back to: the last platform they stood on that still exists, else beside the partner
function ironFallSafeSpot(st, p) {
  const ph = st.ph, o = G.players[1 - p.id], L = ph.lastPos[p.id];
  if (L && !L.plat.off && L.plat.st !== 'gone' && L.plat.x1 > ph.ex + 60) return { x: clamp(L.x, Math.max(L.plat.x0, ph.ex + 40) + 12, L.plat.x1 - 12), y: L.plat.slope ? ironFallSlideY(clamp(L.x, L.plat.x0, L.plat.x1)) : L.plat.y0 };
  if (o.alive && o.grounded && o.ground && !o.ground.head && !o.ground.slope) return { x: o.x + o.w / 2 - 20, y: o.ground.y0 };
  const r = ph.solids.find(q => q.kind === 'plat' && !q.off && q.st !== 'gone' && q.x1 > ph.ex + 80);
  return r ? { x: Math.max(r.x0, ph.ex + 60) + 10, y: r.y0 } : { x: ph.ex + 100, y: 0 };
}
/* --- crumbling platforms --- */
function ironFallCrumble(st, dt) {
  const ph = st.ph, K = IRONFALL.crumble;
  for (const p of G.players) {
    const g = p.grounded && p.ground;
    if (g && g.kind === 'plat') { g.touched[p.id] = true; ph.lastPos[p.id] = { x: p.x + p.w / 2, plat: g }; }
    else if (g && g === ph.slide) ph.lastPos[p.id] = { x: IRONFALL.slide.top[0], plat: ph.plats.armtop };
  }
  for (const id in ph.plats) {
    const r = ph.plats[id];
    if (!r.crumble) continue;
    // someone is back behind it (a pop-back): it is whole again, so the way on is never lost
    if (r.st !== 'full' && r.x1 > ph.ex + 20 && G.players.some(p => p.alive && p.x + p.w < r.ox0)) { r.st = 'full'; r.off = false; r.t = 0; r.touched = [false, false]; r.x0 = Math.max(r.ox0, ph.ex); continue; }
    if (r.st === 'gone') continue;
    // it crumbles behind the pair: both stood on it and both are past it now
    if (r.st === 'full' && r.touched[0] && r.touched[1] && G.players.every(p => !p.alive || p.x > r.x1)) { r.t += dt; if (r.t > K.full) { r.st = 'faint'; r.t = 0; Sfx.play('ironfallCrumble'); } }
    else if (r.st === 'faint') { r.t += dt; if (r.t > (ironFallGold(st) ? K.goldFaint : K.faint)) { r.st = 'gone'; r.off = true; Sfx.play('ironfallGone'); } }
  }
}
/* --- falls: below the course is a Clang and a pop-back --- */
function ironFallFalls(st) {
  const ph = st.ph;
  for (const p of G.players) {
    if (!p.alive || ph.fly[p.id] || ironHauled(p)) continue;
    const cx = p.x + p.w / 2, feet = p.y + p.h;
    let low = -999;
    for (const r of ph.solids) { if (r.off || r.x1 < cx - 360 || r.x0 > cx + 360) continue; low = Math.max(low, r.slope ? r.yb : r.y0); }
    if (feet > low + 260) {
      const to = ironFallSafeSpot(st, p);
      if (ironClang(st, p, { kind: 'fall', word: 'WHOOPS!', to })) { ironStats(st).falls++; ph.ex = Math.max(IRONFALL.ex.start, ph.ex - IRONFALL.ex.back); ironFallRestore(st); ironFallMiss(st); }
      else if (st.safe[p.id] > 0) { p.x = to.x - p.w / 2; p.y = to.y - p.h; p.vy = 0; }
    }
  }
}
/* --- Tick rides on a head and shouts directions --- */
function ironFallTickRide(st, dt) {
  const ph = st.ph, T = st.tick;
  if (T.ride < 0) {
    T.pose = 'gasp'; T.face = -1;
    for (const p of G.players) if (p.alive && Math.abs(p.x + p.w / 2 - T.x) < 20 && Math.abs(p.y + p.h - T.y) < 30) {
      T.ride = p.id; ph.exOn = true; Sfx.play('ironfallScoop');
      ironSay(st, 'Thank you! Now RUN. It is rubbing us out!', 2.4, { caption: false });
      ironNews(st, 'Follow the gold arrows down to Sunny Meadow!');
    }
    return;
  }
  ph.say -= dt;
  if (ph.say <= 0 && !st.say) { ph.say = 8 + (ph.t * 3.7) % 4; ironSay(st, IRONFALL_TICK_LINES[Math.floor(ph.t * 7.3) % IRONFALL_TICK_LINES.length], 2, { caption: false }); }
}
/* --- the launch plates and the chain bridges --- */
function ironFallLaunch(st, dt) {
  const ph = st.ph;
  for (const l of ph.launch) {
    l.squash = Math.max(0, l.squash - dt * 3);
    if (l.st === 'set') {
      const on = G.players.find(p => p.alive && p.grounded && p.ground === ph.plats[l.from] && Math.abs(p.x + p.w / 2 - (l.plate[0] + l.plate[1]) / 2) < 30);
      const pumper = on && G.players[1 - on.id];
      const stomp = pumper && pumper.grounded && pumper.ground === l.pumpS && !l.pumpWas;
      l.pumpWas = !!(pumper && pumper.grounded && pumper.ground === l.pumpS);
      if (stomp && on && !(st.safe[on.id] > 0 && on.stun > 0)) {
        l.st = 'fly'; l.who = on.id; l.squash = 1;
        ph.fly[on.id] = { x0: on.x + on.w / 2, y0: on.y + on.h, x1: l.land, y1: l.toY, t: 0, T: 1.0, l };
        Sfx.play('ironfallSpring'); ironWord(st, 'BOING!', (l.plate[0] + l.plate[1]) / 2, l.y - 40, 24, { life: 1, rise: 14 });
      }
    } else if (l.st === 'wait') {
      const f = G.players[l.who], tb = ph.plats[l.to];
      // ran on without throwing the chain: the Colossus's arm swings and sets them back by the post
      if (f.alive && f.x > tb.x1 + 30) {
        f.x = l.post + 24 - f.w / 2; f.y = tb.y0 - f.h - 40; f.vx = 0; f.vy = 0; f.grounded = false;
        ironHint(st, f.id, 'Not yet! Throw the chain back first (' + ironKey(f.id, 'act') + ' at the post).');
      }
      if (f.alive && f.grounded && f.ground === tb && Math.abs(f.x + f.w / 2 - l.post) < 40 && f.input.act) {
        l.st = 'bridge';
        const a = ph.plats[l.from], b = ph.plats[l.to];
        l.bridge = { x0: a.x1 - 4, x1: b.ox0 + 4, y0: a.y0, y1: a.y0 + 8, one: true, kind: 'bridge' };
        ph.solids.push(l.bridge);
        Sfx.play('ironfallChain'); ironWord(st, 'CLANK!', (a.x1 + b.ox0) / 2, a.y0 - 30, 20, { life: 0.9, rise: 10 });
        ironNews(st, 'The chain is across! ' + NAMES[1 - l.who] + ': run over it.');
      }
    } else if (l.st === 'bridge') {
      const b = ph.plats[l.to];
      if (G.players.every(p => !p.alive || p.x + p.w / 2 > b.ox0 + 10)) { l.st = 'done'; ironCelebrate(st, 0.3); }
    }
  }
}
// a flight (from a launch plate, or the last jump): a set arc, landing where it should
function ironFallFlight(st, p, dt) {
  const ph = st.ph, f = ph.fly[p.id];
  f.t += dt;
  const k = Math.min(1, f.t / f.T), x = f.x0 + (f.x1 - f.x0) * k, top = Math.min(f.y0, f.y1) - (f.hi || 130);
  const y = (1 - k) * (1 - k) * f.y0 + 2 * (1 - k) * k * (2 * top - (f.y0 + f.y1) / 2) + k * k * f.y1;
  p.x = x - p.w / 2; p.y = y - p.h; p.vx = 0; p.vy = 0; p.grounded = false; p.face = 1;
  if (k >= 1) {
    ph.fly[p.id] = null; p.vy = 0;
    if (f.l) { f.l.st = 'wait'; ironNews(st, NAMES[p.id] + ': throw the chain back! (' + ironKey(p.id, 'act') + ' at the post)'); }
    Sfx.play('land');
  }
}
/* --- the arm slide: loose plates to hop, snapped cables to duck --- */
function ironFallSlideHits(st) {
  const ph = st.ph, S = IRONFALL_SLIDE;
  if (ironFallGold(st)) return;
  for (const p of G.players) {
    if (!p.alive || st.safe[p.id] > 0 || ph.fly[p.id]) continue;
    const cx = p.x + p.w / 2;
    if (cx < S.x0 || cx > S.x1) continue;
    const sy = ironFallSlideY(cx), feet = p.y + p.h;
    for (const b of S.plates) if (Math.abs(cx - b) < 12 && feet > sy - 10) {
      if (ironClang(st, p, { kind: 'plate', word: 'CLONK!', to: { x: IRONFALL.slide.top[0], y: IRONFALL.slide.top[1] } })) { ironStats(st).falls++; ironFallMiss(st); }
    }
    for (const c of S.cables) if (Math.abs(cx - c) < 10 && feet > sy - 34 && !p.crouch) {
      if (ironClang(st, p, { kind: 'cable', word: 'TWANG!', to: { x: IRONFALL.slide.top[0], y: IRONFALL.slide.top[1] } })) { ironStats(st).falls++; ironFallMiss(st); }
    }
  }
}
/* --- the leg's walls: done once both are on top --- */
function ironFallWalls(st) {
  const ph = st.ph;
  for (const w of ph.walls) {
    if (w.done) continue;
    const top = ph.plats[w.plat];
    if (G.players.every(p => p.alive && ((p.grounded && p.ground === top) || p.x + p.w / 2 > top.x1))) { w.done = true; ironCelebrate(st, 0.3); }
  }
}
/* --- the last jump off the knee: "ready... JUMP!", both inside the window --- */
function ironFallKnee(st, dt) {
  const ph = st.ph, K = IRONFALL.jump, J = ph.jump, knee = ph.plats.knee;
  const zone = p => p.alive && p.grounded && p.ground === knee && p.x + p.w / 2 > knee.x1 - 150;
  const both = G.players.every(zone);
  const win = ironFallGold(st) ? K.goldWin : K.win;
  for (const p of G.players) { const j = !!p.input.jump; if (j && !J.prev[p.id] && J.st === 'go') J.press[p.id] = J.t; J.prev[p.id] = j; }
  if (J.st === 'off') { if (both) { J.st = 'ready'; J.t = 0; J.press = [null, null]; Sfx.play('ironfallReady'); } return; }
  J.t += dt;
  if (J.st === 'ready' && J.t >= K.ready) { J.st = 'go'; J.t = 0; Sfx.play('ironfallGo'); }
  else if (J.st === 'go') {
    if (J.press[0] != null && J.press[1] != null) {
      // together! the knee buckles and both fly into the meadow
      ph.end = { t: 0 }; ph.meadowOn = true; Sfx.play('ironfallLeap');
      G.players.forEach((p, i) => { ph.fly[p.id] = { x0: p.x + p.w / 2, y0: p.y + p.h, x1: IRONFALL.endX[i], y1: IRONFALL.meadow, t: 0, T: 1.6, hi: 90 }; });
      ironWord(st, 'JUMP!', knee.x1, knee.y0 - 80, 34, { life: 1.2, rise: 20 });
    } else if (J.t >= win) { J.st = 'rest'; J.t = 0; ironMiss(st, 'fall'); ironFallMiss2(st); ironNews(st, 'Together! Both jump on JUMP.'); }
  } else if (J.st === 'rest' && J.t >= K.rest) { J.st = both ? 'ready' : 'off'; J.t = 0; J.press = [null, null]; }
  if (!both && J.st === 'ready') J.st = 'off';
}
function ironFallMiss2(st) { if (ironMissN(st, 'fall') >= IRON.goldAfter) ironGoldOnce(st, 'fall', 'Gold help! The edge slows down, the platforms warn you longer, and the jump window doubles.'); }
/* --- the ending: the flight, the meadow, the hands and the key thump down, Tick climbs down --- */
function ironFallEnd(st, dt) {
  const ph = st.ph, e = ph.end;
  e.t += dt;
  for (const p of G.players) if (ph.fly[p.id]) ironFallFlight(st, p, dt);
  if (e.t > 1.7) for (const p of G.players) { p.x = clamp(p.x, IRONFALL.endX[0] - 80, IRONFALL.endX[1] + 40); p.y = IRONFALL.meadow - p.h; p.vy = 0; p.grounded = true; }
  ph.ex = Math.min(4900, ph.ex + 900 * dt);
  for (const r of ph.solids) if (r.ox0 != null && ph.ex >= r.x1) r.off = true;
  if (e.t > 2.2 && !e.thump) { e.thump = true; Sfx.play('ironfallThump'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.4); ironWord(st, 'THUMP!', IRONFALL.hands, IRONFALL.meadow - 190, 34, { life: 1.2, rise: 10 }); }
  const T = st.tick;
  if (e.t > 2.8 && T.ride >= 0) { const p = G.players[T.ride]; T.ride = -1; T.x = p.x + p.w / 2 + 18; T.y = IRONFALL.meadow; T.pose = 'idle'; T.face = 1; Sfx.play('ironfallScoop'); }
  if (e.t > 3.4 && T.ride < 0) { T.pose = e.t > 4.4 ? 'gasp' : 'point'; T.face = 1; }
  ironFallCamera(st, dt);
  if (e.t > 5.4 && !st.cut) ironPhaseDone(st, { say: 'It stopped one step from your front door. ...That is a big key.' });
}
// the camera: between the two, right and down
function ironFallCamera(st, dt) {
  const ph = st.ph, ps = G.players.filter(p => p.alive);
  if (!ps.length) return;
  const mx = ps.reduce((a, p) => a + p.x + p.w / 2, 0) / ps.length, my = ps.reduce((a, p) => a + p.y + p.h, 0) / ps.length;
  const tx = ph.end ? IRONFALL.camEnd : clamp(mx - 420, -200, 4700), ty = clamp(my - 320, -330, IRONFALL.meadow - 470);
  st.cam.x += (tx - st.cam.x) * Math.min(1, dt * (ph.end ? 1.6 : 2.6)); st.cam.y += (ty - st.cam.y) * Math.min(1, dt * 2.6);
}

/* --- the plan --- */
function ironFallPlan(st) {
  const ph = st.ph, ps = G.players, out = [{}, {}], T = st.tick;
  if (ph.end) return [{ why: 'end' }, { why: 'end' }];
  if (T.ride < 0) {
    const g = Math.abs(ps[0].x - T.x) <= Math.abs(ps[1].x - T.x) ? 0 : 1;
    out[g] = { why: 'run', x: T.x, say: 'Scoop up Tick: walk into him!' }; out[1 - g] = { why: 'run', x: T.x - 50 };
    return out;
  }
  // a launch plate not yet done, that both have reached the platform of (or are heading to)
  for (const l of ph.launch) {
    if (l.st === 'done') continue;
    const from = ph.plats[l.from], f = l.who, pmp = 1 - f;
    if (l.st === 'set') {
      const onPlate = ps[f].grounded && ps[f].ground === from && Math.abs(ps[f].x + ps[f].w / 2 - (l.plate[0] + l.plate[1]) / 2) < 30;
      out[f] = { why: 'plate', x: (l.plate[0] + l.plate[1]) / 2, say: onPlate ? 'Wait on the spring plate...' : 'Stand on the spring plate!' };
      out[pmp] = { why: onPlate ? 'pump' : 'pumpwait', x: onPlate ? (l.pump[0] + l.pump[1]) / 2 : l.pump[1] + 22, say: onPlate ? 'Jump on the foot pump!' : 'Wait by the foot pump.' };
    } else if (l.st === 'fly') { out[f] = { why: 'end' }; out[pmp] = { why: 'pumpwait', x: l.pump[1] + 30 }; }
    else if (l.st === 'wait') { out[f] = { why: 'throw', x: l.post, hold: 'act', say: 'Throw the chain back! (' + ironKey(f, 'act') + ' at the post)' }; out[pmp] = { why: 'pumpwait', x: from.x1 - 20, say: 'Wait for the chain.' }; }
    else { out[pmp] = { why: 'run', x: l.land + 30, say: 'Run across the chain!' }; out[f] = { why: 'wait', x: l.land + 60 }; }
    out.launch = l;
    return out;
  }
  // a wall of the leg
  const w = ph.walls.find(q => !q.done);
  if (w && ps.every(p => w.x - (p.x + p.w / 2) < 360)) {
    const top = ph.plats[w.plat], climb = w.first, step = 1 - climb, cp = ps[climb], sp = ps[step];
    const on = p => p.grounded && p.ground === top;
    if (!on(cp) && !on(sp)) {
      out[step] = { why: 'step', x: w.x - 12, hold: 'down', say: 'Crouch by the wall: be a step!' };
      out[climb] = { why: 'boost', x: w.x - 20, say: 'Jump off ' + NAMES[step] + '\'s head, onto the wall!' };
    } else {
      const a = on(cp) ? climb : step, b = 1 - a;
      out[a] = { why: 'hand', x: w.x + 10, hold: 'act', say: 'Hold ' + ironKey(a, 'act') + ' at the edge: pull ' + NAMES[b] + ' up!' };
      out[b] = { why: 'wait', x: w.x - 14, say: 'Wait by the wall for a hand up.' };
    }
    out.wall = w;
    return out;
  }
  // the knee
  const knee = ph.plats.knee;
  if (ps.every(p => p.x + p.w / 2 > knee.x0 - 300)) {
    const J = ph.jump;
    for (const id of [0, 1]) out[id] = { why: 'knee', x: knee.x1 - 40 - id * 50, say: J.st === 'go' ? 'JUMP!' : J.st === 'ready' ? 'Ready...' : 'To the edge of the knee: jump together!' };
    return out;
  }
  for (const id of [0, 1]) out[id] = { why: 'run', x: knee.x1 - 60 - id * 40 };
  return out;
}
function ironFallHints(st) {
  const ph = st.ph, P = ironFallPlan(st);
  for (const id of [0, 1]) {
    const s = P[id] && P[id].say;
    if (s && ph['said' + id] !== s) { ph['said' + id] = s; ironHint(st, id, s, { life: 3, cpu: '' }); }
    if (!s) ph['said' + id] = null;
  }
}

/* --- drawing: the meadow at dawn behind, the Colossus in pencil, the eraser edge --- */
function ironFallDrawSky(st) {
  const cx = st.cam.x, cy = st.cam.y;
  SKETCH.paper(ctx, 'dawn');
  const par = [0.06, 0.2, 0.45], vy = [0.04, 0.09, 0.2];
  for (let l = 0; l < 3; l++) {
    const off = cx * par[l], c0 = Math.floor(off / 960), dy = -(cy + 330) * vy[l];
    for (let c = c0; c <= c0 + 1; c++) SKETCH.blit(ctx, IRON_ART.meadow(l, ((c % 2) + 2) % 2), c * 960 - off, dy);
  }
  SKETCH.glow(ctx, 700 - cx * 0.06, 300 - (cy + 330) * 0.04, 520, '255,196,120', 0.3);
}
function ironFallDrawBack(st) {
  const ph = st.ph, cx = st.cam.x;
  // the Colossus's body in pencil behind the course, rubbed out left of the edge
  ctx.save();
  ctx.beginPath(); ctx.rect(ph.ex, -2000, 9000, 6000); ctx.clip();
  for (let k = 0; k < 5; k++) { const x = k * 1000 - 200; if (x > cx + W + 40 || x + 1100 < cx) continue; SKETCH.blit(ctx, IRON_ART.fallBody(k), x, -300); }
  ctx.restore();
}
function ironFallDraw(st) {
  const ph = st.ph, d = SKETCH.live(ctx, 6170, SKETCH.boil()), cx = st.cam.x, gold = ironFallGold(st);
  // the meadow ground at the foot of the leg
  if (cx + W > 4100 && st.cam.y + H > IRONFALL.meadow - 20) {
    const gy = IRONFALL.meadow, g = [[4100, gy + 4], [4500, gy - 2], [4900, gy + 2], [5300, gy - 1], [5800, gy + 1], [5800, gy + 300], [4100, gy + 300]];
    d.shape(g, { fill: IRON_P.green, w: 2, col: SKETCH.INK, corner: 30 });
    for (let x = 4110; x < 5800; x += 26) { d.line(x, gy + 2, x - 3, gy - 8, { w: 1, col: SKETCH.INK, ov: 0 }); if ((x / 26 | 0) % 5 === 0) d.ellipse(x + 6, gy - 9, 2.4, 2.4, { fill: (x / 26 | 0) % 2 ? '#f6ecd4' : IRON_P.core, w: 0.6 }); }
  }
  // the platforms: full pencil, faint (flickering), dotted (gone); trimmed at the edge
  for (const id in ph.plats) {
    const r = ph.plats[id];
    if (r.x1 < cx - 40 || r.ox0 > cx + W + 40) continue;
    const w = r.x1 - r.ox0;
    if (r.st === 'gone' || r.off) {
      if (r.x1 > ph.ex) for (let x = Math.max(r.ox0, ph.ex); x < r.x1; x += 14) d.line(x, r.y0, x + 6, r.y0, { w: 1.2, col: SKETCH.INK, ov: 0 });
      continue;
    }
    const a = r.st === 'faint' ? 0.35 + 0.25 * (Math.floor(ph.t * 10) % 2) : 1;
    ctx.save(); ctx.beginPath(); ctx.rect(Math.max(r.ox0 - 10, ph.ex), r.y0 - 60, w + 20, 400); ctx.clip();
    SKETCH.blit(ctx, IRON_ART.fallPlate(w, r.wall), r.ox0, r.y0, { alpha: a });
    ctx.restore();
    if (r.crumble && r.st === 'full' && r.touched[0] !== r.touched[1]) d.word('?', (r.ox0 + r.x1) / 2, r.y0 + 22, 10, { align: 'center', col: SKETCH.INK, alpha: 0.5 });
  }
  // the arm slide
  const S = IRONFALL_SLIDE;
  if (S.x1 > ph.ex && S.x0 < cx + W + 40 && S.x1 > cx - 40) {
    const x0 = Math.max(S.x0, ph.ex);
    d.stroke([[x0, ironFallSlideY(x0)], [S.x1, S.yb]], { w: 3, col: SKETCH.INK });
    d.stroke([[x0, ironFallSlideY(x0) + 26], [S.x1, S.yb + 26]], { w: 1.6, col: SKETCH.INK, alpha: 0.7 });
    for (let x = Math.ceil(x0 / 40) * 40; x < S.x1; x += 40) d.line(x, ironFallSlideY(x) + 2, x - 8, ironFallSlideY(x) + 24, { w: 0.8, col: SKETCH.INK, ov: 0, alpha: 0.6 });
    if (!gold) {
      for (const b of S.plates) if (b > ph.ex) { const y = ironFallSlideY(b); d.shape([[b - 12, y], [b - 8, y - 12], [b + 10, y - 9], [b + 12, y]], { fill: '#b9b2a4', w: 1.6, col: SKETCH.INK, corner: 30 }); }
      for (const c of S.cables) if (c > ph.ex) {
        const y = ironFallSlideY(c), wob = Math.sin(ph.t * 14 + c) * 4;
        d.stroke([[c - 2, y - 120], [c + wob, y - 60], [c - wob * 0.5, y - 26]], { w: 2.4, col: SKETCH.INK, curve: true });
        d.stroke([[c - wob * 0.5, y - 26], [c + 14, y - 22]], { w: 1.4, col: SKETCH.INK });
        d.word('DUCK', c, y - 132, 10, { align: 'center', col: '#c0703a', w: 1.4 });
      }
    }
  }
  // the launch plates: the pump, the spring, the post, the chain bridge, the flight arc
  for (const l of ph.launch) {
    if (l.pump[1] < cx - 40 || l.pump[0] > cx + W + 200) continue;
    const pc = (l.pump[0] + l.pump[1]) / 2, sc = (l.plate[0] + l.plate[1]) / 2;
    if (l.pump[0] > ph.ex) SKETCH.blit(ctx, IRON_ART.fallPump(), pc, l.y, { sy: 1 - (G.players.some(p => p.ground === l.pumpS) ? 0.25 : 0) });
    if (l.plate[0] > ph.ex) SKETCH.blit(ctx, IRON_ART.fallSpring(), sc, l.y, { sy: 1 + l.squash * 0.6 });
    SKETCH.blit(ctx, IRON_ART.fallPost(), l.post, l.toY);
    if (l.st === 'set' || l.st === 'fly') for (let i = 0; i < 12; i += 2) {
      const k0 = i / 12, k1 = (i + 1) / 12, ax = u => sc + (l.land - sc) * u, ay = u => (1 - u) * (1 - u) * l.y + 2 * (1 - u) * u * (Math.min(l.y, l.toY) * 2 - 260 - (l.y + l.toY) / 2) + u * u * l.toY;
      d.stroke([[ax(k0), ay(k0) - 12], [ax(k1), ay(k1) - 12]], { w: 1.4, col: IRON_P.core, sh: 0, alpha: 0.8 });
    }
    if (l.bridge && !l.bridge.off) {
      const b = l.bridge, x0 = Math.max(b.x0, ph.ex);
      if (x0 < b.x1) IRON_ART.helpers.ironChain(d, [[x0, b.y0 + 3], [(x0 + b.x1) / 2, b.y0 + 10], [b.x1, b.y0 + 3]], { link: 12 });
    }
  }
  // the walls' Boost marks, the gold arrows along the route (always right)
  for (const w of ph.walls) if (!w.done && Math.abs(w.x - cx - 480) < 600) d.word('BOOST', w.x - 30, w.top - 16, 11, { align: 'center', col: IRON_P.core, w: 1.6 });
  const arrows = [[460, 30, 0.35], [890, 150, 0.35], [1260, 120, 0], [1700, 180, 0.5], [2760, 560, 0], [3210, 660, 0.5], [3680, 600, 0.4], [4260, 520, 0.5], [4560, 600, 1.0]];
  for (const [x, y, a] of arrows) {
    if (x < ph.ex || Math.abs(x - cx - 480) > 560) continue;
    const bob = Math.sin(ph.t * 4 + x) * 3;
    ctx.save(); ctx.translate(x, y - 46 + bob); ctx.rotate(a);
    d.shape([[-16, -4], [4, -4], [4, -11], [17, 0], [4, 11], [4, 4], [-16, 4]], { fill: IRON_P.core, w: 1.6, col: SKETCH.INK, corner: 30 });
    ctx.restore();
  }
  // the knee's count
  const J = ph.jump, knee = ph.plats.knee;
  if (J.st === 'ready') d.word('ready' + '...'.slice(0, 1 + Math.floor(J.t * 3)), knee.x1 - 60, knee.y0 - 70, 22, { align: 'center', col: SKETCH.INK, w: 2.2 });
  if (J.st === 'go' && !ph.end) d.word('JUMP!', knee.x1 - 60, knee.y0 - 74, 30 + Math.sin(J.t * 30) * 2, { align: 'center', col: '#c0402a', w: 3 });
  if (IRONFALL.home + 140 > cx && IRONFALL.home - 140 < cx + W) SKETCH.blit(ctx, IRON_ART.fallHome(), IRONFALL.home, IRONFALL.meadow + 2);
  // the end: the hands and the great key thump down in the grass
  if (ph.end) {
    const k = clamp((ph.end.t - 1.6) / 0.6, 0, 1), y = IRONFALL.meadow - (1 - k * k) * 700;
    const k2 = clamp((ph.end.t - 1.9) / 0.5, 0, 1), y2 = IRONFALL.meadow - (1 - k2 * k2) * 800;
    SKETCH.blit(ctx, IRON_ART.fallHands(), IRONFALL.hands, y, { rot: 0.1 });
    SKETCH.blit(ctx, IRON_ART.fallKey(), IRONFALL.key, y2 + 4, { rot: -0.16 });
  }
  ironTickDrawAt(st);
}
function ironFallDrawTop(st) {
  const ph = st.ph, cx = st.cam.x, cy = st.cam.y, d = SKETCH.live(ctx, 6180, SKETCH.boil());
  // the eraser edge: a rubbed-out smear and crumbs, and the big rubber working up and down (it lifts away at the end)
  const ex = ph.ex, fa = ph.end ? Math.max(0, 1 - ph.end.t * 1.4) : 1;
  if (ex > cx - 200 && ex < cx + W + 100 && fa > 0) {
    ctx.save(); ctx.globalAlpha = fa;
    const g = ctx.createLinearGradient(ex - 90, 0, ex + 30, 0);
    g.addColorStop(0, 'rgba(250,240,224,0)'); g.addColorStop(0.7, 'rgba(250,240,224,0.5)'); g.addColorStop(1, 'rgba(250,240,224,0)');
    ctx.fillStyle = g; ctx.fillRect(ex - 90, cy - 20, 120, H + 40);
    ctx.restore();
    // dry rubbing strokes along the edge
    for (let i = 0; i < 7; i++) { const y = cy + ((i * 157 + Math.floor(ph.t * 10) * 61) % 540), x = ex - 30 - (i % 3) * 14; d.stroke([[x, y], [x + 24, y + 30], [x + 4, y + 60]], { w: 1.2, col: '#d9c9b0', alpha: 0.6 * fa, sh: 0, curve: true, p: [0.1, 1, 0.1] }); }
    // crumbs: little rolled pink curls falling away
    for (let i = 0; i < 22; i++) {
      const s = ((i * 97 + ph.t * 40 * (1 + i % 3)) % 300) / 300, x = ex - 8 - (i * 37 % 60), y = cy + ((i * 211) % 520) + s * 120;
      d.stroke([[x, y], [x + 3, y + 1.5], [x + 4, y + 4]], { w: 2.2, col: '#e3959c', alpha: fa * (1 - s * 0.6), sh: 0, curve: true });
    }
    const by = cy + 270 + Math.sin(ph.t * 5) * 140 - (ph.end ? ph.end.t * ph.end.t * 900 : 0);
    ctx.save(); ctx.translate(ex - 30, by); ctx.rotate(-0.25 + Math.sin(ph.t * 10) * 0.04); ctx.globalAlpha = fa;
    const body = [[-42, -58], [32, -62], [38, 52], [26, 66], [-30, 66], [-40, 54]];
    ctx.fillStyle = '#ef9ea4'; ctx.beginPath(); body.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fill();
    d.hatch([[8, -58], [32, -62], [38, 52], [26, 66], [10, 66]], { a: 70, gap: 3.2, w: 0.6, alpha: 0.45, force: true, col: '#a8525a' });
    d.stroke([[-34, 40], [-22, 58], [18, 60]], { w: 1.2, col: '#fff', alpha: 0.5, sh: 0, curve: true });
    d.shape(body, { w: 2.4, col: SKETCH.INK, corner: 30 });
    const sleeve = [[-43, -60], [33, -64], [35, -18], [-41, -14]];
    ctx.fillStyle = '#5f86b5'; ctx.beginPath(); sleeve.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fill();
    d.hatch([[10, -62], [33, -64], [35, -18], [12, -16]], { a: 70, gap: 3, w: 0.6, alpha: 0.5, force: true });
    d.shape(sleeve, { w: 2.2, col: SKETCH.INK, corner: 30 });
    d.word('RUB', -4, -32, 13, { align: 'center', col: '#fbf3df', w: 1.8 });
    ctx.restore();
  }
}

IRON_PHASES.fall = {
  setup(st, L) { ironFallSetup(st, L); },
  wait(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironCoast(st, dt, ph.solids); },
  step(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironFallStep(st, dt); },
  plan(st) { return ironFallPlan(st); },
  busy(st, p) { const ph = st.ph; return !!ph.end || !!(p && ph.fly[p.id]); },
  labels(st) {
    const ph = st && st.ph;
    if (!ph || !ph.launch) return ['throw', 'throw'];
    const P = ironFallPlan(st);
    return [0, 1].map(id => (P[id] && P[id].why === 'hand' ? 'pull' : 'throw'));
  },
  hudText(st) {
    const ph = st.ph, ps = G.players, mx = Math.max(...ps.map(p => p.x + p.w / 2 + st.cam.x));
    if (ph.end) return 'Sunny Meadow!';
    return 'Down to the meadow  ·  ' + Math.max(0, Math.round((4540 - mx) / 45)) + ' m to go';
  },
  drawSky(st) { ironFallDrawSky(st); },
  drawBack(st) { ironFallDrawBack(st); },
  draw(st) { ironFallDraw(st); },
  drawTop(st) { ironFallDrawTop(st); },
  music() { return { song: 'ironfall', amb: 'ironMeadow' }; },
  stat(st) { const s = st.stats.fall; return s ? { label: 'Rubbed out', value: (s.erased || 0) + (s.falls || 0) } : null; },
  leave() { SKETCH.forget('iron:meadow'); SKETCH.forget('iron:fall'); },
};

/* --- sounds --- */
Sfx.extra.ironfallEraser = function () { this.noise(0.5, { type: 'bandpass', f: 1200, to: 900, vol: 0.02, a: 0.1 }); };
Sfx.extra.ironfallCrumble = function () { this.noise(0.3, { type: 'highpass', f: 2500, vol: 0.025 }); this.tone(500, 0.2, 'triangle', 0.015, 300); };
Sfx.extra.ironfallGone = function () { this.noise(0.35, { type: 'bandpass', f: 1600, to: 600, vol: 0.03 }); };
Sfx.extra.ironfallScoop = function () { this.tone(600, 0.08, 'triangle', 0.03, 900); this.tone(900, 0.1, 'triangle', 0.03, 1200, 0.08); };
Sfx.extra.ironfallSpring = function () { this.tone(180, 0.35, 'triangle', 0.06, 720); this.tone(240, 0.3, 'sine', 0.03, 900, 0.03); };
Sfx.extra.ironfallChain = function () { for (let k = 0; k < 5; k++) this.tone(1100 + k * 90, 0.04, 'square', 0.015, null, k * 0.05); };
Sfx.extra.ironfallReady = function () { this.tone(440, 0.15, 'sine', 0.03); this.tone(440, 0.15, 'sine', 0.03, null, 0.5); };
Sfx.extra.ironfallGo = function () { this.tone(660, 0.3, 'sine', 0.04); };
Sfx.extra.ironfallLeap = function () { this.tone(330, 1.2, 'triangle', 0.04, 880); this.noise(1.2, { type: 'lowpass', f: 800, to: 2400, vol: 0.02, a: 0.3 }); };
Sfx.extra.ironfallThump = function () { this.tone(70, 0.6, 'sine', 0.1, 35); this.noise(0.5, { type: 'lowpass', f: 400, to: 100, vol: 0.06 }); };

ironRoom('fall', {
  act: { label: 'throw', labels: ['throw', 'throw'] },
  tip: IRON_PARTS.fall.tip,
});
