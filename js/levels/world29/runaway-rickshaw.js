/* Pip & Bo - Level 29-3 Runaway Rickshaw (team, World 29 Ninja Dojo). */
'use strict';

/* ===== 29-3 Runaway Rickshaw (mode 'rickshaw', World 29 "Ninja Dojo", team, scrolls right and downhill, Gavyn's pick) =====
   Gavyn's pick: "rickshaw flying downhill through a market; one steers, the other on top deflects throwing stars with
   a sword."
   Pip and Bo are delivering dumplings to the dojo feast when the rickshaw's brake rope snaps at the top of Market
   Hill. It races down the sloping street by itself (faster on the steep parts) while rival ninjas on the rooftops and
   on kites throw foam stars at the cargo. Seen from the side; the camera follows the rickshaw down the hill.
   The mode owns the tick, the camera and the picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns.
   All positions are world px: x grows to the right, the street's height is gy(c, x) (y grows down, so downhill).
   The street has two lanes: the far lane (drawn higher) and the near lane (drawn lower).
   THE STEERER (in the seat): ▲ swerves to the far lane, ▼ to the near lane. The action ('hop') bounces the rickshaw
     on its springy wheels. ◀ (held) drags a foot as a soft brake: only about a third slower. Swerve round the tall
     things (melon carts, noodle stalls), hop or swerve the low ones (crates, barrels, hens), take the lane with the
     ramp to fly over a canal, hop the narrow ditches, and keep to the open lane on a narrow bridge. Dumplings on the
     street (and in the air: hop, or fly off a ramp) are picked up by driving through them.
   THE SWORD RIDER (standing on the roof): ◀ points the sword behind, ▶ ahead, ▲ straight up. The action ('swing')
     swings it: a swing lasts 0.3 s, and a star from the side the sword points to that arrives during the swing is
     deflected. A swing in the last 0.14 s before the star arrives is a GREAT deflect: the star flies back and bonks
     its thrower (dizzy, nobody hurt). A swing that hits nothing needs a moment to recover, so mashing fails.
     ▼ (held) ducks under the low lantern gates (a "Duck!" sign stands before each); no swinging while ducked.
     Every thrower warns first: it pops up with a "!" and chevrons flash on the side the star will come from.
   SPILLS (the only "fail", always soft): a star that gets through, a crash, a splash in a canal, or a bonk on a gate
     wobbles the rickshaw and one steamer basket flies off the back ("Whoops!"). A crash or splash also costs about 2 s.
     A star that gets through also knocks a quarter off the speed for a moment. When the last of the 5 baskets on the
     back shelf has gone, the rickshaw stops for 2.2 s while a stall keeper tosses on 5 new ones ("Restock!").
     Spills are counted; the stack is also refilled at every tea stop. There is no game over.
   THE END OF A STRETCH: the rickshaw ploughs softly into a hay cart at a tea stop, the dumplings are counted, and Pip
     and Bo swap jobs. 4 stretches (roomWord 'Stretch'): Market Hill, Lantern Lane, Kite Bridge, The Big Plunge.
     Pip steers 1 and 3, Bo steers 2 and 4 (room def `steer`).
   GOLD HELP (announced with the gold banner, counted on the results card, only while both are playing):
     3 stars get through in one stretch: a gold sword for 15 s (it deflects stars from every side, a longer swing, and
     lantern gates swish past it); 3 crashes, splashes or bridge bonks: gold wheels for 15 s (they bump obstacles aside
     and bounce over canals). The panel shows the seconds left; a message says when it runs out. 3 more misses in the
     same stretch earn it again, so a stuck pair keeps getting help but steering and timing still matter.
   IDLE: 25 s with no person pressing anything: "Taking a break", the rickshaw is held still and the clock stops.
   Scoring: dumplings picked up, spills, stars bonked back. Medal:
     Gold   = time <= 3:40, at least 75% of the dumplings, and at most 6 spills.
     Silver = time <= 5:00, at least 50% of the dumplings, and at most 20 spills.   Otherwise Bronze.
   Room def: { title, steer: 0|1, pace, warn, flight, course: [tokens] }. Course tokens (x advances only with fN):
     fN  street for N px                     sN  the slope becomes N percent from here (blends over about 250 px)
     crate:L  barrel:L  hens:L               a low thing in lane L (f far, n near, b both): hop it or swerve
     cart:L  stall:L                         a tall thing in lane L: swerve
     ramp:L                                  a ramp in lane L (b: both lanes): launches the rickshaw
     canal:W                                 a canal W px wide across the street (wide ones need a ramp just before)
     bridge:LEN:L                            a narrow bridge LEN px long; only lane L is open
     low                                     a low lantern gate (the rider ducks); its "Duck!" sign is added before it
     bao:L:N                                 N dumplings in a row; L = f | n (on the street), a (in the air: hop),
                                             A (a high arc: the path of a ramp jump)
     star:D,D...                             rivals throw when the rickshaw gets here; D = a (ahead) | b (behind) |
                                             k (a kite, from above); several make a volley, one after the other
     S:text                                  a sign       E  the tea stop at the end.
   MODES.rickshaw.plan(st) is the one place that says what to do next (prompts, HUD chips and the computer brain). */
(() => {
  const K = NINJA, FONT = K.FONT, TAU = Math.PI * 2;
  const S = {
    slopeK: 2, acc: 170, dec: 260, brakeK: 0.68, restart: 0.55,
    laneRate: 5.5, laneOff: [-24, 22], laneHit: 0.55,
    hopV: 480, hopG: 1300, rampV: 520, rampG: 1000, front: 34, back: -34,
    stopT: 0.7, dunkT: 1.0, restockT: 2.2, hitSlow: 0.72,
    swingT: 0.3, great: 0.14, grace: 0.08, whiffCd: 0.26, okCd: 0.08, dizzyT: 0.9, volleyGap: 0.6,
    cargo: 5, camLead: 0.3, roadY: 362, Z: 1.12, idleWait: 25, goldHits: 3, goldCrash: 3, goldDur: 15,
    goldT: 220, goldBao: 0.75, goldSpills: 6, silverT: 300, silverBao: 0.5, silverSpills: 20,
  };
  // things on the street: w = width, clear = how high the wheels must be to pass over it
  const OB = {
    crate: { w: 34, clear: 16, low: true, word: 'Crash! Apples everywhere!', name: 'crate' },
    barrel: { w: 30, clear: 18, low: true, word: 'Bonk! Pickles!', name: 'barrel' },
    hens: { w: 40, clear: 14, low: true, word: 'Bawk bawk bawk!', name: 'hens' },
    cart: { w: 72, clear: 130, low: false, word: 'Crash! Melons!', name: 'cart' },
    stall: { w: 64, clear: 130, low: false, word: 'Crash! Noodles!', name: 'stall' },
  };
  const LANE = { f: 0, n: 1, b: 2 };
  const DIRS = { a: { ang: -0.3, word: 'ahead' }, b: { ang: Math.PI + 0.3, word: 'behind' }, k: { ang: -Math.PI / 2, word: 'up' } };

  /* ---------- the course ---------- */
  function compile(def) {
    const steer = def.steer || 0, name = s => s.replace(/\{S\}/g, NAMES[steer]).replace(/\{R\}/g, NAMES[1 - steer]);
    const c = { x0: -700, pace: def.pace || 260, warn: def.warn || 0.9, flight: def.flight || 0.8, obs: [], ramps: [], canals: [], bridges: [], lows: [], baos: [],
      throws: [], signs: [], knots: [{ x: -700, s: 0.05 }], end: null, len: 0, total: 0, stars: 0 };
    let x = 520;
    const vRef = c.pace * 1.02;
    for (const tk of def.course || []) {
      const parts = String(tk).split(':'), k = parts[0];
      if (/^f\d+$/.test(k)) { x += +k.slice(1); continue; }
      if (/^s\d+$/.test(k)) { c.knots.push({ x, s: +k.slice(1) / 100 }); continue; }
      if (OB[k]) { c.obs.push({ x, kind: k, lane: LANE[parts[1]] === undefined ? 1 : LANE[parts[1]], st: 'up', t: 0, hop: false, seed: c.obs.length }); continue; }
      if (k === 'ramp') { c.ramps.push({ x, lane: LANE[parts[1]] === undefined ? 2 : LANE[parts[1]], used: false, need: false }); continue; }
      if (k === 'canal') { const w = +parts[1] || 160, rp = c.ramps[c.ramps.length - 1]; if (rp && x - rp.x < 80) rp.need = true; c.canals.push({ x, w, ramp: !!(rp && x - rp.x < 80), wet: 0 }); continue; }
      if (k === 'bridge') { c.bridges.push({ x, len: +parts[1] || 800, lane: LANE[parts[2]] === 0 ? 0 : 1, hit: false }); continue; }
      if (k === 'low') { c.lows.push({ x, hit: false, passed: false }); c.signs.push({ x: x - 400, text: 'Duck! ▼', warn: true }); continue; }
      if (k === 'bao') {
        const L = parts[1] || 'n', n = +parts[2] || 1;
        for (let i = 0; i < n; i++) {
          if (L === 'A') { const t = (30 + i * 58) / vRef; c.baos.push({ x: x + 30 + i * 58, lane: 2, h: Math.max(30, S.rampV * t - 0.5 * S.rampG * t * t), got: false, arc: true }); }
          else if (L === 'a') c.baos.push({ x: x + i * 50, lane: 2, h: 74, got: false });
          else c.baos.push({ x: x + i * 64, lane: LANE[L] === 0 ? 0 : 1, h: 0, got: false });
        }
        c.total += n; continue;
      }
      if (k === 'star') {
        (parts[1] || 'a').split(',').forEach((d, i) => {
          const dir = DIRS[d] ? d : 'a', trig = x + i * S.volleyGap * c.pace;
          c.throws.push({ dir, trig, x: trig, y: 0, st: 'wait', t: 0, up: 0, seed: c.throws.length });
          c.stars++;
        });
        continue;
      }
      if (k === 'S') { c.signs.push({ x, text: name(String(tk).slice(2)) }); continue; }
      if (k === 'E') { c.end = { x: x + 320, squash: 0 }; x += 1100; continue; }
    }
    c.len = x + 300;
    terrain(c);
    // a rival ahead stands where the rickshaw will be just after its star arrives; one behind is passed while it warns
    for (const th of c.throws) if (th.dir !== 'k') {
      const v = vWant(c, th.trig);
      th.x = th.dir === 'a' ? th.trig + (c.warn + c.flight) * v + 130 : th.trig + c.warn * v * 0.45;
      th.y = gy(c, th.x) - 150;
    }
    return c;
  }
  // slope knots -> a height sample every 16 px (the slope blends from one knot's value to the next), plus little bumps
  function terrain(c) {
    const step = 16, n = Math.ceil((c.len - c.x0) / step) + 3, hs = new Float32Array(n), sl = new Float32Array(n);
    let k = 0, s = c.knots[0].s, y = 0;
    for (let i = 0; i < n; i++) {
      const x = c.x0 + i * step;
      while (k + 1 < c.knots.length && c.knots[k + 1].x <= x) k++;
      s += (c.knots[k].s - s) * 0.07;
      const bump = 2.6 * Math.sin(x / 83) + 1.6 * Math.sin(x / 37 + 1);
      sl[i] = s + 2.6 / 83 * Math.cos(x / 83) + 1.6 / 37 * Math.cos(x / 37 + 1); hs[i] = y + bump; y += s * step;
    }
    c.hs = hs; c.sl = sl; c.step = step;
  }
  const at = (c, a, x) => { const f = clamp((x - c.x0) / c.step, 0, a.length - 1.001), i = Math.floor(f); return a[i] + (a[i + 1] - a[i]) * (f - i); };
  const gy = (c, x) => at(c, c.hs, x);
  const slopeAt = (c, x) => at(c, c.sl, x);
  const laneY = (c, x, ly) => gy(c, x) + K.lerp(S.laneOff[0], S.laneOff[1], ly);
  const vWant = (c, x) => c.pace * (1 + S.slopeK * (slopeAt(c, x) - 0.08));

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.steer = def.steer || 0; st.ride = 1 - st.steer; st.title = def.title || '';
    st.c = compile(def);
    st.rk = { x: 150, v: 0, ly: 1, laneT: 1, hopY: 0, hopV: 0, hopG: S.hopG, air: false, ramp: false, stopT: 0, wob: 0, wobA: 0, wheel: 0, brake: false, dunk: 0, dunkX0: 0, dunkX1: 0, puff: 0, ang: 0 };
    st.rd = { aim: 'a', swing: 0, swingDir: 'a', swingHit: false, cd: 0, duck: false, dizzy: 0, glint: 0 };
    st.stars = []; st.loose = []; st.restock = 0; st.rBao = 0; st.rHits = 0; st.rCrash = 0; st.cargo = S.cargo;
    st.gold = { sword: 0, wheels: 0 }; // gold help: seconds left (0 = none)
    st.state = 'go'; st.endT = 0; st.segStart = G.time; st.said = false; st.rolled = false;
    st.cam = { x: st.rk.x - W * S.camLead, y: gy(st.c, st.rk.x - W * S.camLead + W * 0.5) - S.roadY };
    K.fx(st);
    actLabels(st);
    mirror(st);
  }
  function actLabels(st) { const w = []; w[st.steer] = 'hop'; w[st.ride] = 'swing'; K.actLabels(w, 'hop/swing'); }
  // where the rickshaw's wheels touch (world px) and how it tilts
  const baseY = st => laneY(st.c, st.rk.x, st.rk.ly) - st.rk.hopY + (st.rk.dunk > 0 ? 16 + Math.sin(G.clock * 9) * 4 : 0);
  // a point of the rickshaw (local px: x forward, y up is negative) in world px
  const loc = (st, lx, ly) => { const a = st.rk.ang, cs = Math.cos(a) * S.Z, sn = Math.sin(a) * S.Z; return { x: st.rk.x + lx * cs - ly * sn, y: baseY(st) + lx * sn + ly * cs }; };
  const riderPt = st => loc(st, -6, st.rd.duck ? -116 : -121);

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    if (!live) for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (live) { steerer(st, dt); rider(st, dt); goldTick(st, dt); }
    move(st, dt, live);
    if (st.state === 'go') {
      if (live) { hazards(st); pickups(st); throwers(st, dt); stars(st, dt); }
      if (st.c.end && st.rk.x >= st.c.end.x - 330) toEnd(st);
    } else { endStep(st, dt); stars(st, dt); }
    loose(st, dt);
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  // gold help runs out after S.goldDur seconds of riding (it can be earned again with 3 more stars or crashes)
  function goldTick(st, dt) {
    for (const k of ['sword', 'wheels']) if (st.gold[k] > 0) {
      st.gold[k] = Math.max(0, st.gold[k] - dt);
      if (st.gold[k] === 0) K.msg(st, k === 'sword' ? 'The gold sword is back to plain wood. You can do it!' : 'Gold wheels used up. Steady steering!', '#ffe7a8', 3);
    }
  }
  const upKey = i => !!(i.up || i.jump);
  function steerer(st, dt) {
    const p = G.players[st.steer], i = p.input, rk = st.rk;
    const hop = p.pendingAct;
    p.pendingJump = false; p.pendingAct = false;
    const up = upKey(i), dn = !!i.down;
    if (up && !dn) rk.laneT = 0; else if (dn && !up) rk.laneT = 1;
    rk.brake = !!i.left;
    if (hop && !rk.air && rk.stopT <= 0 && rk.dunk <= 0) {
      rk.air = true; rk.ramp = false; rk.hopV = S.hopV; rk.hopG = S.hopG; st.stats.hops++;
      Sfx.play('rickshawHop', st.steer ? 0.85 : 1);
      K.dust(st, rk.x - 10, baseY(st), 'rgba(200,196,230,0.7)', 4);
    }
  }
  function rider(st, dt) {
    const p = G.players[st.ride], i = p.input, rd = st.rd;
    p.pendingJump = false;
    if (rd.cd > 0) rd.cd -= dt;
    if (rd.glint > 0) rd.glint -= dt * 3;
    if (rd.swing > 0) { rd.swing -= dt; if (rd.swing <= 0 && !rd.swingHit) rd.cd = S.whiffCd; }
    if (rd.dizzy > 0) { rd.dizzy -= dt; p.pendingAct = false; rd.duck = false; return; }
    rd.duck = !!i.down;
    if (rd.swing <= 0) {
      if (upKey(i)) rd.aim = 'k';
      else if (i.right && !i.left) rd.aim = 'a';
      else if (i.left && !i.right) rd.aim = 'b';
    }
    if (p.pendingAct) {
      p.pendingAct = false;
      if (!rd.duck && rd.swing <= 0 && rd.cd <= 0) {
        rd.swing = st.gold.sword ? S.swingT * 1.4 : S.swingT; rd.swingMax = rd.swing; rd.swingDir = rd.aim; rd.swingHit = false; st.stats.swings++;
        Sfx.play('ninjaWhoosh', st.ride ? 0.9 : 1.1);
      }
    }
  }
  function move(st, dt, live) {
    const rk = st.rk, c = st.c, x0 = rk.x;
    if (rk.dunk > 0) {
      // bobbing across the canal to the far bank
      rk.dunk -= dt;
      rk.x = K.lerp(rk.dunkX1, rk.dunkX0, clamp(rk.dunk / S.dunkT, 0, 1));
      rk.v = 0;
      if (rk.dunk <= 0) { rk.v = c.pace * S.restart; K.dust(st, rk.x, baseY(st), 'rgba(160,200,255,0.8)', 8); }
    } else if (st.state === 'go') {
      if (!live) rk.v = approach(rk.v, 0, 500 * dt);
      else if (rk.stopT > 0) { rk.stopT -= dt; rk.v = approach(rk.v, 0, 1400 * dt); if (rk.stopT <= 0) rk.v = c.pace * S.restart; }
      else {
        const want = vWant(c, rk.x) * (rk.brake && !rk.air ? S.brakeK : 1);
        rk.v = approach(rk.v, want, (rk.v < want ? S.acc : S.dec) * dt);
        if (!st.rolled && rk.v > 40) { st.rolled = true; K.pop(st, rk.x + 30, baseY(st) - 150, 'No brakes! Hold on!', '#ffffff', 22); Sfx.play('rickshawRoll'); }
      }
      rk.x += rk.v * dt;
    } else rk.x += rk.v * dt;
    // a narrow bridge keeps the rickshaw in its open lane
    const br = bridgeAt(c, rk.x + S.front);
    if (br) rk.laneT = br.lane;
    rk.ly = approach(rk.ly, rk.laneT, S.laneRate * dt);
    if (rk.air) {
      rk.hopY += rk.hopV * dt; rk.hopV -= rk.hopG * dt;
      if (rk.hopY <= 0) {
        rk.hopY = 0; rk.hopV = 0; rk.air = false; rk.wob = Math.max(rk.wob, rk.ramp ? 0.6 : 0.25);
        Sfx.play('rickshawLand', rk.ramp ? 0.8 : 1);
        K.dust(st, rk.x - 16, baseY(st), 'rgba(200,196,230,0.7)', rk.ramp ? 9 : 4);
        rk.ramp = false;
      }
    }
    rk.wheel += (rk.x - x0) / 24;
    if (rk.wob > 0) { rk.wob = Math.max(0, rk.wob - dt * 1.4); rk.wobA += dt * 22; }
    const tilt = Math.atan(slopeAt(c, rk.x)) * (rk.air ? 0.5 : 1) + (rk.air ? clamp(-rk.hopV / 2600, -0.22, 0.22) : 0);
    rk.ang += (tilt + Math.sin(rk.wobA) * rk.wob * 0.13 - rk.ang) * Math.min(1, dt * 14);
    // dust from the wheels, sparks from the dragging foot
    rk.puff -= dt * (0.4 + Math.abs(rk.v) / 160);
    if (rk.puff <= 0 && !rk.air && rk.dunk <= 0 && rk.v > 30) {
      rk.puff = 0.22;
      K.part(st, rk.x - 30, baseY(st) - 3, -40 - rk.v * 0.15, -18 - Math.random() * 22, 0.7, 'rgba(200,196,230,0.55)', 4, -20, 'dust');
      if (rk.brake) K.part(st, rk.x + 8, baseY(st) - 2, -60 - Math.random() * 60, -60 - Math.random() * 60, 0.35, '#ffd9a0', 2.5, 500, 'dot');
    }
  }
  const bridgeAt = (c, x) => c.bridges.find(b => x > b.x && x < b.x + b.len) || null;

  /* ---------- crashes, canals, ramps, gates ---------- */
  function hazards(st) {
    const rk = st.rk, c = st.c;
    if (rk.dunk > 0) return;
    const front = rk.x + S.front, back = rk.x + S.back;
    for (const o of c.obs) {
      if (o.st !== 'up') { o.t += DT; continue; }
      const ob = OB[o.kind], hw = ob.w / 2;
      if (o.x - hw > front + 20) break;
      if (back > o.x + hw) {
        // passed: a hop over it gets a cheer, hens always flutter off
        if (o.hop) { st.stats.hopped++; K.pop(st, o.x, gy(c, o.x) - 96, 'Boing! Over it!', '#d9ffd0', 16); }
        o.st = o.kind === 'hens' && (o.hop || Math.abs(rk.ly - o.lane) < 0.9 || o.lane === 2) ? 'flee' : 'passed'; o.t = 0;
        if (o.st === 'flee') Sfx.play('rickshawCluck');
        continue;
      }
      if (front < o.x - hw) continue;
      if (!(o.lane === 2 || Math.abs(rk.ly - o.lane) < S.laneHit)) continue;
      if (rk.hopY > ob.clear) { o.hop = true; continue; }
      o.st = o.kind === 'hens' ? 'flee' : 'hit'; o.t = 0;
      if (o.kind === 'hens') Sfx.play('rickshawCluck');
      if (st.gold.wheels) { K.pop(st, o.x, gy(c, o.x) - 100, 'Gold wheels!', C.gold, 18); K.spark(st, o.x, gy(c, o.x) - 20, 6); continue; }
      crash(st, o.x, gy(c, o.x) - 110, ob.word, true);
      for (let n = 0; n < 9; n++) K.part(st, o.x, laneY(c, o.x, rk.ly) - 20, (Math.random() - 0.3) * 260, -100 - Math.random() * 180, 0.9, ['#ff8a5a', '#9fd67a', '#ffd0d8', '#f2e6c8'][n % 4], 4.5, 620, 'dot');
      K.hint(st, st.steer, ob.low ? 'Hop ' + K.key(st.steer, 'act') + ' over the low things, or swerve!' : 'Swerve ' + K.key(st.steer, 'up') + ' ' + K.key(st.steer, 'down') + ' round the ' + ob.name + 's!', 3);
    }
    // ramps
    for (const rp of c.ramps) {
      if (rp.used || rk.air || rk.x < rp.x - 12 || rk.x > rp.x + 26) continue;
      if (!(rp.lane === 2 || Math.abs(rk.ly - rp.lane) < S.laneHit)) continue;
      rp.used = true; rk.air = true; rk.ramp = true; rk.hopV = S.rampV; rk.hopG = S.rampG; rk.v = Math.max(rk.v, c.pace * 0.92); st.stats.jumps++;
      Sfx.play('rickshawRamp');
      K.pop(st, rk.x + 40, baseY(st) - 150, 'Wheeee!', '#ffffff', 26);
      K.dust(st, rp.x, baseY(st), 'rgba(200,196,230,0.8)', 8);
    }
    // canals and ditches
    for (const cn of c.canals) {
      if (rk.x < cn.x + 14 || rk.x > cn.x + cn.w - 14 || rk.air) continue;
      if (st.gold.wheels) { rk.air = true; rk.ramp = false; rk.hopV = S.hopV; rk.hopG = S.hopG; K.pop(st, rk.x, baseY(st) - 120, 'Gold wheels! Boing!', C.gold, 18); Sfx.play('rickshawHop', 1.2); continue; }
      rk.dunk = S.dunkT; rk.dunkX0 = rk.x; rk.dunkX1 = cn.x + cn.w + 46; cn.wet = 1; st.stats.splashes++;
      Sfx.play('rickshawSplash');
      for (let n = 0; n < 14; n++) K.part(st, rk.x + (Math.random() - 0.5) * 60, baseY(st), (Math.random() - 0.5) * 240, -160 - Math.random() * 220, 0.8, n % 2 ? '#9fd0ff' : '#ffffff', 4, 700, 'dot');
      crash(st, rk.x, baseY(st) - 130, cn.ramp ? 'Sploosh! Take the ramp!' : 'Sploosh!', false);
      K.hint(st, st.steer, cn.ramp ? 'Steer onto the ramp to fly over the canal!' : 'Hop ' + K.key(st.steer, 'act') + ' over the ditches!', 3);
    }
    // a narrow bridge: the wrong lane bumps the rail post and is shoved over
    for (const b of c.bridges) {
      if (b.hit || front < b.x || front > b.x + 60) continue;
      b.hit = true;
      if (Math.abs(rk.ly - b.lane) < 0.5 || rk.air) continue;
      rk.ly = b.lane; rk.laneT = b.lane;
      if (st.gold.wheels) { K.pop(st, b.x, gy(c, b.x) - 110, 'Gold wheels!', C.gold, 18); continue; }
      crash(st, b.x, gy(c, b.x) - 120, 'Bonk! The bridge is narrow!', true);
      K.hint(st, st.steer, 'Narrow bridge: get into the open lane first!', 3);
    }
    // low lantern gates: the rider ducks
    const rx = rk.x - 6, rd = st.rd;
    for (const lw of c.lows) {
      if (lw.passed || rx < lw.x - 6) continue;
      lw.passed = true;
      if (rd.duck || rk.dunk > 0) { st.stats.ducked++; K.pop(st, lw.x, gy(c, lw.x) - 190, 'Phew!', '#d9ffd0', 16); continue; }
      if (st.gold.sword) { K.pop(st, lw.x, gy(c, lw.x) - 190, 'Gold sword! Swish!', C.gold, 16); continue; }
      lw.hit = true; rd.dizzy = S.dizzyT; rd.swing = 0; st.stats.gates++;
      Sfx.play('ninjaDizzy');
      spill(st, lw.x, gy(c, lw.x) - 190, 'Bonk! Whoops!');
      K.hint(st, st.ride, 'Hold ' + K.key(st.ride, 'down') + ' to duck under the lantern gates!', 3);
    }
  }
  function crash(st, x, y, word, stop) {
    const rk = st.rk;
    st.stats.crashes++; st.rCrash++;
    if (stop) { rk.v = 0; rk.stopT = S.stopT; }
    Sfx.play('rickshawCrash');
    spill(st, x, y, word);
    if (st.rCrash >= S.goldCrash && !st.gold.wheels && K.both(st)) {
      st.gold.wheels = S.goldDur; st.rCrash = 0;
      K.goldHelp(st, 'Gold wheels for ' + S.goldDur + ' s! They bump things aside and bounce over canals');
    }
  }
  // the one soft fail: a wobble and a steamer basket flies off the back
  function spill(st, x, y, word) {
    const rk = st.rk;
    st.stats.spills++;
    rk.wob = 1;
    G.shake = reduceMotion ? 0 : 0.05;
    rumble(0, 0.2, 0.4, 150); rumble(1, 0.2, 0.4, 150);
    K.pop(st, x, y, word, '#ffe7a8', 20);
    Sfx.play('rickshawSpill');
    const q = loc(st, -50, -44 - Math.max(0, st.cargo - 1) * 10);
    if (st.cargo > 0 && st.restock <= 0) {
      st.cargo--;
      if (st.cargo === 0 && st.state === 'go') {
        // the shelf is empty: a quick stop while a stall keeper tosses on new baskets
        st.restock = S.restockT; st.stats.restocks++;
        rk.stopT = Math.max(rk.stopT, S.restockT); rk.v = 0;
        K.pop(st, rk.x, baseY(st) - 190, 'All spilled! Restock!', '#ffe7a8', 22);
      }
    }
    st.loose.push({ x: q.x, y: q.y, vx: rk.v * 0.4 - 80 - Math.random() * 60, vy: -260 - Math.random() * 80, rot: 0, t: 0, ground: laneY(st.c, rk.x, rk.ly) });
    for (let n = 0; n < 3; n++) K.part(st, q.x, q.y, -40 - Math.random() * 90, -160 - Math.random() * 120, 0.8, '#ffffff', 5, 600, 'dot');
  }
  function loose(st, dt) {
    for (const b of st.loose) {
      b.t += dt; b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 9;
      if (b.y > b.ground - 6 && b.vy > 0) { b.y = b.ground - 6; b.vy *= -0.35; b.vx *= 0.5; if (Math.abs(b.vy) < 40) b.vy = 0; }
    }
    st.loose = st.loose.filter(b => b.t < 2.2);
    if (st.restock > 0) {
      st.restock -= dt;
      const n = Math.min(S.cargo, Math.floor((1 - st.restock / S.restockT) * (S.cargo + 0.6)));
      if (n > st.cargo) { st.cargo = n; Sfx.play('rickshawBao', 0.6 + n * 0.08); }
      if (st.restock <= 0) { st.cargo = S.cargo; K.pop(st, st.rk.x, baseY(st) - 190, 'Go go go!', '#d9ffd0', 22); }
    }
  }
  function pickups(st) {
    const rk = st.rk;
    if (rk.dunk > 0) return;
    for (const b of st.c.baos) {
      if (b.got || Math.abs(b.x - rk.x) > 46) continue;
      if (b.h > 0 ? Math.abs(rk.hopY - b.h) > (b.arc ? 62 : 52) : (rk.hopY > 44 || Math.abs(rk.ly - b.lane) > 0.62)) continue;
      b.got = true; st.bao++; st.rBao++; st.stats.bao++;
      Sfx.play('rickshawBao', 1 + (st.rBao % 5) * 0.06);
      K.spark(st, b.x, laneY(st.c, b.x, b.lane === 2 ? rk.ly : b.lane) - 16 - b.h, 4, ['#ffffff', '#ffe7c8']);
    }
  }

  /* ---------- rival ninjas and their foam stars ---------- */
  function throwers(st, dt) {
    const rk = st.rk, c = st.c;
    for (const th of c.throws) {
      if (th.st === 'wait') {
        if (th.dir !== 'k' && rk.x > th.trig - 420) th.up = Math.min(1, th.up + dt * 3);
        if (rk.x >= th.trig) { th.st = 'warn'; th.t = 0; Sfx.play('ninjaAlert'); st.stats.thrown++; }
      } else if (th.st === 'warn') {
        th.t += dt; th.up = Math.min(1, th.up + dt * 5);
        if (th.t >= c.warn) {
          th.st = 'thrown'; th.t = 0;
          st.stars.push({ dir: th.dir, th, x0: th.x + (th.dir === 'a' ? -14 : th.dir === 'b' ? 14 : 0), y0: th.y - (th.dir === 'k' ? -8 : 30), x: th.x, y: th.y - 30, t: 0, T: c.flight, st: 'fly', rot: 0, arc: th.dir === 'k' ? 0 : 44, vx: 0, vy: 0 });
          Sfx.play('ninjaWhoosh', 0.8);
        }
      } else th.t += dt;
      if (th.dir === 'k') {
        // a kite ninja drifts in over the rickshaw, drops its star, and sails off behind
        const rel = th.st === 'warn' ? K.lerp(520, 30, K.smooth(th.t / (c.warn * 0.75))) : th.st === 'thrown' ? 30 - Math.max(0, th.t - 0.5) * 260 : th.st === 'dizzy' ? th.rel - th.t * 200 : 600;
        if (th.st !== 'dizzy') th.rel = rel;
        // it hangs well clear of the rider's head (its ninja's feet about 80 px over the rider), below the HUD pills
        const top = Math.min(gy(c, rk.x) - 252, laneY(c, rk.x, rk.ly) - 135 * S.Z - 80);
        th.x = rk.x + rel; th.y = Math.max(top, st.cam.y + 104) + Math.sin(G.clock * 2.4 + th.seed) * 7 - (th.st === 'dizzy' ? th.t * 60 : 0);
      }
    }
  }
  function stars(st, dt) {
    const rd = st.rd, tp = riderPt(st);
    for (const s of st.stars) {
      s.t += dt; s.rot += dt * 15;
      if (s.st === 'fly') {
        if (s.dir === 'k') { s.x0 = s.th.x; s.y0 = s.th.y + 8; }
        const u = Math.min(1, s.t / s.T);
        s.x = K.lerp(s.x0, tp.x, u); s.y = K.lerp(s.y0, tp.y, u) - Math.sin(Math.PI * u) * s.arc;
        if (u >= 1) {
          // a star that reaches the rider waits a blink (S.grace) for a swing that is just a little late
          s.late = (s.late === undefined ? -dt : s.late) + dt;
          if (s.late >= S.grace || st.state !== 'go' || deflect(st, s, s.late > 0)) arrive(st, s);
        }
      } else if (s.st === 'back') {
        const u = Math.min(1, s.t / 0.3);
        s.x = K.lerp(s.bx, s.th.x, u); s.y = K.lerp(s.by, s.th.y - 22, u) - Math.sin(Math.PI * u) * 20;
        if (u >= 1) {
          s.st = 'gone'; s.th.st = 'dizzy'; s.th.t = 0;
          Sfx.play('ninjaBonk'); Sfx.play('ninjaDizzy');
          K.pop(st, s.th.x, s.th.y - 84, 'Bonk!', '#ffffff', 22);
          K.spark(st, s.th.x, s.th.y - 26, 8, ['#ffffff', '#ffe7a8']);
        }
      } else if (s.st === 'off') {
        s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.t > 1) s.st = 'gone';
      }
    }
    st.stars = st.stars.filter(s => s.st !== 'gone');
  }
  // a swing that meets the star: true when it was deflected (late: the swing came just after the star arrived)
  function deflect(st, s, late) {
    const rd = st.rd, rk = st.rk;
    if (rd.swing > 0 && !rd.duck && rd.dizzy <= 0 && (rd.swingDir === s.dir || st.gold.sword)) {
      const since = rd.swingMax - rd.swing, great = !late && since <= S.great;
      rd.swingHit = true; rd.swing = Math.min(rd.swing, 0.1); rd.cd = S.okCd; rd.glint = 1;
      if (st.gold.sword) rd.swingDir = s.dir;
      st.stats.deflects++;
      Sfx.play('ninjaShing', great ? 1.15 : 0.9);
      K.spark(st, s.x, s.y, great ? 9 : 5, ['#ffffff', '#cfe0ff']);
      s.t = 0;
      if (great) { s.st = 'back'; s.bx = s.x; s.by = s.y; st.stats.greats++; K.pop(st, s.x, s.y - 34, 'Great!', '#d9ffd0', 20); }
      else { s.st = 'off'; s.vx = (s.dir === 'b' ? -1 : 1) * (120 + Math.random() * 120) + rk.v; s.vy = -420; K.pop(st, s.x, s.y - 40, 'Clink!', '#ffffff', 18); }
      return true;
    }
    return false;
  }
  function arrive(st, s) {
    const rd = st.rd, rk = st.rk;
    if (s.st !== 'fly') return;
    if (st.state !== 'go') { s.st = 'gone'; K.poof(st, s.x, s.y, 5); return; }
    // it got through: a soft bonk on the cargo
    s.st = 'off'; s.t = 0; s.vx = rk.v * 0.5 - 60; s.vy = -260;
    st.stats.hits++; st.rHits++;
    if (!rk.air) rk.v *= S.hitSlow;
    Sfx.play('ninjaBonk', 0.9);
    spill(st, s.x, s.y - 40, 'Bonk! Whoops!');
    if (rd.swing <= 0 && rd.aim !== s.dir && !rd.duck) K.hint(st, st.ride, 'Point the sword ' + DIRS[s.dir].word + ' ' + aimKey(st.ride, s.dir) + ' first, then swing ' + K.key(st.ride, 'act'), 3.2);
    else K.hintOnce(st, 'time', st.ride, 'Swing ' + K.key(st.ride, 'act') + ' just as the star arrives!', 3);
    if (st.rHits >= S.goldHits && !st.gold.sword && K.both(st)) {
      st.gold.sword = S.goldDur; st.rHits = 0;
      K.goldHelp(st, 'Gold sword for ' + S.goldDur + ' s! It swats stars from every side');
    }
  }
  const aimKey = (id, d) => K.key(id, d === 'a' ? 'right' : d === 'b' ? 'left' : 'up');

  /* ---------- the tea stop ---------- */
  function toEnd(st) {
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last;
    st.stats.roomT[st.k] = G.time - st.segStart;
    st.rd.duck = false; st.rd.dizzy = 0; st.rd.swing = 0; st.rk.brake = false;
    for (const th of st.c.throws) if (th.st === 'warn') th.st = 'wait';
    Sfx.play('rickshawArrive');
  }
  function endStep(st, dt) {
    const rk = st.rk, c = st.c, park = c.end.x - 78;
    st.endT += dt;
    if (rk.x < park) rk.v = Math.max(60, Math.min(rk.v, (park - rk.x) * 3 + 40));
    else if (!st.said) {
      rk.x = park; rk.v = 0; st.said = true; rk.wob = 0.8; c.end.squash = 1;
      Sfx.play('ninjaPoof'); Sfx.play('ninjaCheer');
      K.poof(st, c.end.x - 20, laneY(c, c.end.x, rk.ly) - 40, 14);
      for (let n = 0; n < 12; n++) K.part(st, c.end.x - 10, laneY(c, c.end.x, rk.ly) - 50, (Math.random() - 0.5) * 300, -120 - Math.random() * 240, 1.1, '#e8c860', 3.5, 500, 'leaf');
      K.pop(st, c.end.x - 40, gy(c, c.end.x) - 210, (st.lastRoom ? 'Delivered! ' : 'Tea stop! ') + st.rBao + (st.rBao === 1 ? ' dumpling' : ' dumplings'), '#ffffff', 26);
      K.confetti(st, c.end.x - 40, gy(c, c.end.x) - 170, st.lastRoom ? 44 : 24);
      st.endT = 0;
    } else { rk.v = 0; rk.x = park; }
    c.end.squash = Math.max(0, c.end.squash - dt * 1.6);
    if (!st.said) return;
    if (st.lastRoom) {
      if (st.endT > 2.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: c.end.x - st.cam.x, y: gy(c, c.end.x) - st.cam.y - 180 }; levelClear(); }
    } else if (st.endT > 2.6) nextRoom();
  }

  /* ---------- what to do next ---------- */
  function plan(st) {
    const rk = st.rk, c = st.c, rd = st.rd, v = Math.max(120, rk.v), x = rk.x, front = x + S.front;
    const out = { lane: rk.laneT, hop: false, hopSoon: false, sWhy: '', what: '', aim: rd.aim, swing: false, duck: false, lowSoon: false, rWhy: '', star: null, tta: 9, warn: null };
    // ---- the steerer: score the two lanes over the road ahead
    const look = Math.max(420, v * 1.55), score = [0, 0];
    let why = ['', ''];
    const block = (L, d, w, word) => { const s = w / (1 + d / 160); score[L] -= s; if (s > 30 && !why[L]) why[L] = word; };
    const br = c.bridges.find(b => front > b.x - look && x < b.x + b.len);
    if (br) { block(1 - br.lane, Math.max(0, br.x - front), 6000, 'bridge'); out.bridge = br; }
    for (const o of c.obs) {
      if (o.st !== 'up') continue;
      const ob = OB[o.kind], d = o.x - ob.w / 2 - front;
      if (d > look) break;
      if (o.x + ob.w / 2 < x + S.back) continue;
      for (const L of o.lane === 2 ? [0, 1] : [o.lane]) block(L, Math.max(0, d), ob.low ? 40 : 1000, ob.low ? 'low' : ob.name);
    }
    for (const rp of c.ramps) if (rp.need && !rp.used && rp.lane !== 2 && rp.x > x - 10 && rp.x - x < look * 1.3) { block(1 - rp.lane, Math.max(0, rp.x - x), 3000, 'ramp'); out.ramp = rp; }
    for (const b of c.baos) if (!b.got && b.h === 0 && b.x > x - 20 && b.x - x < look) score[b.lane] += 7;
    score[rk.laneT] += 5;
    out.lane = score[0] === score[1] ? rk.laneT : score[0] > score[1] ? 0 : 1;
    if (out.lane !== rk.laneT) { out.sWhy = 'swerve'; out.what = why[rk.laneT] || 'bao'; }
    // hops: the next low thing that will be in our way, a ditch, or dumplings in the air
    if (!rk.air && rk.dunk <= 0 && rk.stopT <= 0) {
      for (const o of c.obs) {
        if (o.st !== 'up' || !OB[o.kind].low) continue;
        const hw = OB[o.kind].w / 2, d = o.x - hw - front;
        if (d > look) break;
        if (d < -hw * 2 - 60) continue;
        const lyThen = approach(rk.ly, out.lane, S.laneRate * Math.max(0, d) / v);
        if (!(o.lane === 2 || Math.abs(lyThen - o.lane) < S.laneHit + 0.05)) continue;
        if (d < v * 0.9) { out.hopSoon = true; out.sWhy = out.sWhy || 'hop'; out.what = out.what || 'low'; }
        if (d <= v * 0.05 + 2 && d > -hw) out.hop = true;
        break;
      }
      for (const cn of c.canals) {
        if (cn.ramp || cn.x + cn.w < x) continue;
        const d = cn.x - x;
        if (d > look) break;
        if (d < v * 0.9) { out.hopSoon = true; out.sWhy = out.sWhy || 'hop'; out.what = 'ditch'; }
        if (d <= v * 0.03 + 8 && d > -10) out.hop = true;
        break;
      }
      if (!out.hopSoon) for (const b of c.baos) {
        if (b.got || b.arc || b.h === 0 || b.x < x) continue;
        const d = b.x - x;
        if (d > look) break;
        if (d < v * 0.8) { out.sWhy = out.sWhy || 'hopbao'; }
        if (d <= v * 0.34 && d > v * 0.2) out.hop = true;
        break;
      }
    }
    // ---- the sword rider: gates first, then the star that arrives soonest, then the next warning
    const rx = x - 6;
    let lowEta = 9;
    for (const lw of c.lows) if (!lw.passed) {
      const d = lw.x - rx;
      if (d < 520) out.lowSoon = true;
      if (d < v * 0.5 + 16) { out.duck = true; out.rWhy = 'duck'; lowEta = d / v; }
      break;
    }
    for (const s of st.stars) if (s.st === 'fly') { const tta = s.T - s.t; if (tta < out.tta) { out.tta = tta; out.star = s; } }
    if (!out.star) for (const th of c.throws) if (th.st === 'warn') { const eta = c.warn - th.t + c.flight; if (eta < out.tta) { out.tta = eta; out.warn = th; } }
    const dir = out.star ? out.star.dir : out.warn ? out.warn.dir : null;
    if (dir) {
      out.dir = dir;
      if (!st.gold.sword) out.aim = dir;
      const aimed = st.gold.sword || rd.aim === dir;
      // a star that arrives before the gate does comes first: stand up, swing, then duck
      if (out.duck && out.star && out.tta < 0.32 && lowEta > out.tta + 0.04) out.duck = false;
      if (!out.duck) out.rWhy = aimed ? (out.star ? 'swing' : 'ready') : 'aim';
      if (out.star && aimed && !out.duck && out.tta <= 0.09 && rd.swing <= 0 && rd.cd <= 0 && rd.dizzy <= 0) out.swing = true;
    }
    return out;
  }

  /* ---------- camera and mirror ---------- */
  function cam(st, dt) {
    const rk = st.rk, c = st.c;
    let tx = rk.x - W * S.camLead + clamp(rk.v * 0.12, 0, 60);
    if (st.state === 'end') tx = c.end.x - W * 0.52;
    tx = clamp(tx, c.x0, c.len - W);
    st.cam.x += (tx - st.cam.x) * Math.min(1, dt * 3.2);
    if (rk.x + 110 - st.cam.x > W - 10) st.cam.x = rk.x + 110 - (W - 10);
    if (rk.x - 90 - st.cam.x < 0) st.cam.x = rk.x - 90;
    const ty = gy(c, st.cam.x + W * 0.5) - S.roadY - rk.hopY * 0.3;
    st.cam.y += (ty - st.cam.y) * Math.min(1, dt * 5);
  }
  function mirror(st) {
    const a = loc(st, -6, -36), b = loc(st, -6, -107);
    K.place(st.steer, a.x - st.cam.x, a.y - st.cam.y);
    K.place(st.ride, b.x - st.cam.x, b.y - st.cam.y);
  }

  /* ---------- drawing ---------- */
  const AWN = [['#c8474a', '#f2e6c8'], ['#3f8468', '#f2e6c8'], ['#d98a3a', '#f2e6c8'], ['#6a6cc0', '#f2e6c8']];
  // a path along the street from x0 to x1 at a height offset
  function edge(c, x0, x1, off, back) {
    if (!back) for (let x = x0; x <= x1; x += 32) ctx.lineTo(x, gy(c, x) + off);
    else for (let x = x1; x >= x0; x -= 32) ctx.lineTo(x, gy(c, x) + off);
  }
  function draw(st) {
    const c = st.c, cx = st.cam.x, cy = st.cam.y, t = G.clock;
    K.sky(cx, t, { moonX: 800, moonY: 92, moonR: 40 });
    K.skyline(cx, { y: 390 });
    K.town(cx, { y: 452 });
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, -Math.round(cy * 10) / 10);
    const x0 = Math.floor((cx - 64) / 32) * 32, x1 = x0 + W + 160;
    // the far side of the street: houses, stalls, bamboo, lantern strings
    const n0 = Math.floor((cx - 300) / 280), n1 = Math.floor((cx + W + 60) / 280);
    for (let n = n0; n <= n1; n++) {
      const x = n * 280, h = K.hash(n * 3.1 + st.k * 17), base = gy(c, x + 120) - 44;
      if (((n % 2) + 2) % 2 === 0) K.roof(x + 6, base - 168 - h * 44, 236, { bottom: base + 30 });
      else if (h < 0.45) K.bamboo(x + 60, base + 8, 170 + h * 80, t, n);
    }
    for (let n = n0; n <= n1; n++) {
      const x = n * 280, h = K.hash(n * 3.1 + st.k * 17), base = gy(c, x + 150) - 40;
      if (h > 0.2) K.stall(x + 150, base, 104 + Math.floor(h * 4) * 8, { h: 90, cols: AWN[((n % 4) + 4) % 4], goods: ((n % 4) + 4) % 4 });
      if (((n % 3) + 3) % 3 === 0) K.lanterns(x + 8, gy(c, x) - 196, x + 280, gy(c, x + 280) - 196, 4, t, 12);
    }
    // the watch roofs the rivals stand on, and the rivals
    for (const th of c.throws) if (th.dir !== 'k' && th.x > cx - 120 && th.x < cx + W + 120) drawPerch(st, th, t);
    if (c.end && c.end.x < cx + W + 400) drawStop(st, t);
    // the ground under the street, then the street
    ctx.fillStyle = '#241f44'; ctx.beginPath(); ctx.moveTo(x0, cy + H + 30); edge(c, x0, x1, -50); ctx.lineTo(x1, cy + H + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#48446e'; ctx.beginPath(); edge(c, x0, x1, -50); edge(c, x0, x1, 52, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7d77a6'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath(); edge(c, x0, x1, -48); ctx.stroke();
    ctx.strokeStyle = '#191634'; ctx.lineWidth = 7; ctx.beginPath(); edge(c, x0, x1, 53); ctx.stroke();
    // the stone wall that holds the street up: courses of big blocks, with a few moss tufts
    ctx.strokeStyle = 'rgba(120,112,170,0.22)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let r = 0; r < 6; r++) {
      const off = 82 + r * 30;
      edge(c, x0, x1, off); ctx.moveTo(x1, gy(c, x1) + off + 30);
      for (let x = Math.floor(x0 / 64) * 64 + (r % 2) * 32; x < x1; x += 64) { ctx.moveTo(x, gy(c, x) + off); ctx.lineTo(x, gy(c, x) + off + 30); }
      ctx.moveTo(x0, gy(c, x0) + off + 30);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(110,170,120,0.35)';
    for (let x = Math.floor(x0 / 150) * 150; x < x1; x += 150) { const h = K.hash(x * 0.37); if (h < 0.5) continue; const y = gy(c, x) + 60; ctx.beginPath(); ctx.ellipse(x + h * 40, y, 12, 5, 0, 0, TAU); ctx.fill(); }
    // cobbles and the lane line
    ctx.fillStyle = 'rgba(20,18,50,0.28)';
    for (let x = Math.floor(x0 / 46) * 46; x < x1; x += 46) { const r = K.hash(x); ctx.fillRect(x + r * 20, gy(c, x) - 36 + K.hash(x + 7) * 76, 12 + r * 8, 3); }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = Math.floor(x0 / 96) * 96; x < x1; x += 96) { ctx.moveTo(x, gy(c, x) - 1); ctx.lineTo(x + 44, gy(c, x + 44) - 1); }
    ctx.stroke();
    for (const cn of c.canals) if (cn.x < cx + W + 40 && cn.x + cn.w > cx - 40) drawCanal(st, cn, t);
    for (const b of c.bridges) if (b.x < cx + W + 40 && b.x + b.len > cx - 40) drawBridge(st, b, t, false);
    for (const s of c.signs) if (s.x > cx - 160 && s.x < cx + W + 160) drawSign(c, s);
    for (const lw of c.lows) if (lw.x > cx - 120 && lw.x < cx + W + 120) drawGate(c, lw, t, false);
    layer(st, 0, cx, t);
    ctx.restore();
  }
  // everything standing in one lane (0 far, drawn behind the rickshaw; 1 near, drawn in front)
  function layer(st, L, cx, t) {
    const c = st.c;
    for (const rp of c.ramps) if ((rp.lane === L || rp.lane === 2) && rp.x > cx - 120 && rp.x < cx + W + 120) drawRamp(c, rp, L);
    for (const o of c.obs) if ((o.lane === L || o.lane === 2) && o.x > cx - 160 && o.x < cx + W + 160) drawOb(st, o, L, t);
    for (const b of c.baos) {
      if (b.got || b.x < cx - 40 || b.x > cx + W + 40) continue;
      if (b.h > 0 ? L === 1 : b.lane === L) drawBao(b.x, (b.h > 0 ? gy(c, b.x) : laneY(c, b.x, b.lane)) - 15 - b.h + Math.sin(t * 4 + b.x * 0.05) * 3, 1, t);
    }
  }
  function drawBao(x, y, s, t) {
    ctx.fillStyle = 'rgba(255,240,210,0.16)'; circle(x, y, 16 * s); ctx.fill();
    ctx.fillStyle = '#fff6e6'; ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1.8 * s; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 11 * s, y + 6 * s); ctx.quadraticCurveTo(x - 13 * s, y - 6 * s, x, y - 10 * s); ctx.quadraticCurveTo(x + 13 * s, y - 6 * s, x + 11 * s, y + 6 * s); ctx.quadraticCurveTo(x, y + 9 * s, x - 11 * s, y + 6 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.3 * s; ctx.beginPath(); ctx.moveTo(x, y - 10 * s); ctx.lineTo(x, y - 4 * s); ctx.moveTo(x - 4 * s, y - 8 * s); ctx.lineTo(x - 3 * s, y - 3 * s); ctx.moveTo(x + 4 * s, y - 8 * s); ctx.lineTo(x + 3 * s, y - 3 * s); ctx.stroke();
  }
  function drawSteamer(x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = '#d9b06a'; ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 1.6; rr(-12, -5, 24, 10, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b98a44'; ctx.fillRect(-12, -1, 24, 2);
    ctx.restore();
  }
  function drawSign(c, s) {
    const y = gy(c, s.x) - 48;
    ctx.fillStyle = K.COL.woodDark; ctx.fillRect(s.x - 3, y - 96, 6, 96);
    ctx.font = FONT(15);
    const w = ctx.measureText(s.text).width + 22;
    ctx.fillStyle = s.warn ? '#ffe7a8' : K.COL.paper; rr(s.x - w / 2, y - 130, w, 36, 8); ctx.fill();
    ctx.strokeStyle = s.warn ? '#c8474a' : K.COL.woodDark; ctx.lineWidth = s.warn ? 3 : 2; rr(s.x - w / 2, y - 130, w, 36, 8); ctx.stroke();
    text(s.text, s.x, y - 111.5, 15, C.ink, 'center', 'body');
  }
  function drawPerch(st, th, t) {
    const c = st.c, base = gy(c, th.x) - 40, rk = st.rk;
    K.roof(th.x - 44, th.y, 88, { bottom: base + 20, noWindows: true, th: 14 });
    if (th.up <= 0) return;
    const state = th.st === 'dizzy' ? 'dizzy' : th.st === 'warn' ? 'alert' : 'curious', face = rk.x < th.x ? -1 : 1;
    ctx.save(); ctx.beginPath(); ctx.rect(th.x - 60, th.y - 90, 120, 90); ctx.clip();
    K.guard(th.x, th.y + (1 - K.smooth(th.up)) * 44, { state: th.st === 'thrown' || th.st === 'wait' ? 'patrol' : state, face, t, walk: 0 });
    ctx.restore();
    if (th.st === 'warn') { K.shuriken(th.x + face * 20, th.y - 30 - Math.abs(Math.sin(t * 9)) * 4, 9, t * 12); warnRing(th.x, th.y - 24, th.t / c.warn, t); }
  }
  function warnRing(x, y, u, t) {
    ctx.strokeStyle = 'rgba(255,150,160,' + (0.55 + 0.4 * Math.sin(t * 20)) + ')'; ctx.lineWidth = 3.5;
    circle(x, y, 40 - 14 * u); ctx.stroke();
  }
  function drawKite(st, th, t) {
    const x = th.x, y = th.y, sw = Math.sin(t * 3 + th.seed) * 0.12, dz = th.st === 'dizzy';
    ctx.save(); ctx.translate(x, y - 30); ctx.rotate(sw + (dz ? Math.sin(t * 14) * 0.5 : 0));
    // the tail ribbons
    ctx.strokeStyle = '#ff8fa0'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-30, 0);
    for (let i = 1; i <= 5; i++) ctx.lineTo(-30 - i * 11, Math.sin(t * 8 + i * 1.3) * 5);
    ctx.stroke();
    ctx.fillStyle = '#c8474a'; ctx.strokeStyle = '#5a1f2a'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(0, -24); ctx.lineTo(-32, 0); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(0, -24); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a1f2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(40, 0); ctx.moveTo(0, -24); ctx.lineTo(0, 20); ctx.stroke();
    ctx.restore();
    // the ninja hanging under it
    ctx.strokeStyle = 'rgba(232,216,176,0.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 10, y - 24); ctx.lineTo(x - 5, y - 4); ctx.moveTo(x + 14, y - 26); ctx.lineTo(x + 5, y - 4); ctx.stroke();
    K.guard(x, y + 24, { state: dz ? 'dizzy' : th.st === 'warn' ? 'alert' : 'patrol', face: -1, t, walk: 0, s: 0.8 });
    if (th.st === 'warn') { K.shuriken(x, y + 34, 8, t * 12); warnRing(x, y + 10, th.t / st.c.warn, t); }
  }
  function drawOb(st, o, L, t) {
    const c = st.c, y = laneY(c, o.x, L), ob = OB[o.kind];
    if (o.st === 'passed' || o.st === 'up') { ctx.save(); ctx.translate(o.x, y); }
    else if (o.st === 'flee') {
      // the hens flutter off, unruffled
      if (o.t > 1.6) return;
      for (let k = 0; k < 3; k++) { const dx = (k - 1) * 16 + (k - 1) * o.t * 70 + o.t * 40, dy = -o.t * (60 + k * 30) + Math.sin(o.t * 20 + k) * 5; ctx.globalAlpha = clamp(1.6 - o.t, 0, 1); hen(o.x + dx, y + dy, t * 3 + k, true); }
      ctx.globalAlpha = 1; return;
    } else {
      if (o.t > 1.4) return;
      ctx.save(); ctx.translate(o.x + o.t * 90, y - Math.sin(Math.min(1, o.t / 0.7) * Math.PI) * 40); ctx.rotate(o.t * 5); ctx.globalAlpha = clamp(1.4 - o.t, 0, 1);
    }
    ctx.fillStyle = 'rgba(14,12,40,0.3)'; ctx.beginPath(); ctx.ellipse(0, 1, ob.w * 0.6, 5, 0, 0, TAU); ctx.fill();
    if (o.kind === 'crate') {
      ctx.fillStyle = '#a8744c'; ctx.strokeStyle = '#4a2c1a'; ctx.lineWidth = 2.5; rr(-17, -26, 34, 26, 3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-17, -13); ctx.lineTo(17, -13); ctx.moveTo(-6, -26); ctx.lineTo(-6, 0); ctx.moveTo(6, -26); ctx.lineTo(6, 0); ctx.stroke();
      for (const [dx, col] of [[-9, '#ff6b5a'], [0, '#ff9a4a'], [9, '#ff6b5a']]) { ctx.fillStyle = col; circle(dx, -30, 6); ctx.fill(); }
    } else if (o.kind === 'barrel') {
      ctx.fillStyle = '#8a5a3a'; ctx.strokeStyle = '#3c2416'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -16, 15, 17, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c9a46a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -22); ctx.lineTo(14, -22); ctx.moveTo(-14, -9); ctx.lineTo(14, -9); ctx.stroke();
      ctx.fillStyle = '#6fba8c'; ctx.beginPath(); ctx.ellipse(0, -32, 10, 4, 0, 0, TAU); ctx.fill();
    } else if (o.kind === 'hens') {
      for (let k = 0; k < 3; k++) hen((k - 1) * 14, k === 1 ? -1 : 2, t * 3 + k + o.seed, false);
    } else if (o.kind === 'cart') {
      ctx.strokeStyle = K.COL.woodDark; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(-52, -44); ctx.stroke();
      for (const [dx, dy, r, col] of [[-16, -44, 13, '#5fae6a'], [10, -44, 14, '#6fc27a'], [-3, -62, 12, '#5fae6a']]) { ctx.fillStyle = col; ctx.strokeStyle = '#255a34'; ctx.lineWidth = 2; circle(dx, dy, r); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#2f7a44'; ctx.beginPath(); ctx.arc(dx, dy, r * 0.6, -1.9, -1.2); ctx.stroke(); }
      ctx.fillStyle = K.COL.wood; ctx.strokeStyle = K.COL.woodDark; ctx.lineWidth = 2.5; rr(-36, -38, 72, 22, 4); ctx.fill(); ctx.stroke();
      for (const wx of [-20, 20]) { ctx.fillStyle = '#2c1c26'; circle(wx, -13, 13); ctx.fill(); ctx.fillStyle = '#a8744c'; circle(wx, -13, 8); ctx.fill(); ctx.fillStyle = '#2c1c26'; circle(wx, -13, 2.5); ctx.fill(); }
    } else {
      // a noodle stall that pokes out into the lane
      ctx.fillStyle = K.COL.woodDark; ctx.fillRect(-30, -84, 5, 84); ctx.fillRect(25, -84, 5, 84);
      ctx.fillStyle = '#231f44'; ctx.fillRect(-25, -70, 50, 34);
      ctx.fillStyle = K.COL.wood; ctx.strokeStyle = K.COL.woodDark; ctx.lineWidth = 2; rr(-32, -38, 64, 38, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.ellipse(-12, -41, 10, 4, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(12, -41, 10, 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); for (const dx of [-12, 12]) { ctx.moveTo(dx, -46); ctx.quadraticCurveTo(dx + 5 + Math.sin(t * 3 + dx) * 3, -56, dx, -64); } ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#f2e6c8' : '#d98a3a'; ctx.beginPath(); ctx.moveTo(-36 + i * 18, -90); ctx.lineTo(-18 + i * 18, -90); ctx.lineTo(-18 + i * 18, -74); ctx.arc(-27 + i * 18, -74, 9, 0, Math.PI); ctx.closePath(); ctx.fill(); }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function hen(x, y, ph, fly) {
    const bob = fly ? 0 : Math.abs(Math.sin(ph)) * 2;
    ctx.fillStyle = '#fff6ea'; ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y - 10 - bob, 9, 7.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    circle(x - 7, y - 19 - bob, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5a4a'; circle(x - 7, y - 25 - bob, 2.6); ctx.fill();
    ctx.fillStyle = '#ffb03a'; ctx.beginPath(); ctx.moveTo(x - 12, y - 20 - bob); ctx.lineTo(x - 17, y - 18 - bob); ctx.lineTo(x - 12, y - 16 - bob); ctx.fill();
    ctx.fillStyle = C.ink; circle(x - 8.5, y - 20 - bob, 1.2); ctx.fill();
    if (fly) { ctx.fillStyle = '#fff6ea'; ctx.beginPath(); ctx.ellipse(x + 2, y - 14 - Math.sin(ph * 9) * 6, 8, 3.5, Math.sin(ph * 9) * 0.6, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  function drawRamp(c, rp, L) {
    const x = rp.x, y = laneY(c, x, L);
    ctx.fillStyle = 'rgba(14,12,40,0.3)'; ctx.beginPath(); ctx.ellipse(x - 28, y + 2, 50, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a8744c'; ctx.strokeStyle = '#3c2416'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 74, y + 1); ctx.lineTo(x + 12, y - 30); ctx.lineTo(x + 12, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
    for (const dx of [-40, -20, 0]) { ctx.moveTo(x + dx - 8, y - 4 - (dx + 60) * 0.3); ctx.lineTo(x + dx, y - 12 - (dx + 60) * 0.3); ctx.lineTo(x + dx - 2, y - 1 - (dx + 60) * 0.3); }
    ctx.stroke();
  }
  function drawCanal(st, cn, t) {
    const c = st.c, bot = st.cam.y + H + 30;
    ctx.fillStyle = '#1b2760'; ctx.beginPath();
    ctx.moveTo(cn.x, gy(c, cn.x) - 54); ctx.lineTo(cn.x + cn.w, gy(c, cn.x + cn.w) - 54); ctx.lineTo(cn.x + cn.w, bot); ctx.lineTo(cn.x, bot); ctx.closePath(); ctx.fill();
    const wy = gy(c, cn.x + cn.w / 2) - 22;
    ctx.fillStyle = '#2f4a9c'; ctx.fillRect(cn.x, wy, cn.w, bot - wy);
    ctx.strokeStyle = 'rgba(200,220,255,0.5)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const yy = wy + 8 + i * 17, xx = cn.x + 10 + K.hash(i + cn.x) * (cn.w - 50) + Math.sin(t * 2 + i) * 6; ctx.moveTo(xx, yy); ctx.lineTo(xx + 22, yy); }
    ctx.stroke();
    // stone lips
    ctx.fillStyle = '#7d77a6'; ctx.fillRect(cn.x - 7, gy(c, cn.x) - 52, 9, 106); ctx.fillRect(cn.x + cn.w - 2, gy(c, cn.x + cn.w) - 52, 9, 106);
  }
  // a narrow bridge: water where the closed lane would be, a plank deck in the open lane (near = the rail in front)
  function drawBridge(st, b, t, near) {
    const c = st.c, bot = st.cam.y + H + 30, x0 = Math.max(b.x, st.cam.x - 60), x1 = Math.min(b.x + b.len, st.cam.x + W + 60), off = S.laneOff[b.lane];
    if (x1 <= x0) return;
    if (!near) {
      ctx.fillStyle = '#2f4a9c'; ctx.beginPath(); ctx.moveTo(x0, gy(c, x0) - 54); for (let x = x0; x < x1; x += 32) ctx.lineTo(x, gy(c, x) - 54); ctx.lineTo(x1, gy(c, x1) - 54); ctx.lineTo(x1, bot); ctx.lineTo(x0, bot); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(200,220,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) { const yy = gy(c, x) - 40 + K.hash(x) * 150, xx = x + Math.sin(t * 2 + x) * 6; if (xx > x0 && xx < x1 - 24) { ctx.moveTo(xx, yy); ctx.lineTo(xx + 22, yy); } }
      ctx.stroke();
      // the deck
      ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.moveTo(x0, gy(c, x0) + off - 20); for (let x = x0; x < x1; x += 32) ctx.lineTo(x, gy(c, x) + off - 20); ctx.lineTo(x1, gy(c, x1) + off - 20); ctx.lineTo(x1, gy(c, x1) + off + 24);
      for (let x = x1; x > x0; x -= 32) ctx.lineTo(x, gy(c, x) + off + 24); ctx.lineTo(x0, gy(c, x0) + off + 24); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5a3824'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = Math.ceil(x0 / 30) * 30; x < x1; x += 30) { ctx.moveTo(x, gy(c, x) + off - 20); ctx.lineTo(x, gy(c, x) + off + 24); }
      ctx.stroke();
    }
    // a rail: posts and a rope (far rail behind the rickshaw, near rail in front)
    const ry = near ? off + 24 : off - 20;
    ctx.strokeStyle = '#c8474a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
    for (let x = Math.ceil(x0 / 120) * 120; x <= x1; x += 120) { ctx.moveTo(x, gy(c, x) + ry); ctx.lineTo(x, gy(c, x) + ry - 26); }
    ctx.stroke();
    ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, gy(c, x0) + ry - 22); for (let x = x0; x < x1; x += 40) ctx.lineTo(x, gy(c, x) + ry - 22); ctx.lineTo(x1, gy(c, x1) + ry - 22); ctx.stroke();
    if (!near && b.x > st.cam.x - 60) { ctx.fillStyle = '#7d77a6'; ctx.fillRect(b.x - 8, gy(c, b.x) - 52, 10, 106); }
    if (!near && b.x + b.len < st.cam.x + W + 60) { ctx.fillStyle = '#7d77a6'; ctx.fillRect(b.x + b.len - 2, gy(c, b.x + b.len) - 52, 10, 106); }
  }
  // a low lantern gate seen side-on: a far post, a near post, and a row of lanterns hanging between them
  function drawGate(c, lw, t, near) {
    const x = lw.x, g = gy(c, x);
    ctx.fillStyle = '#c8474a'; ctx.strokeStyle = '#5a1f2a'; ctx.lineWidth = 2;
    if (!near) {
      rr(x + 8, g - 50 - 150, 9, 150, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a2546'; ctx.beginPath(); ctx.moveTo(x + 20, g - 204); ctx.lineTo(x + 4, g - 204); ctx.lineTo(x - 22, g - 96); ctx.lineTo(x - 6, g - 96); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 3; i++) { const u = (i + 0.5) / 3; K.lantern(x + 12 - u * 26, g - 204 + u * 108, t, { s: 0.8, col: lw.hit ? '#ffb0a0' : ['#ff7a4a', '#ffb85a', '#ff8fa0'][i], sway: lw.hit ? 5 : 1 }); }
    } else { rr(x - 18, g + 50 - 150, 9, 150, 3); ctx.fill(); ctx.stroke(); }
  }
  function drawStop(st, t) {
    const c = st.c, e = c.end, g = gy(c, e.x + 120);
    K.roof(e.x + 30, g - 230, 330, { bottom: g - 30, th: 20 });
    ctx.fillStyle = K.COL.paper; rr(e.x + 120, g - 196, 150, 40, 8); ctx.fill(); ctx.strokeStyle = '#c8474a'; ctx.lineWidth = 3; rr(e.x + 120, g - 196, 150, 40, 8); ctx.stroke();
    text(st.lastRoom === true || st.k === 3 ? 'THE DOJO' : 'TEA STOP', e.x + 195, g - 175, 20, C.ink, 'center');
    K.lanterns(e.x - 120, g - 210, e.x + 40, g - 236, 3, t, 10);
  }
  function drawRick(st, t) {
    const rk = st.rk, rd = st.rd, c = st.c, by = baseY(st), S0 = st.steer, R0 = st.ride;
    // shadow on the street
    const sy = laneY(c, rk.x, rk.ly);
    if (rk.dunk <= 0) { ctx.fillStyle = 'rgba(14,12,40,' + (0.34 - Math.min(0.2, rk.hopY * 0.002)) + ')'; ctx.beginPath(); ctx.ellipse(rk.x - 4, sy + 2, 56 - Math.min(26, rk.hopY * 0.2), 6, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(rk.x, by); ctx.rotate(rk.ang); ctx.scale(S.Z, S.Z);
    if (rk.dunk > 0) { ctx.beginPath(); ctx.rect(-120, -260, 240, 252); ctx.clip(); }
    // the far wheel
    wheel(8, -22, 22, rk.wheel, true);
    // the steamer baskets on the back shelf
    ctx.fillStyle = K.COL.woodDark; ctx.fillRect(-66, -40, 28, 5);
    if (st.restock > 0 && st.cargo < S.cargo) {
      const u = ((1 - st.restock / S.restockT) * (S.cargo + 0.6)) % 1;
      drawSteamer(K.lerp(-150, -52, u), K.lerp(-150, -46 - st.cargo * 10, u) - Math.sin(u * Math.PI) * 40, u * 6);
    }
    for (let k = 0; k < st.cargo; k++) drawSteamer(-52, -46 - k * 10 + (rk.wob > 0 ? Math.sin(rk.wobA + k) * rk.wob * 2 : 0), 0);
    if (st.cargo > 0) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; const sy2 = -56 - st.cargo * 10; for (const dx of [-5, 3]) { ctx.beginPath(); ctx.ellipse(-52 + dx + Math.sin(t * 3 + dx) * 2, sy2 - ((t * 20 + dx * 3) % 12), 2.5, 4, 0, 0, TAU); ctx.fill(); } }
    // the seat back and the canopy posts
    ctx.fillStyle = '#8a2c34'; ctx.strokeStyle = '#3c1420'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    rr(-40, -78, 13, 56, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.COL.woodDark; ctx.fillRect(-37, -100, 4, 24); ctx.fillRect(25, -100, 4, 58);
    // the steerer, on the seat
    const lean = rk.laneT === 0 && rk.ly > 0.05 ? -0.12 : rk.laneT === 1 && rk.ly < 0.95 ? 0.12 : 0;
    K.ninja(S0, -6, -36, { pose: rk.stopT > 0 || rk.dunk > 0 ? 'dizzy' : 'idle', face: 1, t, s: 0.94, rot: lean + (rk.brake ? -0.1 : 0), wind: clamp(rk.v / 300, 0.2, 1) });
    // the steering bar and its hands
    ctx.strokeStyle = K.COL.woodDark; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(8, -48 - lean * 40); ctx.lineTo(27, -52 + lean * 40); ctx.stroke();
    ctx.fillStyle = PCOL[S0]; ctx.strokeStyle = PDARK[S0]; ctx.lineWidth = 2; circle(9, -49 - lean * 40, 3.6); ctx.fill(); ctx.stroke();
    // the body: a red lacquer tub with a cream stripe, the shafts and a lantern on the tip
    ctx.fillStyle = '#c8474a'; ctx.strokeStyle = '#3c1420'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-40, -44); ctx.lineTo(30, -44); ctx.quadraticCurveTo(38, -34, 30, -20); ctx.lineTo(-34, -20); ctx.quadraticCurveTo(-42, -30, -40, -44); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.COL.paper; ctx.fillRect(-36, -36, 66, 4);
    ctx.strokeStyle = '#3c1420'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(30, -30); ctx.lineTo(80, -24); ctx.stroke();
    ctx.strokeStyle = K.COL.wood; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(30, -30); ctx.lineTo(80, -24); ctx.stroke();
    K.lantern(78, -24, t, { s: 0.55, sway: 3 });
    // the canopy roof the rider stands on
    ctx.fillStyle = st.gold.wheels ? '#5a4a86' : '#46507f'; ctx.strokeStyle = K.COL.tileEdge; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-50, -98); ctx.quadraticCurveTo(-56, -100, -58, -107); ctx.lineTo(42, -107); ctx.quadraticCurveTo(40, -100, 34, -98); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.COL.trim; ctx.fillRect(-46, -100, 78, 3);
    // the near wheel
    wheel(-8, -24, 24, rk.wheel, false, st.gold.wheels);
    // the sword rider
    const face = rd.aim === 'b' ? -1 : 1;
    if (rd.dizzy > 0) K.ninja(R0, -6, -107, { pose: 'dizzy', face, t });
    else if (rd.duck) K.ninja(R0, -6, -107, { pose: 'sneak', face, t, wind: 1 });
    else {
      const d = rd.swing > 0 ? rd.swingDir : rd.aim, base = DIRS[d].ang;
      let aim = base + (d === 'k' ? 0 : d === 'a' ? -0.25 : 0.25);
      if (rd.swing > 0) {
        const u = clamp(1 - rd.swing / (rd.swingMax || S.swingT), 0, 1), sgn = d === 'b' ? -1 : 1, sw = K.lerp(-1.15, 1.15, K.smooth(u * 1.6)) * sgn;
        aim = base + sw;
        K.slash(face * 14, -120, 44, base - 1.15 * sgn, base + sw, 0.75 * (1 - u * 0.5), st.gold.sword ? C.gold : '#ffffff');
      }
      K.ninja(R0, -6, -107, { pose: 'sword', face: d === 'b' ? -1 : 1, t, aim, glint: Math.max(0, rd.glint), wind: clamp(rk.v / 280, 0.3, 1) });
      if (st.gold.sword) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 8); circle(-6, -120, 50); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    ctx.restore();
    if (rk.dunk > 0) {
      ctx.fillStyle = 'rgba(160,200,255,0.8)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(rk.x - 50 + k * 32 + Math.sin(t * 6 + k) * 5, by - 9, 16, 5, 0, 0, TAU); ctx.fill(); }
    }
  }
  function wheel(x, y, r, a, far, gold) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = far ? '#1c1430' : gold ? C.gold : '#2c1c26'; ctx.lineWidth = far ? 4 : 5; circle(0, 0, r - 2); ctx.stroke();
    ctx.strokeStyle = far ? '#4a3040' : gold ? '#ffe7a8' : '#a8744c'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let k = 0; k < 4; k++) { const b = k * Math.PI / 4; ctx.moveTo(Math.cos(b) * (r - 3), Math.sin(b) * (r - 3)); ctx.lineTo(-Math.cos(b) * (r - 3), -Math.sin(b) * (r - 3)); }
    ctx.stroke();
    ctx.fillStyle = far ? '#4a3040' : '#e2a93b'; circle(0, 0, 4); ctx.fill();
    ctx.restore();
  }
  // chevrons by the rider on the side a star is coming from
  function chevrons(st, dir, u, t) {
    const p = riderPt(st), a = DIRS[dir].ang, on = Math.sin(t * 18) > -0.2;
    ctx.save(); ctx.translate(p.x + Math.cos(a) * 62, p.y + Math.sin(a) * 62 - (dir === 'k' ? 10 : 0)); ctx.rotate(a + Math.PI);
    ctx.strokeStyle = on ? '#ff9aa8' : '#ffd0d8'; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < 3; k++) { ctx.globalAlpha = clamp(0.7 + u * 0.6 - k * 0.2, 0.35, 1); ctx.beginPath(); ctx.moveTo(-k * 13 - 6, -10); ctx.lineTo(-k * 13 + 4, 0); ctx.lineTo(-k * 13 - 6, 10); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawTop(st) {
    const c = st.c, cx = st.cam.x, cy = st.cam.y, t = G.clock;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, -Math.round(cy * 10) / 10);
    drawRick(st, t);
    for (const b of c.bridges) if (b.x < cx + W + 40 && b.x + b.len > cx - 40) drawBridge(st, b, t, true);
    layer(st, 1, cx, t);
    if (c.end && c.end.x < cx + W + 200) K.hayCart(c.end.x, laneY(c, c.end.x, st.rk.ly) + 4, { squash: c.end.squash, face: -1 });
    for (const lw of c.lows) if (lw.x > cx - 120 && lw.x < cx + W + 120) drawGate(c, lw, t, true);
    for (const b of st.loose) { ctx.globalAlpha = clamp(2.2 - b.t, 0, 1); drawSteamer(b.x, b.y, b.rot); if (b.t < 0.5) drawBao(b.x + 8, b.y - 12 - b.t * 30, 0.7, t); ctx.globalAlpha = 1; }
    for (const th of c.throws) if (th.dir === 'k' && th.st !== 'wait' && th.x > cx - 140 && th.x < cx + W + 140) drawKite(st, th, t);
    // warnings and stars
    if (st.state === 'go') {
      for (const th of c.throws) if (th.st === 'warn') chevrons(st, th.dir, th.t / c.warn * 0.5, t);
      for (const s of st.stars) if (s.st === 'fly') chevrons(st, s.dir, 0.5 + s.t / s.T * 0.5, t);
    }
    for (const s of st.stars) {
      const tta = s.T - s.t;
      if (s.st === 'fly' && tta < S.swingT) { ctx.strokeStyle = tta < S.great ? '#8fe3b0' : '#ffffff'; ctx.lineWidth = tta < S.great ? 4 : 2.5; circle(s.x, s.y, 17); ctx.stroke(); }
      K.shuriken(s.x, s.y, 11, s.rot, s.st === 'back' ? { id: st.ride } : {});
    }
    K.drawParts(st, cx);
    ctx.restore();
    // speed streaks
    if (st.rk.v > 300 && !reduceMotion && st.state === 'go') {
      ctx.strokeStyle = 'rgba(255,255,255,' + clamp((st.rk.v - 300) / 400, 0, 0.3) + ')'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k < 7; k++) { const yy = 120 + K.hash(k + Math.floor(t * 9)) * 300, xx = K.hash(k * 3 + Math.floor(t * 9)) * W; ctx.moveTo(xx, yy); ctx.lineTo(xx - 60, yy - 60 * slopeAt(c, st.rk.x)); }
      ctx.stroke();
    }
    K.drawPops(st, cx, cy);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused', c = st.c;
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.bao + ' / ' + st.totalAll, sp = String(st.stats.spills);
      ctx.font = FONT(fs);
      const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, sw = ctx.measureText(sp).width, icon = fs * 1.5;
      const w = tw + fs + icon + 5 + nw + fs * 0.8 + icon + sw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      let x = x0 + 15;
      text(tm, x, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body'); x += tw + fs;
      drawBao(x + icon / 2, cy + 1, fs / 16, 0); x += icon + 5;
      text(n, x, cy, fs, '#ffffff', 'left', 'body'); x += nw + fs * 0.8;
      drawSteamer(x + icon / 2 - 3, cy, -0.5); x += icon;
      text(sp, x, cy, fs, st.stats.spills > S.goldSpills ? '#ffb0a0' : '#ffffff', 'left', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), rk = st.rk, rd = st.rd, D = st.steer, R = st.ride;
    {
      const b = K.panel(D, st.gold.wheels ? 'gold wheels ' + Math.ceil(st.gold.wheels) + 's' : 'steers', 236, 58, z), cy = b.y + 27 * z, chh = 23 * z, qt = K.quiet(D), cw = (b.w - 24 * z - 12 * z) / 3, x = b.x + 12 * z;
      K.chip(x, cy, cw, chh, (qt ? '' : K.key(D, pl.lane === 0 ? 'up' : 'down') + ' ') + 'SWERVE', pl.sWhy === 'swerve', rk.ly !== rk.laneT, z);
      K.chip(x + cw + 6 * z, cy, cw, chh, (qt ? '' : K.key(D, 'act') + ' ') + 'HOP', pl.hopSoon || pl.hop, rk.air, z);
      K.chip(x + 2 * (cw + 6 * z), cy, cw, chh, (qt ? '' : K.key(D, 'left') + ' ') + 'BRAKE', false, rk.brake, z);
    }
    {
      const b = K.panel(R, st.gold.sword ? 'gold sword ' + Math.ceil(st.gold.sword) + 's' : 'sword', 236, 58, z), cy = b.y + 27 * z, chh = 23 * z, qt = K.quiet(R), cw = (b.w - 24 * z - 12 * z) / 3, x = b.x + 12 * z;
      const d = pl.dir || rd.aim;
      K.chip(x, cy, cw, chh, (qt ? '' : aimKey(R, d) + ' ') + (d === 'a' ? 'AHEAD' : d === 'b' ? 'BEHIND' : 'UP'), pl.rWhy === 'aim', false, z);
      K.chip(x + cw + 6 * z, cy, cw, chh, (qt ? '' : K.key(R, 'act') + ' ') + 'SWING', pl.rWhy === 'swing' && pl.tta < 0.28 && rd.swing <= 0, rd.swing > 0, z);
      K.chip(x + 2 * (cw + 6 * z), cy, cw, chh, (qt ? '' : K.key(R, 'down') + ' ') + 'DUCK', pl.duck && !rd.duck, rd.duck, z);
    }
    // how far down the hill: a little bar between the panels
    if (c.end) {
      const bw = big ? 150 : 190, bx = W / 2 - bw / 2, byy = H - (big ? 26 : 22), u = clamp((rk.x - 150) / (c.end.x - 78 - 150), 0, 1);
      K.meter(bx, byy, bw, 8, u, '#cfd6ff');
      ctx.fillStyle = PCOL[D]; circle(bx + bw * u, byy + 4, 6); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; circle(bx + bw * u, byy + 4, 6); ctx.stroke();
      text('⛩', bx + bw + 12, byy + 4.5, 13, '#ffffff', 'center', 'body');
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cx = st.cam.x, cy = st.cam.y;
    {
      let s = null, col = C.gold, pulse = false;
      if (rk.dunk > 0) { s = 'Glub glub...'; col = '#cfe0ff'; }
      else if (st.restock > 0) { s = 'Restocking...'; col = '#ffe7a8'; }
      else if (rk.stopT > 0) { s = 'Whoops!'; col = '#ffe7a8'; }
      else if (pl.sWhy === 'swerve') { s = (pl.what === 'ramp' ? 'Take the ramp! ' : pl.what === 'bridge' ? 'Narrow bridge! ' : pl.what === 'bao' ? 'Dumplings! ' : 'Swerve! ') + K.key(D, pl.lane === 0 ? 'up' : 'down'); pulse = pl.what !== 'bao'; if (pl.what === 'bao') col = '#ffe7a8'; }
      else if (pl.hop || pl.hopSoon) { s = (pl.what === 'ditch' ? 'Hop the ditch! ' : 'Hop! ') + K.key(D, 'act'); pulse = pl.hop; }
      else if (pl.sWhy === 'hopbao') { s = 'Hop for the dumplings! ' + K.key(D, 'act'); col = '#ffe7a8'; pulse = pl.hop; }
      else if (rk.air && rk.ramp) { s = 'Wheeee!'; col = '#d9ffd0'; }
      const a = loc(st, 46, -40);
      P.say(D, s, a.x - cx + 50, a.y - cy - 4, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      if (rd.dizzy > 0) { s = 'Dizzy...'; col = '#ffe7a8'; }
      else if (pl.duck && !rd.duck) { s = 'Duck! ' + K.key(R, 'down'); pulse = true; }
      else if (rd.duck && !pl.duck && !pl.lowSoon) { s = 'Up you get! Let go of ' + K.key(R, 'down'); }
      else if (pl.rWhy === 'aim') { s = 'Sword ' + DIRS[pl.dir].word + '! ' + aimKey(R, pl.dir); pulse = !!pl.star; }
      else if (pl.rWhy === 'swing' && pl.tta < 0.28) { s = 'Swing! ' + K.key(R, 'act'); pulse = true; }
      else if (pl.rWhy === 'swing' || pl.rWhy === 'ready') { s = 'Ready... ' + K.key(R, 'act'); col = '#d9ffd0'; }
      const a = riderPt(st);
      P.say(R, s, a.x - cx - 30, a.y - cy - 62, col, pulse);
    }
  }
  const medal = (t, frac, spills) => K.medal(t <= S.goldT && frac >= S.goldBao && spills <= S.goldSpills, t <= S.silverT && frac >= S.silverBao && spills <= S.silverSpills);

  MODES.rickshaw = {
    S, OB, DIRS, compile, plan, medal, gy, slopeAt, riderPt,
    setup(st, L) {
      st.stats = { bao: 0, spills: 0, crashes: 0, splashes: 0, gates: 0, restocks: 0, hits: 0, thrown: 0, deflects: 0, greats: 0, swings: 0, hops: 0, hopped: 0, jumps: 0, ducked: 0, helps: 0, roomT: [] };
      st.bao = 0; st.inT = [G.time, G.time]; st.personT = G.time;
      const def = LEVELS[G.levelIndex];
      st.totalAll = (def.rooms || [def]).reduce((n, r) => n + compile(Object.assign({}, def, r)).total, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.c) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.c) drawTop(st); },
    hud() { const st = G.mst; if (st.c) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const all = st.totalAll || 1, frac = st.bao / all, m = medal(G.time, frac, s.spills);
      const out = [
        { label: 'Dumplings', value: st.bao + ' of ' + all },
        { label: 'Spills', value: String(s.spills) },
        { label: 'Stars bonked back', value: s.greats + ' of ' + s.thrown },
        { label: 'Medal', value: m },
      ];
      out.push((m === 'Gold' ? 'A perfect delivery: the dojo feast is saved!' : frac >= 0.6 ? 'Most of the dumplings made it to the feast!' : 'You rode the runaway rickshaw all the way down!')
        + ' Stars deflected: ' + s.deflects + ' of ' + s.thrown + ', ramp jumps: ' + s.jumps + '.');
      if (m !== 'Gold') out.push('Gold: ' + K.mmss(S.goldT) + ' or faster, ' + Math.round(S.goldBao * 100) + '% of the dumplings, ' + S.goldSpills + ' spills or fewer.');
      if (s.helps) out.push(K.helpLine(s.helps));
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = steer => ({ label: 'hop', labels: steer === 0 ? ['hop', 'swing'] : ['swing', 'hop'] });
  NINJA.defs.rickshaw = {
    name: 'Runaway Rickshaw', world: 28, kind: 'team', mode: 'rickshaw', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>W</kbd><kbd>S</kbd> swerve / sword up, duck <kbd>A</kbd><kbd>D</kbd> brake / sword side',
      bo: '<kbd>↑</kbd><kbd>↓</kbd> swerve / sword up, duck <kbd>←</kbd><kbd>→</kbd> brake / sword side',
      pad: 'stick swerves or points the sword, down ducks,',
    },
    tip: 'Steerer: ▲ ▼ swerve, hop the low things. Sword rider: point ◀ ▲ ▶ at the star, swing as it arrives!',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Market Hill', steer: 0, pace: 280, warn: 1.05, flight: 0.95, act: acts(0),
        tip: 'Pip steers: ▲ ▼ swerve, the action hops. Bo: point the sword ◀ ▲ ▶ at each star and swing as it arrives!',
        course: ['s5', 'f260', 'bao:n:3', 'f460', 'S:Swerve!', 'f300', 'cart:n', 'f150', 'bao:f:3', 'f520', 'stall:f', 'f160', 'bao:n:3', 'f420',
          'S:Stars! Swing!', 'f120', 'star:a', 'f680', 'S:Hop!', 'f330', 'crate:b', 'f420', 'bao:a:2', 'f460', 'star:a', 'f380', 'cart:f', 'f180', 'bao:n:3',
          's9', 'f480', 'star:b', 'f520', 'hens:b', 'f440', 'stall:n', 'f140', 'bao:f:3', 'f500', 'star:a', 'f330', 'barrel:n', 'f150', 'bao:f:2', 'f460',
          'S:Ramp!', 'f340', 'ramp:b', 'f26', 'canal:170', 'bao:A:4', 'f560', 'star:b', 'f360', 'cart:n', 'f200', 'bao:f:3', 's6', 'f520', 'star:a,b', 'f640',
          'stall:n', 'f160', 'bao:f:3', 'f400', 'hens:b', 'f380', 'E'] },
      { title: 'Lantern Lane', steer: 1, pace: 305, warn: 0.95, flight: 0.88, act: acts(1),
        tip: 'Swap! Bo steers, Pip has the sword. Duck ▼ under the lantern gates, and take the lane with the ramp.',
        course: ['s7', 'f260', 'bao:f:3', 'f420', 'star:a', 'f420', 'cart:f', 'f160', 'bao:n:3', 'f460', 'low', 'f360', 'star:b', 'f400', 'crate:b', 'f440', 'stall:n', 'f150', 'bao:f:3',
          's11', 'f520', 'star:a,b', 'f560', 'barrel:f', 'f130', 'bao:n:2', 'f420', 'S:Ramp: near lane', 'f380', 'ramp:n', 'f26', 'canal:180', 'bao:A:4', 'f620', 'low', 'f300', 'star:a',
          'f380', 'hens:b', 'f400', 'cart:n', 'f170', 'bao:f:3', 'f460', 'star:b,a', 'f520', 'canal:100', 'f330', 'bao:a:2', 'f380', 'stall:f', 'f160', 'bao:n:2',
          's8', 'f480', 'star:b', 'f200', 'low', 'f420', 'star:a,a', 'f520', 'barrel:b', 'f400', 'S:Ramp: far lane', 'f380', 'ramp:f', 'f26', 'canal:180', 'bao:A:4', 'f560',
          'star:a,b', 'f480', 'stall:n', 'f160', 'bao:f:3', 'f360', 'E'] },
      { title: 'Kite Bridge', steer: 0, pace: 330, warn: 0.9, flight: 0.82, act: acts(0),
        tip: 'Pip steers again. Kites drop stars from above: sword up ▲! Keep to the open lane on the narrow bridge.',
        course: ['s8', 'f260', 'bao:n:3', 'f400', 'S:Kites! Sword up!', 'f160', 'star:k', 'f560', 'cart:n', 'f170', 'bao:f:3', 'f440', 'star:k,b', 'f520', 'stall:f',
          'f330', 'canal:100', 'f300', 'bao:a:2', 'f360', 'low', 'f340', 'star:k', 'f330', 'barrel:n', 'f120', 'bao:f:3', 's12', 'f500', 'star:a,k', 'f440', 'cart:f', 'f330', 'hens:b', 'f420',
          'S:Narrow bridge: near lane', 'f460', 'bridge:1500:n', 'f200', 'bao:n:3', 'f120', 'star:a', 'f360', 'star:k,b', 'f380', 'bao:n:3', 'f200', 'star:b,a,k', 'f520', 'bao:n:2', 'f220',
          'ramp:b', 'f26', 'canal:190', 'bao:A:5', 'f640', 's7', 'star:k', 'f260', 'stall:n', 'f330', 'cart:f', 'f160', 'bao:n:3', 'f420', 'low', 'f320', 'star:b,k', 'f420', 'crate:b', 'f420',
          'S:Ramp: far lane', 'f360', 'ramp:f', 'f26', 'canal:180', 'bao:A:4', 'f560', 'star:a,k', 'f460', 'hens:b', 'f300', 'bao:f:3', 'f300', 'E'] },
      { title: 'The Big Plunge', steer: 1, pace: 355, warn: 0.85, flight: 0.78, act: acts(1),
        tip: 'The steep last plunge to the dojo! Bo steers, Pip has the sword. Volleys of three: turn and swing, turn and swing!',
        course: ['s9', 'f260', 'bao:f:3', 'f400', 'star:a,b', 'f480', 'cart:f', 'f330', 'crate:n', 'f120', 'bao:f:3', 'f420', 'star:k', 'f140', 'low', 'f460', 'S:Hold on tight!', 's17', 'f300', 'star:a,k,b',
          'f520', 'barrel:b', 'f440', 'stall:n', 'f170', 'bao:f:3', 'f400', 'star:b', 'f360', 'canal:100', 'f320', 'cart:f', 'f340', 'star:a,a', 'f330', 'hens:b', 'f400',
          'S:Ramp: near lane', 'f400', 'ramp:n', 'f26', 'canal:200', 'bao:A:5', 'f660', 's12', 'star:k,a', 'f460', 'stall:f', 'f340', 'bao:n:3', 'f120', 'low', 'f360', 'star:b,k,a',
          'f560', 'crate:b', 'f400', 'S:Narrow bridge: far lane', 'f460', 'bridge:1300:f', 'f180', 'bao:f:3', 'f100', 'star:a,b', 'f420', 'bao:f:3', 'f160', 'star:k,a,b', 'f560', 'bao:f:2', 'f180',
          's19', 'f300', 'star:a', 'f360', 'cart:n', 'f340', 'barrel:b', 'f400', 'star:b,a,k', 'f520', 'cart:f', 'f340', 'hens:b', 'f380', 'S:The last ramp!', 'f400', 'ramp:n', 'f26', 'canal:200',
          'bao:A:5', 'f620', 's5', 'bao:n:3', 'f360', 'E'] },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.rickshawHop = function (p) { this.tone(240 * (p || 1), 0.18, 'sine', 0.05, 600 * (p || 1)); };
  Sfx.extra.rickshawLand = function (p) { this.tone(150 * (p || 1), 0.08, 'triangle', 0.045, 95); this.tone(90, 0.06, 'sine', 0.03, 60, 0.03); };
  Sfx.extra.rickshawRoll = function () { [180, 220, 270, 330].forEach((f, i) => this.tone(f, 0.1, 'sawtooth', 0.02, f * 1.2, i * 0.09)); };
  Sfx.extra.rickshawRamp = function () { this.tone(220, 0.5, 'sine', 0.05, 900); this.tone(330, 0.4, 'triangle', 0.025, 1100, 0.05); };
  Sfx.extra.rickshawCrash = function () { this.tone(130, 0.18, 'sine', 0.08, 60); this.tone(420, 0.07, 'square', 0.02, 220, 0.02); this.tone(300, 0.07, 'square', 0.02, 160, 0.09); };
  Sfx.extra.rickshawSplash = function () { this.tone(520, 0.3, 'sine', 0.05, 120); this.tone(900, 0.2, 'triangle', 0.02, 300, 0.05); };
  Sfx.extra.rickshawSpill = function () { this.tone(620, 0.08, 'triangle', 0.035, 420); this.tone(470, 0.1, 'triangle', 0.03, 300, 0.08); };
  Sfx.extra.rickshawBao = function (p) { this.tone(880 * (p || 1), 0.05, 'triangle', 0.035); this.tone(1320 * (p || 1), 0.08, 'triangle', 0.03, null, 0.04); };
  Sfx.extra.rickshawCluck = function () { [760, 640, 820].forEach((f, i) => this.tone(f, 0.05, 'sawtooth', 0.02, f * 0.8, i * 0.07)); };
  Sfx.extra.rickshawArrive = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.08)); };
})();
