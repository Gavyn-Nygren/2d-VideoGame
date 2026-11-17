/* Pip & Bo - Level 19-2 Handcar Hustle (team, World 19 Tumbleweed Gulch). */
'use strict';

/* ===== 19-2 Handcar Hustle (mode 'handcar', World 19 "Tumbleweed Gulch", team) =====
   Pip and Bo ride a railroad handcar (a flat wooden cart with a seesaw pump handle on a post) rightwards along the
   tracks through the desert, seen from the side. The mode owns the tick, the camera, the whole picture and the HUD
   (def.ownStep + def.ownHUD); the engine grid is empty apart from the two spawns.
   PUMPING: the handle is a seesaw. One player grips the back end and one the front end. Your press (▼, or the action
   'pump') pushes YOUR end down, which lifts your partner's end. A push only counts while your end is up (it went up
   because your partner pushed), so the pair must alternate: Pip, Bo, Pip, Bo. One player alone gets one push and then
   only "Clunk!". Two pushes within 0.11 s of each other jam the handle for a beat. Every good push adds speed (less the
   faster you go); pushes evenly spaced build a rhythm streak (the pump-o-meter) worth up to +28% per push.
   SLOPES: going up slows you, coming down speeds you up; a steep hill with slow pumping rolls you gently back down.
   BRAKING: hold ▲ (W / ↑, controller A or stick up, touch ▲). Both braking squeeze it fully; one alone brakes half as
   hard. Brake for: broken track (a warning sign, then a flagman with a red flag: stop before him and the work crew
   lays a plank in a few seconds), sharp curves (a SLOW sign; over the limit the handcar starts to tip ("Too fast!
   Brake!") and braking within about half a second saves it; still too fast, or far too fast, is a "Whoa!" wobble on
   two wheels and a hard slowdown), cows crossing (stop until they amble across; rolling into them is a "Moo!" bump),
   and mail stations (stop in the painted box to pick up the mail sack, the score). Stopping just past a box: the
   station hand pushes the handcar back (there is no reverse). Rolling well past it misses its sack.
   Soft fails only: rolling into the buffer before broken track is a "Whoops!" and the friendly work crew pushes the
   handcar back to the last flag. Nobody is ever hurt.
   4 stretches (roomWord 'Stretch'); Pip and Bo hop over the handle and swap ends at the arch after each one. The last
   stretch ends in town: stop in the station box, the station master rings the bell, confetti.
   Gold help (always announced): Gold push (bigger pushes) on a hill after 2 roll-backs on it; Gold sign (it flashes
   much earlier, with a gold brake line on the track) after 2 crashes at one broken track, curve or cow crossing.
   Room def: { title, back: 0|1 (who grips the back end), tip, course: [tokens] }. Course tokens (lengths in px):
     fN flat   uN gentle up   UN steep up   dN gentle down   DN steep down   bN bridge over a creek   tN canyon trestle
     S:text  a sign ({B} the back end player's name, {F} the front's)   Z:kind:N  scenery for N px (cactus, town, rocks)
     F  checkpoint flag   K  broken track   C  sharp curve   W  cows crossing   M  mail station
     X  the swap arch (end of a stretch)   E  the town station (the finish)
   Every global is prefixed handcar / HANDCAR (and Sfx.extra.handcar*); all state lives in G.mst. */
const HANDCAR = {
  pushV: 84, vTop: 345, drag: 0.26, roll: 12, gS: 520, brake: 560, vMax: 470, vBack: -95,
  jamWin: 0.11, jamT: 0.6, swing: 0.42, ease: 10,
  half: 72, wb: 48, wr: 13, deckY: -30, pivotY: -80, arm: 36, stand: 56, scale: 1.25,
  fixT: 3.4, fixZone: 360, flagGap: 110, cowWalk: 5.4, cowTrig: 760, curveV: 140, curveHard: 1.55,
  mailTol: 50, mailHold: 0.4, endTol: 56, endHold: 0.6, backT: 1.4,
  oopsT: 3.0, swapT: 2.6, finT: 3.8, hintLife: 2.8, tryWin: 5, crewHelp: 3, endTolGold: 120, hayHelp: 3,
  goldPush: 1.6, stallHelp: 2, crashHelp: 2, goldLead: 560, streakMax: 8, streakK: 0.035,
  camLead: 300, camY: 405,
};
const handcarLerp = (a, b, u) => a + (b - a) * u;
const handcarSmooth = u => u * u * (3 - 2 * u);

/* ---------- the course: tokens -> track heights (2 px steps), spans, hazards, scenery ---------- */
function handcarCompile(def) {
  const H = HANDCAR, X0 = -900, back = def.back || 0;
  const name = s => s.replace(/\{B\}/g, NAMES[back]).replace(/\{F\}/g, NAMES[1 - back]);
  const c = { x0: X0, hills: [], spans: [], hz: [], signs: [], flags: [], zones: [], gate: null, end: null };
  const ys = [];
  let x = X0, y = 0;
  const seg = (len, fn) => { len = Math.max(2, Math.round(len / 2) * 2); for (let k = 0; k < len; k += 2) ys.push(fn(k, len)); x += len; return len; };
  seg(-X0, () => y);
  for (const tk of def.course || []) {
    const t = String(tk), ch = t[0];
    if (t[1] === ':') {
      if (ch === 'S') c.signs.push({ x, text: name(t.slice(2)) });
      else if (ch === 'Z') { const [kind, n] = t.slice(2).split(':'); c.zones.push({ kind, x0: x, x1: x + (parseInt(n, 10) || 600) }); }
      continue;
    }
    const n = parseInt(t.slice(1), 10) || 0, x0 = x, y0 = y;
    if (ch === 'f') seg(n, () => y0);
    else if ('udUD'.includes(ch)) {
      const s = { u: -0.07, d: 0.07, U: -0.16, D: 0.16 }[ch], Bl = 80;
      const len = seg(n, (k, L) => y0 + s * (k < Bl ? k * k / (2 * Bl) : k < L - Bl ? k - Bl / 2 : (L - Bl) - (L - k) * (L - k) / (2 * Bl)));
      y = y0 + s * (len - Bl);
      if (s < 0) c.hills.push({ x0, x1: x, steep: ch === 'U', stalls: 0, gold: false, top: y });
    } else if (ch === 'b' || ch === 't') { seg(n, () => y0); c.spans.push({ x0, x1: x, kind: ch === 'b' ? 'creek' : 'canyon' }); }
    else if (ch === 'F') c.flags.push({ x, on: false, t: 0 });
    else if (ch === 'K') {
      const flag = x + 720;
      c.hz.push({ kind: 'fix', sign: x, flag, buffer: flag + H.flagGap, gap: flag + H.flagGap + 46, state: 'broken', t: 0, crashes: 0, gold: false });
      seg(1250, () => y0);
    } else if (ch === 'C') {
      c.hz.push({ kind: 'curve', sign: x, x0: x + 700, x1: x + 1160, vMax: H.curveV, crashes: 0, gold: false, hit: false, passed: false, tilt: 0 });
      seg(1300, () => y0);
    } else if (ch === 'W') {
      c.hz.push({ kind: 'cows', sign: x, cx: x + 720, state: 'idle', t: 0, crashes: 0, gold: false });
      seg(1080, () => y0);
    } else if (ch === 'M') {
      c.hz.push({ kind: 'mail', sign: x, box: x + 560, state: 'wait', hold: 0, t: 0 });
      seg(920, () => y0);
    } else if (ch === 'X') { c.gate = { x: x + 300 }; seg(1100, () => y0); }
    else if (ch === 'E') {
      const box = x + 820;
      c.end = { kind: 'end', sign: x, box, buffer: box + 210, hold: 0, past: 0, t: 0, crashes: 0, gold: false };
      c.hz.push(c.end);
      seg(1500, () => y0);
    }
  }
  seg(1600, () => y);
  c.gy = Float32Array.from(ys);
  c.len = x;
  return c;
}
// the rail height at x (world px, y down)
function handcarY(st, x) {
  const c = st.c, a = c.gy, f = (x - c.x0) / 2, i = Math.floor(f);
  if (i < 0) return a[0];
  if (i >= a.length - 1) return a[a.length - 1];
  return a[i] + (a[i + 1] - a[i]) * (f - i);
}
// downhill is positive (dy/dx, y down)
const handcarSlope = (st, x) => (handcarY(st, x + 6) - handcarY(st, x - 6)) / 12;
// the ground under the track (an embankment; creeks and canyons dip away under bridges)
function handcarTerrain(st, x) {
  let y = handcarY(st, x) + 10;
  for (const s of st.c.spans) {
    if (x <= s.x0 - 70 || x >= s.x1 + 70) continue;
    const e = s.kind === 'creek' ? 60 : 90, d = s.kind === 'creek' ? 96 : 520;
    const u = clamp(Math.min(x - (s.x0 - 70), (s.x1 + 70) - x) / e, 0, 1);
    y += d * handcarSmooth(u);
  }
  return y;
}

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function handcarKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'pump') return pad ? glyph('act') : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'brake') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  return '';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const handcarQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// which end a player grips (0 back, 1 front), and who grips an end
const handcarEnd = (st, id) => (id === st.back ? 0 : 1);
const handcarAt = (st, end) => (end === 0 ? st.back : 1 - st.back);

/* ---------- a stretch (one room) ---------- */
function handcarRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.back = def.back || 0; st.title = def.title || '';
  st.c = handcarCompile(def);
  for (const h of st.c.hz) if (st.goldKind[h.kind]) h.gold = true;
  st.stats.roomT[k] = null;
  st.sacksN += st.c.hz.filter(h => h.kind === 'mail').length;
  st.x = 0; st.v = 0; st.cp = { x: 0 };
  st.hd = -1; st.down = 1;               // the handle: hd +1 = back end down; down = which end is down (front, so the back pumps first)
  st.lastPushT = -9; st.lastPusher = -1; st.gap = 0; st.prevGap = 0; st.streak = 0; st.jamT = 0; st.clunkT = [0, 0]; st.clunkN = [0, 0];
  st.prevDown = [true, true]; st.braking = [false, false]; st.bob = [0, 0];
  st.state = 'ride'; st.oops = null; st.swap = null; st.fin = null; st.wob = 0; st.tilt = 0; st.held = null; st.stallArm = false; st.brakeT = [0, 0];
  st.roomT = 0; st.segStart = G.time; st.inT = [-99, -99]; st.waitT = 0;
  st.cam = { x: st.x - HANDCAR.camLead, y: handcarY(st, 0) - HANDCAR.camY };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null; st.clackD = 0; st.squealT = 0;
  st.sackFly = null;
  handcarMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function handcarStep(st, dt) {
  if (!st.c) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[k].pendingJump) st.inT[k] = G.time;
  }
  st.roomT += dt;
  if (G.introT > 0) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    st.prevDown = [true, true];
  } else if (st.state === 'ride') handcarRide(st, dt);
  else {
    // (presses while the crew pushes, at the arch or at the finish don't wait for later)
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; st.prevDown[p.id] = p.input.down; st.braking[p.id] = false; }
    if (st.state === 'oops') handcarOopsStep(st, dt);
    else if (st.state === 'swap') { if (handcarSwapStep(st, dt)) return; }
    else if (st.state === 'finish') { if (handcarFinStep(st, dt)) return; }
  }
  handcarHandle(st, dt);
  handcarCam(st, dt);
  handcarFx(st, dt);
  handcarMirror(st);
}
function handcarRide(st, dt) {
  const H = HANDCAR, ps = G.players;
  // presses: ▼ (a fresh press) or the action pushes your end down; ▲ (held) brakes
  for (const p of ps) {
    const i = p.input, fresh = (i.down && !st.prevDown[p.id]) || p.pendingAct;
    st.prevDown[p.id] = i.down;
    st.braking[p.id] = !!(i.jump || i.up);
    p.pendingJump = false; p.pendingAct = false;
    if (fresh) handcarPush(st, p.id);
  }
  if (st.jamT > 0) st.jamT -= dt;
  if (G.time - st.lastPushT > 1.5) st.streak = 0;
  const nB = (st.braking[0] ? 1 : 0) + (st.braking[1] ? 1 : 0);
  handcarPhysics(st, dt, nB);
  handcarHazards(st, dt);
  if (st.state !== 'ride') return;
  // flags, the swap arch
  for (const f of st.c.flags) if (!f.on && st.x > f.x) {
    f.on = true; st.cp = { x: f.x + 40 };
    Sfx.play('handcarFlag'); handcarPop(st, f.x, handcarY(st, f.x) - 120, 'Checkpoint!', '#ffe7a8', 22);
  }
  if (st.c.gate && st.x > st.c.gate.x) { handcarStartSwap(st); return; }
  handcarHelp(st, dt);
  handcarNudges(st, dt);
}
// one player's push on the handle
function handcarPush(st, id) {
  const H = HANDCAR, e = handcarEnd(st, id), now = G.time;
  if (st.jamT > 0) return;
  if (st.down === e) {
    // your end is already down: nothing happens
    st.clunkT[id] = 0.3; st.stats.clunks[id]++;
    Sfx.play('handcarClunk');
    if (!handcarQuiet(id)) handcarPop(st, ...handcarGripXY(st, e, -26), 'Clunk!', '#e9d29a', 18);
    st.clunkN[id] = (st.clunkN[id] || 0) + 1;
    if (st.clunkN[id] >= 2) { st.clunkN[id] = 0; handcarHint(st, id, 'Wait! ' + NAMES[1 - id] + '\'s end is up. Take turns!'); }
    return;
  }
  if (now - st.lastPushT < H.jamWin) {
    // both pushed at the same moment: the handle jams for a beat
    st.jamT = H.jamT; st.stats.jams++;
    st.v = Math.max(0, st.v - (st.lastDV || 0) * 0.5);
    Sfx.play('handcarJam'); handcarPop(st, st.x, handcarY(st, st.x) - 130, 'Jammed!', '#ffffff', 24);
    G.shake = reduceMotion ? 0 : 0.12;
    for (const k of [0, 1]) handcarHint(st, k, 'One at a time! ' + NAMES[st.back] + ', ' + NAMES[1 - st.back] + ', ' + NAMES[st.back] + '...');
    st.streak = 0;
    return;
  }
  // a good push: the rhythm streak counts pushes spaced like the one before
  const gap = now - st.lastPushT;
  if (st.lastPusher >= 0 && st.lastPusher !== id && gap < 1.4) {
    const ratio = st.gap > 0 ? gap / st.gap : 0;
    st.streak = ratio > 0.72 && ratio < 1.38 ? st.streak + 1 : 1;
    st.gap = gap;
  } else { st.streak = 0; st.gap = gap < 1.4 ? gap : 0; }
  if (st.streak > st.stats.bestStreak) st.stats.bestStreak = st.streak;
  if (st.streak === 8 || st.streak === 24 || (st.streak > 0 && st.streak % 48 === 0)) { Sfx.play('handcarStreak'); handcarPop(st, st.x + 30, handcarY(st, st.x) - 190, 'Steady rhythm!', C.gold, 22); }
  st.down = e; st.lastPushT = now; st.lastPusher = id; st.clunkN[id] = 0;
  st.stats.pumps[id]++;
  const bonus = 1 + H.streakK * Math.min(H.streakMax, st.streak);
  const hill = handcarHillAt(st, st.x);
  const gold = hill && hill.gold ? H.goldPush : 1;
  const fade = st.v >= 0 ? clamp(1 - st.v / H.vTop, 0.1, 1) : 1.15;
  let dv = H.pushV * bonus * gold * fade;
  if (st.held) dv = 0;   // waiting for the crew or the cows: the handcar stays put
  st.v += dv; st.lastDV = dv;
  st.bob[id] = 1;
  Sfx.play('handcarPump', id);
  if (gold > 1) handcarSpark(st, ...handcarGripXY(st, e, 0), C.gold, 6);
}
// what a good push adds right now (the rhythm bonus, a gold hill, less the faster you go)
function handcarPushDV(st) {
  const H = HANDCAR, hill = handcarHillAt(st, st.x);
  const fade = st.v >= 0 ? clamp(1 - st.v / H.vTop, 0.1, 1) : 1.15;
  return H.pushV * (1 + H.streakK * Math.min(H.streakMax, st.streak + 1)) * (hill && hill.gold ? H.goldPush : 1) * fade;
}
// the hill under x (with a run-up before it, so a gold push helps on the way in)
function handcarHillAt(st, x) { return st.c.hills.find(h => x > h.x0 - 160 && x < h.x1 + 20) || null; }

/* ---------- the handcar: one dimension along the rails ---------- */
function handcarPhysics(st, dt, nB) {
  const H = HANDCAR, s = handcarSlope(st, st.x);
  let v = st.v;
  const v0 = v;
  // gravity along the slope, rolling resistance and air drag
  let a = H.gS * s;
  if (Math.abs(v) > 0.5) a -= Math.sign(v) * (H.roll + H.drag * Math.abs(v));
  // the brake: both players full, one half
  const bk = H.brake * nB / 2;
  if (st.wob > 0) { st.wob -= dt; a -= Math.sign(v) * 260; }
  v += a * dt;
  if (bk > 0 && v !== 0) { const dv = bk * dt; v = Math.abs(v) <= dv ? 0 : v - Math.sign(v) * dv; }
  // standing still: friction (or the brake) holds it on a gentle slope
  if (Math.abs(v) < 4 && Math.abs(v0) < 4 && Math.abs(H.gS * s) < H.roll + bk + 2) v = 0;
  if (Math.sign(v) !== Math.sign(v0) && v0 !== 0 && Math.abs(H.gS * s) < H.roll + 2) v = 0;
  v = clamp(v, H.vBack, H.vMax);
  if (st.held) v = Math.min(v, 0);
  st.v = v;
  st.x += v * dt;
  // (the start of each stretch has a buffer behind it)
  if (st.x < -200) { st.x = -200; st.v = Math.max(0, st.v); }
  // rail clack and brake squeal
  st.clackD += Math.abs(v) * dt;
  if (st.clackD > 120) { st.clackD = 0; if (Math.abs(v) > 40) Sfx.play('handcarClack'); }
  if (nB && Math.abs(v) > 30) {
    st.squealT -= dt;
    if (st.squealT <= 0) { st.squealT = 0.32; Sfx.play('handcarSqueal', nB); }
    if (Math.random() < dt * 30 * nB) {
      const w = handcarWheelXY(st, Math.random() < 0.5 ? -1 : 1);
      handcarPart(st, w.x, w.y + 8, -v * 0.3 + (Math.random() - 0.5) * 80, -40 - Math.random() * 80, 0.35, Math.random() < 0.5 ? '#ffd36b' : '#ff9a4a', 2 + Math.random() * 2, 500, 'spark');
    }
  } else st.squealT = 0;
  // a hill: rolling back counts as a stall (for the gold push)
  const hill = handcarHillAt(st, st.x);
  if (hill && st.x > hill.x0) {
    if (st.v > 15) st.stallArm = true;
    if (st.stallArm && st.v < -10 && G.time - (hill.lastStall || -9) > 3) {
      st.stallArm = false; hill.stalls++; st.stats.stalls++; hill.lastStall = G.time;
      handcarPop(st, st.x, handcarY(st, st.x) - 130, 'Rolling back!', '#ffe7a8', 22);
      Sfx.play('handcarRollBack');
      const both = G.time - st.inT[0] < HANDCAR.tryWin && G.time - st.inT[1] < HANDCAR.tryWin;
      if (both && hill.stalls >= HANDCAR.stallHelp && !hill.gold) {
        hill.gold = true; st.stats.helps++;
        handcarMsg(st, 'Gold push! Bigger pumps up this hill', C.gold, 3.8); Sfx.play('handcarHelp');
      } else for (const k of [0, 1]) handcarHint(st, k, 'Quick turns up the hill! Pump, pump, pump!');
    }
  } else st.stallArm = false;
}

/* ---------- broken track, curves, cows, mail stations, the town station ---------- */
function handcarHazards(st, dt) {
  const H = HANDCAR, front = st.x + H.half;
  st.held = null; st.tilt = 0;
  for (const hz of st.c.hz) {
    if (hz.kind === 'fix') {
      if (hz.state === 'fixing') {
        hz.t += dt;
        // (the speedy crew starts early: the handcar only waits if it gets there before they're done)
        if (front > hz.flag - H.fixZone) { st.held = hz; st.v = 0; if (front > hz.buffer) st.x = hz.buffer - H.half; }
        if (Math.floor(hz.t * 3.2) !== Math.floor((hz.t - dt) * 3.2) && hz.t > 0.6 && hz.t < H.fixT - 0.3) Sfx.play('handcarHammer');
        if (hz.t >= H.fixT) {
          hz.state = 'fixed'; hz.t = 0; st.held = null;
          Sfx.play('handcarFixed'); handcarPop(st, hz.flag, handcarY(st, hz.flag) - 150, 'All clear!', '#a8f0a0', 26);
          for (let i = 0; i < 12; i++) handcarSpark(st, hz.gap, handcarY(st, hz.gap) - 4, i % 2 ? C.gold : '#ffffff', 1);
        }
      } else if (hz.state === 'broken') {
        if (hz.speedy && front > handcarSignX(hz) - 200) { hz.state = 'fixing'; hz.t = H.fixT * 0.4; hz.early = true; Sfx.play('handcarWhistle'); continue; }
        if (front > hz.flag - H.fixZone && front < hz.buffer + 2 && Math.abs(st.v) < 6) {
          hz.state = 'fixing'; hz.t = 0; st.v = 0; st.held = hz; st.stats.stops++;
          Sfx.play('handcarWhistle');
          handcarPop(st, hz.flag, handcarY(st, hz.flag) - 150, front > hz.flag ? 'Phew! Just in time!' : 'Good stop!', '#a8f0a0', 24);
        } else if (front >= hz.buffer) {
          if (st.v > 45) { hz.crashes++; handcarStartOops(st, 'fix', hz); return; }
          st.x = hz.buffer - H.half; st.v = 0;
        }
      } else if (hz.state === 'fixed') hz.t += dt;
    } else if (hz.kind === 'curve') {
      // over the limit the handcar starts to tip (hz.tilt 0..1, drawn): brake within about half a second and it settles
      // back; far too fast (or still too fast) is a Whoa
      const inC = front > hz.x0 && st.x < hz.x1;
      if (inC && !hz.hit) {
        const over = st.v - hz.vMax;
        hz.tilt = over > 0 ? hz.tilt + dt * (0.8 + over / 45) : Math.max(0, hz.tilt - dt * 2);
      } else hz.tilt = Math.max(0, hz.tilt - dt * 2);
      if (hz.tilt > 0.2 && !hz.warned) { hz.warned = true; handcarPop(st, st.x, handcarY(st, st.x) - 140, 'Too fast! Brake!', '#ffe7a8', 24); Sfx.play('handcarRollBack'); }
      if (!inC) hz.warned = false;
      st.tilt = Math.max(st.tilt, hz.tilt);
      if (inC && !hz.hit && (hz.tilt >= 1 || st.v > hz.vMax * H.curveHard)) {
        hz.hit = true; hz.crashes++; st.stats.whoas++; hz.tilt = 0;
        st.v = Math.min(st.v, hz.vMax * 0.35); st.wob = 1.3; st.streak = 0;
        Sfx.play('handcarWhoa'); handcarPop(st, st.x, handcarY(st, st.x) - 140, 'Whoa!', '#ffffff', 34);
        rumble(0, 0.3, 0.5, 200); rumble(1, 0.3, 0.5, 200);
        for (const k of [0, 1]) handcarHint(st, k, 'Too fast for the curve! Brake at the SLOW sign');
        handcarCrashHelp(st, hz);
      }
      if (st.x > hz.x1) { hz.passed = true; hz.hit = false; }
    } else if (hz.kind === 'cows') {
      if (hz.state === 'idle' && front > hz.cx - H.cowTrig) { hz.state = 'walk'; hz.t = 0; Sfx.play('handcarMoo'); }
      if (hz.state === 'walk') {
        hz.t += dt;
        if (hz.t >= H.cowWalk + 0.9) { hz.state = 'done'; }
      }
      if (handcarCowsBlock(hz) && front > hz.cx - 78 && st.x < hz.cx + 40) {
        st.held = hz;
        if (st.v > 50 && !hz.bumped) {
          hz.bumped = true; hz.crashes++; st.stats.moos++;
          Sfx.play('handcarMoo'); handcarPop(st, hz.cx, handcarY(st, hz.cx) - 120, 'Moo! Whoops!', '#ffffff', 28);
          rumble(0, 0.25, 0.4, 160); rumble(1, 0.25, 0.4, 160);
          for (const k of [0, 1]) handcarHint(st, k, 'Brake for the cows! Both hold the brake');
          handcarCrashHelp(st, hz);
        }
        st.x = Math.min(st.x, hz.cx - 78 - H.half); st.v = st.v > 50 ? -30 : Math.min(0, st.v);
      }
    } else if (hz.kind === 'mail') {
      hz.t += dt;
      if (hz.state !== 'wait') continue;
      if (Math.abs(st.x - hz.box) <= H.mailTol && Math.abs(st.v) < 5) {
        hz.hold += dt;
        if (hz.hold >= H.mailHold) {
          hz.state = 'got'; hz.t = 0; st.sacks++; st.stats.stops++;
          st.sackFly = { x: hz.box + 30, y: handcarY(st, hz.box) - 120, t: 0 };
          Sfx.play('handcarSack'); handcarPop(st, hz.box, handcarY(st, hz.box) - 160, 'Mail sack! ' + st.sacks, C.gold, 26);
        }
      } else hz.hold = 0;
      // stopped a little past the box: the station hand pushes the handcar back (there is no reverse)
      if (st.x > hz.box + H.mailTol && Math.abs(st.v) < 3) { hz.past = (hz.past || 0) + dt; if (hz.past > H.backT) { hz.past = 0; handcarStartOops(st, 'back', hz); return; } }
      else hz.past = 0;
      if (st.x > hz.box + H.mailTol + 50) {
        hz.state = 'missed'; hz.t = 0;
        handcarPop(st, hz.box, handcarY(st, hz.box) - 150, 'Missed the mail!', '#ffe7a8', 22);
        for (const k of [0, 1]) handcarHint(st, k, 'Next station: both brake and stop in the box!');
      }
    } else if (hz.kind === 'end') {
      hz.t += dt;
      const etol = hz.gold ? H.endTolGold : H.endTol;
      // (after 3 overshoots a gold hay bale at the end of the box stops the handcar in it, softly)
      if (hz.crashes >= H.hayHelp && st.x + H.half >= hz.box + etol - 12 + H.half && st.v > 0) {
        if (!hz.hayHit) { hz.hayHit = true; Sfx.play('handcarBoing'); handcarPop(st, st.x + 80, handcarY(st, st.x) - 120, 'Boing! Hay bale!', C.gold, 26); }
        st.x = hz.box + etol - 12; st.v = 0;
      }
      if (Math.abs(st.x - hz.box) <= etol && Math.abs(st.v) < 5) {
        hz.hold += dt;
        if (hz.hold >= H.endHold) { handcarStartFinish(st); return; }
      } else hz.hold = 0;
      if (front >= hz.buffer) {
        if (st.v > 45) { hz.crashes++; handcarStartOops(st, 'end', hz); return; }
        st.x = hz.buffer - H.half; st.v = 0;
      }
      // stopped past the box: the station master pushes the handcar back
      if (st.x > hz.box + etol && Math.abs(st.v) < 3) { hz.past += dt; if (hz.past > H.backT) { hz.past = 0; handcarStartOops(st, 'back', hz); return; } }
      else hz.past = 0;
    }
  }
}
// cows on the track (each cow walks from behind the track to in front of it, a little after the one before)
function handcarCowZ(hz, i) {
  if (hz.state === 'idle') return -1;
  if (hz.state === 'done') return 1.3;
  const u = clamp((hz.t - 0.3 - i * 0.45) / (HANDCAR.cowWalk - 1.2), 0, 1);
  return -1 + 2.3 * u;
}
function handcarCowsBlock(hz) {
  if (hz.state !== 'walk') return false;
  for (let i = 0; i < 3; i++) { const z = handcarCowZ(hz, i); if (z > -0.6 && z < 0.6) return true; }
  return false;
}
// (crashes count for each place, and for each kind of place over the whole level: two Whoas at curves make every later
// curve's sign gold too)
function handcarCrashHelp(st, hz) {
  const both = G.time - st.inT[0] < 8 && G.time - st.inT[1] < 8;
  if (!both) return;
  st.crashKind[hz.kind] = (st.crashKind[hz.kind] || 0) + 1;
  if (hz.kind === 'fix' && hz.crashes >= HANDCAR.crewHelp && !hz.speedy) {
    hz.speedy = true; st.stats.helps++;
    handcarMsg(st, 'Speedy crew! They fix this track before you get there', C.gold, 4); Sfx.play('handcarHelp');
    return;
  }
  if (hz.kind === 'end') {
    if (!hz.gold && hz.crashes >= HANDCAR.crashHelp) { hz.gold = true; st.stats.helps++; handcarMsg(st, 'Gold box! Stop anywhere in the big gold box', C.gold, 4); Sfx.play('handcarHelp'); }
    else if (hz.crashes === HANDCAR.hayHelp) { st.stats.helps++; handcarMsg(st, 'Gold hay bale! It stops you right in the box', C.gold, 4); Sfx.play('handcarHelp'); }
    return;
  }
  if ((hz.crashes >= HANDCAR.crashHelp || st.crashKind[hz.kind] >= HANDCAR.crashHelp) && !st.goldKind[hz.kind]) {
    st.goldKind[hz.kind] = true; st.stats.helps++;
    for (const h of st.c.hz) if (h.kind === hz.kind) h.gold = true;
    handcarMsg(st, 'Gold signs! They flash early: start braking at the gold line', C.gold, 4);
    Sfx.play('handcarHelp');
  }
}
// where the warning sign stands (a gold sign stands much earlier)
const handcarSignX = hz => hz.sign - (hz.gold ? HANDCAR.goldLead : 0);

/* ---------- fails: the friendly work crew pushes you back ---------- */
function handcarStartOops(st, kind, hz) {
  const H = HANDCAR;
  st.state = 'oops';
  let toX = st.cp.x;
  if (kind === 'end' || kind === 'back') toX = hz.box - (kind === 'back' ? (hz.kind === 'mail' ? 300 : 380) : 480);
  else if (hz) toX = Math.min(toX > handcarSignX(hz) - 1400 ? toX : handcarSignX(hz) - 400, handcarSignX(hz) - 150);
  st.oops = { kind, t: 0, x0: st.x, toX, hz: hz || null };
  st.v = 0; st.streak = 0; st.jamT = 0;
  if (kind === 'back') { handcarPop(st, st.x, handcarY(st, st.x) - 130, 'Back it up a bit!', '#ffe7a8', 24); Sfx.play('handcarWhistle'); }
  else {
    st.stats.oops++;
    handcarPop(st, st.x, handcarY(st, st.x) - 130, 'Whoops!', '#ffd0a0', 34); Sfx.play('handcarWhoops');
    G.shake = reduceMotion ? 0 : 0.2; rumble(0, 0.4, 0.5, 220); rumble(1, 0.4, 0.5, 220);
    for (const k of [0, 1]) handcarHint(st, k, kind === 'fix' ? 'Stop before the red flag! Both hold the brake' : 'Brake earlier and stop in the box!', 3.4);
    if ((kind === 'fix' || kind === 'end') && hz) handcarCrashHelp(st, hz);
  }
}
function handcarOopsStep(st, dt) {
  const o = st.oops;
  o.t += dt;
  // 0-0.7 s: a soft bump (boing); then the crew walks up and pushes the handcar back along the rails
  if (o.t < 0.7) { st.v = 0; return; }
  const u = handcarSmooth(clamp((o.t - 0.9) / (HANDCAR.oopsT - 1.2), 0, 1));
  st.x = handcarLerp(o.x0, o.toX, u); st.v = 0;
  if (o.t >= HANDCAR.oopsT) {
    st.x = o.toX; st.state = 'ride'; st.oops = null;
    handcarPop(st, st.x, handcarY(st, st.x) - 130, o.kind === 'back' ? 'Try again!' : 'Off you go!', '#ffe7a8', 22);
    st.prevDown = [true, true];
  }
}

/* ---------- the swap arch and the town station ---------- */
function handcarStartSwap(st) {
  st.state = 'swap'; st.swap = { t: 0 };
  st.stats.roomT[st.k] = G.time - st.segStart;
  Sfx.play('handcarSwap'); rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
  const g = st.c.gate;
  for (let i = 0; i < 26; i++) { const a = -Math.PI * Math.random(); handcarPart(st, g.x, handcarY(st, g.x) - 150, Math.cos(a) * 220, Math.sin(a) * 220, 1, ['#ff6b4a', '#5b95ff', '#ffd36b', '#ffffff'][i % 4], 4, 300, 'conf'); }
}
function handcarSwapStep(st, dt) {
  const sw = st.swap;
  sw.t += dt;
  // the handcar coasts to a stop under the arch
  st.v = Math.max(0, st.v - 380 * dt); st.x += st.v * dt;
  if (sw.t > 0.7 && !sw.hop) { sw.hop = true; Sfx.play('handcarHop', 0); Sfx.play('handcarHop', 1); }
  if (sw.t >= HANDCAR.swapT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    levelClear(); return true;
  }
  return false;
}
function handcarStartFinish(st) {
  st.state = 'finish'; st.fin = { t: 0 };
  st.v = 0;
  st.stats.roomT[st.k] = G.time - st.segStart;
  st.stats.finishT = G.time;
  handcarPop(st, st.c.end.box, handcarY(st, st.c.end.box) - 200, 'You made it to town!', C.gold, 30);
  Sfx.play('handcarArrive'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
}
function handcarFinStep(st, dt) {
  const fin = st.fin, e = st.c.end;
  fin.t += dt;
  [0.5, 1.0, 1.5].forEach((tt, i) => {
    if (fin.t <= tt || fin['b' + i]) return;
    fin['b' + i] = true; Sfx.play('handcarBell');
    handcarPop(st, e.box + 70 + i * 80, handcarY(st, e.box) - 230 - (i % 2) * 24, 'Ding!', C.gold, 26);
  });
  if (fin.t > 1.6 && !fin.conf) {
    fin.conf = true;
    for (let i = 0; i < 50; i++) { const a = -Math.PI * (0.15 + 0.7 * Math.random()); handcarPart(st, e.box, handcarY(st, e.box) - 140, Math.cos(a) * 300, Math.sin(a) * 300, 1.6, ['#ff6b4a', '#5b95ff', '#ffd36b', '#8fe3b0', '#ffffff'][i % 5], 4, 280, 'conf'); }
  }
  if (fin.t >= HANDCAR.finT && !fin.cleared) {
    fin.cleared = true;
    G.level.goal = { x: e.box - st.cam.x, y: handcarY(st, e.box) - 150 - st.cam.y };
    levelClear();
    return true;
  }
  return false;
}

/* ---------- gold help: the hill stalls are counted in handcarPhysics; crashes in handcarCrashHelp ---------- */
function handcarHelp(st, dt) {
  // the gold sign's message repeats once when you reach it, so the help is never a surprise
  for (const hz of st.c.hz) {
    if (!hz.gold || hz.goldSaid || !('crashes' in hz)) continue;
    if (st.x > handcarSignX(hz) - 500 && st.x < handcarSignX(hz)) { hz.goldSaid = true; handcarMsg(st, 'Gold sign ahead! Brake at the gold line', C.gold, 3.2); }
  }
  void dt;
}

/* ---------- what the crew needs to do right now (the prompts, the panels and the computer read this) ----------
   brakeA: the braking one player alone can do (the computer plans with only its own brake) */
function handcarNeeds(st, brakeA) {
  const H = HANDCAR, out = { what: 'pump', hz: null, dist: 9999, vAllow: H.vMax, vBrake: H.vMax, stopAt: null, wait: false, kind: null };
  if (!st.c || st.state !== 'ride') { out.what = 'none'; return out; }
  const front = st.x + H.half, v = st.v;
  const bA = brakeA == null ? H.brake * 0.5 : brakeA;
  // how much the next push would add (a push that would carry you over the limit means: coast)
  out.dv = handcarPushDV(st);
  // the brake you can count on here (less on a downhill run-in)
  const slope = Math.max(0, handcarSlope(st, st.x));
  const eff = Math.max(60, bA + H.roll - H.gS * slope);
  let best = null;
  for (const hz of st.c.hz) {
    let stopAt = null, vL = 0, info = null;
    if (hz.kind === 'fix' && hz.state !== 'fixed') {
      if (hz.state === 'fixing' && front > hz.flag - H.fixZone) { out.what = 'waitFix'; out.wait = true; out.hz = hz; out.kind = 'fix'; return out; }
      stopAt = hz.flag - 60 - H.half; info = 'fix';
    } else if (hz.kind === 'curve' && !hz.passed) {
      if (st.x > hz.x1) continue;
      stopAt = hz.x0 - H.half; vL = hz.vMax - 22; info = 'curve';
      if (front > hz.x0) {
        out.kind = 'curveIn'; out.hz = hz; out.vAllow = hz.vMax - 12; out.vBrake = hz.vMax - 10;
        out.what = v > hz.vMax - 12 ? 'brake' : v + out.dv > hz.vMax - 12 ? 'coast' : 'pump';
        return out;
      }
    } else if (hz.kind === 'cows' && hz.state !== 'done') {
      if (st.x > hz.cx + 40) continue;
      if (hz.state === 'walk' && !handcarCowsBlock(hz) && handcarCowZ(hz, 2) > 0.6) continue;
      if (st.held === hz) { out.what = 'waitCows'; out.wait = true; out.hz = hz; out.kind = 'cows'; return out; }
      stopAt = hz.cx - 82 - H.half; info = 'cows';
    } else if (hz.kind === 'mail' && hz.state === 'wait') { stopAt = hz.box; info = 'mail'; }
    else if (hz.kind === 'end') { stopAt = hz.box; info = 'end'; }
    if (stopAt == null) continue;
    const d = stopAt - st.x;
    if (info !== 'curve' && info !== 'end' && d < (info === 'mail' ? -(H.mailTol + 50) : -80)) continue;
    if (!best || d < best.d) best = { d, hz, vL, info };
  }
  if (!best) return out;
  const d = best.d;
  out.hz = best.hz; out.kind = best.info; out.dist = d; out.stopAt = best.hz.kind === 'curve' ? null : st.x + d;
  const vL = best.vL;
  out.vAllow = Math.sqrt(vL * vL + 2 * 0.55 * eff * Math.max(0, d)) - 18;
  out.vBrake = Math.sqrt(vL * vL + 2 * 0.82 * eff * Math.max(0, d));
  const tol = best.info === 'end' ? (best.hz.gold ? H.endTolGold : H.endTol) : best.info === 'mail' ? H.mailTol : 30;
  if ((best.info === 'end' || best.info === 'mail') && d < -tol && Math.abs(v) < 5) { out.what = 'back'; out.wait = true; return out; }
  if (best.info === 'mail' || best.info === 'end') {
    if (Math.abs(d) <= tol - 2 && Math.abs(v) < 5) { out.what = 'hold'; return out; }
    if (Math.abs(d) <= tol * 0.6) { out.what = v > 4 ? 'brake' : 'hold'; return out; }
  }
  if (v > out.vBrake || (d < 0 && best.info !== 'curve' && v > 0)) out.what = 'brake';
  else if (v + out.dv * (d < 600 ? 1 : 0.3) > out.vAllow) out.what = 'coast';
  else out.what = 'pump';
  if (best.info !== 'curve' && d < 300 && out.what === 'pump') out.what = 'creep';
  return out;
}
// the gentle lessons, once each stretch, when they first matter
function handcarNudges(st, dt) {
  const nd = handcarNeeds(st);
  const up = handcarAt(st, 1 - st.down);
  // waiting a long time for the partner to pump
  if (nd.what === 'pump' && Math.abs(st.v) < 30 && G.time - st.lastPushT > 3) {
    st.waitT += dt;
    if (st.waitT > 3) { st.waitT = -6; handcarHint(st, up, 'Your turn! Push ' + handcarKey(up, 'pump') + ' to pump'); }
  } else st.waitT = Math.max(Math.min(st.waitT, 0) + dt, -6);
  // holding the brake while it's time to roll
  for (const k of [0, 1]) {
    const idle = st.braking[k] && ['pump', 'creep'].includes(nd.what) && Math.abs(st.v) < 25 && !st.held;
    st.brakeT[k] = idle ? st.brakeT[k] + dt : 0;
    if (st.brakeT[k] > 2.5) { st.brakeT[k] = -4; handcarHint(st, k, 'Let go of the brake ' + handcarKey(k, 'brake') + ' so you can roll!'); }
  }
  if (nd.kind === 'fix' && nd.dist < 1400) handcarHintOnceBoth(st, 'fix' + st.k, 'Broken track! Brake and stop before the red flag');
  if (nd.kind === 'mail' && nd.dist < 900) handcarHintOnceBoth(st, 'mail' + st.k, 'Mail stop! Brake and stop in the box');
  if (nd.kind === 'curve' && nd.dist < 1100) handcarHintOnceBoth(st, 'curve' + st.k, 'Sharp curve! Brake to slow down');
  if (nd.kind === 'cows' && nd.dist < 1100) handcarHintOnceBoth(st, 'cows' + st.k, 'Cows! Brake and wait for them');
}
function handcarHintOnceBoth(st, key, text) {
  if (st.hinted[key]) return;
  st.hinted[key] = true;
  for (const k of [0, 1]) handcarHint(st, k, text, 3.2);
}

/* ---------- small helpers ---------- */
function handcarHint(st, id, text, life) { if (handcarQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || HANDCAR.hintLife }; }
function handcarMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function handcarPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function handcarPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function handcarSpark(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 120; handcarPart(st, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5, col, 3 + Math.random() * 2, 0, 'star'); } }

// the handcar's pose: its middle on the rails and its tilt (a curve too fast rocks it up on two wheels)
function handcarPose(st) {
  const H = HANDCAR, x = st.x, yb = handcarY(st, x - H.wb), yf = handcarY(st, x + H.wb);
  let a = Math.atan2(yf - yb, 2 * H.wb), y = (yb + yf) / 2;
  if (st.tilt > 0 && st.state === 'ride') { a -= st.tilt * 0.16 + Math.sin(G.clock * 30) * 0.015 * st.tilt; y -= st.tilt * 6; }
  if (st.wob > 0) { const u = st.wob / 1.3; a += -Math.abs(Math.sin(u * Math.PI * 3)) * 0.2 * u; y -= Math.abs(Math.sin(u * Math.PI * 3)) * 8 * u; }
  if (st.state === 'oops' && st.oops && st.oops.t < 0.7 && st.oops.kind !== 'back') { const u = st.oops.t / 0.7; a += Math.sin(u * Math.PI * 4) * 0.06 * (1 - u); }
  return { x, y, a, ca: Math.cos(a), sa: Math.sin(a) };
}
const handcarLocal = (P, lx, ly) => ({ x: P.x + P.ca * lx - P.sa * ly, y: P.y + P.sa * lx + P.ca * ly });
function handcarWheelXY(st, s) { const P = handcarPose(st); return handcarLocal(P, s * HANDCAR.wb, -HANDCAR.wr); }
// a grip of the handle (end 0 back, 1 front) in world px, lifted by dy
function handcarGripLocal(st, end) {
  const H = HANDCAR, a = st.hd * H.swing, s = end === 0 ? -1 : 1;
  // hd +1: the back end is down
  return { x: s * H.arm * Math.cos(a), y: H.pivotY + (end === 0 ? 1 : -1) * H.arm * Math.sin(a) };
}
function handcarGripXY(st, end, dy) { const P = handcarPose(st), g = handcarGripLocal(st, end), w = handcarLocal(P, g.x, g.y); return [w.x, w.y + (dy || 0)]; }
// the handle swings toward the end that is down (it stops in the middle while jammed)
function handcarHandle(st, dt) {
  const want = st.jamT > 0 ? (st.down === 0 ? 0.25 : -0.25) + Math.sin(G.time * 40) * 0.05 : st.down === 0 ? 1 : -1;
  st.hd = approach(st.hd, want, dt * HANDCAR.ease * (st.jamT > 0 ? 0.6 : 1));
  for (const k of [0, 1]) { st.bob[k] = Math.max(0, st.bob[k] - dt * 3); st.clunkT[k] = Math.max(0, st.clunkT[k] - dt); }
}
function handcarCam(st, dt) {
  const H = HANDCAR, cam = st.cam;
  let fx = st.x;
  if (st.state === 'finish') fx = st.c.end.box + 80;
  const tx = fx - H.camLead + clamp(st.v * 0.35, -40, 150);
  let ty = handcarY(st, fx) * 0.75 + handcarY(st, fx + 320) * 0.25 - H.camY;
  if (G.introT > 0) ty -= 20;
  const k = st.state === 'oops' ? 3 : 5;
  cam.x += (tx - cam.x) * Math.min(1, dt * k);
  cam.y += (ty - cam.y) * Math.min(1, dt * 4);
  const sx = st.x - cam.x;
  if (sx < 200) cam.x = st.x - 200; else if (sx > W - 260) cam.x = st.x - (W - 260);
  const sy = handcarY(st, st.x) - cam.y;
  if (sy < 250) cam.y = handcarY(st, st.x) - 250; else if (sy > 440) cam.y = handcarY(st, st.x) - 440;
}
function handcarFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'dust') { q.vx *= 1 - dt * 2; q.vy *= 1 - dt * 2; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.3);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  for (const f of st.c.flags) if (f.on) f.t += dt;
  if (st.sackFly) { st.sackFly.t += dt; if (st.sackFly.t > 0.7) st.sackFly = null; }
  // dust behind the wheels
  if (st.state === 'ride' && Math.abs(st.v) > 120) {
    st.dustT = (st.dustT || 0) - dt;
    if (st.dustT <= 0) { st.dustT = 0.09; const w = handcarWheelXY(st, -1); handcarPart(st, w.x - 12, w.y + 10, -st.v * 0.2, -15 - Math.random() * 30, 0.7, 'rgba(232,194,122,0.7)', 4 + Math.random() * 4, 20, 'dust'); }
  }
}
// where each player stands (world px, feet), and the hop over the handle when they swap ends
function handcarSpot(st, id) {
  const H = HANDCAR, P = handcarPose(st), e = handcarEnd(st, id), s = e === 0 ? -1 : 1;
  let lx = s * H.stand, ly = H.deckY, hop = 0;
  if (st.state === 'swap' && st.swap) {
    const u = clamp((st.swap.t - 0.7) / 1.0, 0, 1);
    lx = handcarLerp(s * H.stand, -s * H.stand, handcarSmooth(u));
    hop = (e === 0 ? 96 : 66) * 4 * u * (1 - u);
  }
  const w = handcarLocal(P, lx, ly);
  return { x: w.x, y: w.y - hop, lx, hop };
}
// copy the spots into the engine players (screen px): name tags and bubbles read p.x / p.y
function handcarMirror(st) {
  const cam = st.cam;
  for (const p of G.players) {
    const s = handcarSpot(st, p.id);
    p.x = s.x - cam.x - PW / 2; p.y = s.y - cam.y - 74;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = st.v;
    p.face = handcarEnd(st, p.id) === 0 ? 1 : -1;
    p.stun = 0;
  }
}

MODES.handcar = {
  // medal (js/medals.js): Gold with 70% of the mail by 4:20, at most 3 bumps (whoas, whoopses and moos) and at most 12
  // jammed handles; Silver with 40% by 6:20
  medals: { bronze: 'Pump all the way to town', goals: [{ key: 'time', gold: 260, silver: 380 },
    { key: 'sacks', gold: 0.7, silver: 0.4, more: true, pct: true, word: 'the mail sacks' },
    { key: 'bumps', gold: 3, text: n => `${n} or fewer whoas, whoopses and moos`, gap: (v, n) => `${Math.max(1, Math.ceil(v - n))} fewer whoas, whoopses and moos` },
    { key: 'jams', gold: 12, word: 'jammed handle' }] },
  medalValues() { const st = G.mst, s = st.stats, all = st.sacksAll || st.sacksN; return s ? { sacks: all ? st.sacks / all : 1, bumps: s.oops + s.whoas + s.moos, jams: s.jams } : {}; },
  HANDCAR,
  compile: handcarCompile, y: handcarY, slope: handcarSlope, needs: handcarNeeds, end: handcarEnd, at: handcarAt, key: handcarKey, cowsBlock: handcarCowsBlock,
  setup(st, L) {
    st.stats = { pumps: [0, 0], clunks: [0, 0], jams: 0, bestStreak: 0, whoas: 0, moos: 0, oops: 0, stalls: 0, stops: 0, helps: 0, roomT: [], finishT: 0 };
    st.sacks = 0; st.sacksN = 0; st.crashKind = {}; st.goldKind = {};
    // count every stretch's mail stations up front (the HUD shows "x of all")
    const def = LEVELS[G.levelIndex];
    st.sacksAll = (def.rooms || [def]).reduce((n, r) => n + (r.course || []).filter(t => String(t) === 'M').length, 0);
    handcarRoom(st, L, 0);
  },
  room(k, L) { handcarRoom(G.mst, L, k); },
  step(dt) { handcarStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn on the handcar instead
  draw() {
    const st = G.mst;
    if (!st.c) return;
    handcarDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.c) return;
    handcarDrawFront(st);
  },
  hud() { const st = G.mst; if (st.c) handcarHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.sacksAll || st.sacksN, got = st.sacks, frac = all ? got / all : 1;
    const out = [
      { label: 'Mail sacks', value: got + ' of ' + all },
      { label: 'Pumps', values: s.pumps.slice() },
      { label: 'Rhythm streak', value: String(s.bestStreak) },
    ];
    const words = frac >= 0.95 ? 'Every mail sack delivered. Rootin\' tootin\' teamwork!' : frac >= 0.6 ? 'A big bag of mail for the town. Yee-haw!' : 'Pumped all the way to town together!';
    out.push(words + ' Whoas: ' + s.whoas + ', Whoopses: ' + s.oops + ', Moos: ' + s.moos + '.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
let handcarSkyG = null;
function handcarDrawWorld(st) {
  const cam = st.cam;
  handcarDrawSky(st);
  handcarDrawFar(st);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  handcarDrawBack(st);
  handcarDrawGround(st);
  handcarDrawTrack(st);
  handcarDrawThings(st, false);
  ctx.restore();
}
function handcarDrawFront(st) {
  const cam = st.cam;
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  handcarDrawCrew(st);
  handcarDrawCar(st);
  handcarDrawThings(st, true);
  handcarDrawForeground(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.x < cam.x - 30 || q.x > cam.x + W + 30 || q.y < cam.y - 30 || q.y > cam.y + H + 30) continue;
    ctx.globalAlpha = q.kind === 'dust' ? a * 0.7 : a; ctx.fillStyle = q.col;
    if (q.kind === 'star') { handcarStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'dust') { circle(q.x, q.y, q.size * (1.5 - 0.5 * a)); ctx.fill(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  handcarDrawTurn(st);
  ctx.restore();
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - cam.x, 110, W - 110), y = clamp(q.y - cam.y - q.t * 30, 96, H - 120);
    ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function handcarStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// a sunset-gold sky, a big low sun, thin clouds
function handcarDrawSky(st) {
  if (!handcarSkyG) {
    handcarSkyG = ctx.createLinearGradient(0, 0, 0, H);
    handcarSkyG.addColorStop(0, '#f09a57'); handcarSkyG.addColorStop(0.45, '#ffc77e'); handcarSkyG.addColorStop(0.8, '#ffe6b0'); handcarSkyG.addColorStop(1, '#fff0c9');
  }
  ctx.fillStyle = handcarSkyG; ctx.fillRect(0, 0, W, H);
  const sx = 700 - st.cam.x * 0.02 % 40, sy = 190;
  ctx.fillStyle = 'rgba(255,236,170,0.35)'; circle(sx, sy, 110); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,190,0.55)'; circle(sx, sy, 76); ctx.fill();
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(G.clock * 0.04); ctx.fillStyle = 'rgba(255,240,190,0.22)';
  ctx.beginPath(); for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); ctx.moveTo(-7, 60); ctx.lineTo(0, 124 + (i % 2) * 22); ctx.lineTo(7, 60); ctx.closePath(); } ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff6d6'; circle(sx, sy, 54); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(sx - 12, sy - 12, 30); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,120,0.7)'; ctx.lineWidth = 2; circle(sx, sy, 54); ctx.stroke();
  // long wispy clouds
  for (let k = 0; k < 6; k++) {
    const span = 1500, x = ((k * 263 - st.cam.x * 0.05 - G.clock * 6) % span + span) % span - 200, y = 50 + (k % 3) * 34 + (hash(k, 3) % 20);
    ctx.fillStyle = 'rgba(214,130,100,0.25)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 4, 90 + (k % 3) * 30, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = k % 2 ? 'rgba(255,214,190,0.6)' : 'rgba(255,240,225,0.65)';
    ctx.beginPath(); ctx.ellipse(x, y, 90 + (k % 3) * 30, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 50, y - 6, 50, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(x + 46, y - 9, 30, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  }
}
// the red mesas far away (slow) and nearer buttes (faster)
function handcarDrawFar(st) {
  const cam = st.cam, yb = 330 - (cam.y + HANDCAR.camY) * 0.08;
  // far mesas
  for (const [par, span, col, top, hMin, hVar, base] of [[0.08, 900, '#eaa06e', '#f4b98a', 70, 60, yb], [0.2, 700, '#d27a48', '#e08e5a', 60, 80, yb + 34]]) {
    const off = cam.x * par;
    const k0 = Math.floor((off - 300) / span), k1 = Math.floor((off + W + 300) / span);
    for (let k = k0; k <= k1; k++) {
      const hh = hash(k, span), x = k * span - off + (hh % 300), w = 200 + (hh >> 3) % 260, h = hMin + (hh >> 6) % hVar;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x - 40, base + 4); ctx.lineTo(x, base - h + 10); ctx.lineTo(x + 12, base - h); ctx.lineTo(x + w - 12, base - h); ctx.lineTo(x + w, base - h + 12); ctx.lineTo(x + w + 50, base + 4); ctx.closePath(); ctx.fill();
      // a shaded right cliff and gullies, then the sunlit top and a soft outline
      ctx.fillStyle = 'rgba(120,45,25,0.16)'; ctx.beginPath(); ctx.moveTo(x + w - 12, base - h); ctx.lineTo(x + w, base - h + 12); ctx.lineTo(x + w + 50, base + 4); ctx.lineTo(x + w + 6, base + 4); ctx.lineTo(x + w - 30, base - h + 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,45,25,0.14)'; ctx.lineWidth = 2; ctx.beginPath(); for (let g = 1; g < 5; g++) { const gx = x + (w * g) / 5 + (hh >> g) % 14; ctx.moveTo(gx, base - h + 8); ctx.lineTo(gx + 4, base - h * 0.4); } ctx.stroke();
      ctx.fillStyle = top; ctx.fillRect(x + 12, base - h, w - 24, 6);
      ctx.fillStyle = 'rgba(255,240,210,0.4)'; ctx.fillRect(x + 12, base - h, w - 24, 1.5);
      ctx.strokeStyle = 'rgba(120,45,25,0.2)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 40, base + 4); ctx.lineTo(x, base - h + 10); ctx.lineTo(x + 12, base - h); ctx.lineTo(x + w - 12, base - h); ctx.lineTo(x + w, base - h + 12); ctx.lineTo(x + w + 50, base + 4); ctx.stroke();
      // rock layers
      ctx.strokeStyle = 'rgba(140,60,30,0.18)'; ctx.lineWidth = 3;
      ctx.beginPath(); for (let j = 1; j < 3; j++) { ctx.moveTo(x - 4 + j * 6, base - h + j * h / 3); ctx.lineTo(x + w + 6 + j * 12, base - h + j * h / 3); } ctx.stroke();
      // a lone butte now and then
      if (hh % 3 === 0) { const bx = x + w + 90; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx - 14, base + 4); ctx.lineTo(bx - 6, base - h * 0.9); ctx.lineTo(bx + 22, base - h * 0.9); ctx.lineTo(bx + 30, base + 4); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(120,45,25,0.16)'; ctx.beginPath(); ctx.moveTo(bx + 12, base - h * 0.9); ctx.lineTo(bx + 22, base - h * 0.9); ctx.lineTo(bx + 30, base + 4); ctx.lineTo(bx + 16, base + 4); ctx.closePath(); ctx.fill(); ctx.fillStyle = top; ctx.fillRect(bx - 6, base - h * 0.9, 28, 3); }
    }
  }
  // the desert floor far away
  ctx.fillStyle = '#efc58a'; ctx.fillRect(0, yb + 30, W, H);
  ctx.fillStyle = 'rgba(255,240,210,0.4)'; ctx.fillRect(0, yb + 30, W, 2);
  ctx.strokeStyle = 'rgba(190,130,70,0.22)'; ctx.lineWidth = 1.2;
  for (let k = 0; k < 9; k++) { const hh = hash(k, 91), x = ((k * 150 - cam.x * 0.3 + (hh % 80)) % 1350 + 1350) % 1350 - 120, y = yb + 40 + (hh % 40); ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.quadraticCurveTo(x, y - 3, x + 22, y); ctx.stroke(); }
}
// scenery behind the track: telegraph poles, cacti, rocks, windmills, the town
function handcarDrawBack(st) {
  const cam = st.cam, x0 = cam.x - 80, x1 = cam.x + W + 80;
  // telegraph poles every 360 px, with sagging wires
  ctx.strokeStyle = 'rgba(90,60,40,0.55)'; ctx.lineWidth = 1.5;
  const p0 = Math.floor(x0 / 360) - 1, p1 = Math.floor(x1 / 360) + 1;
  for (let k = p0; k <= p1; k++) {
    const x = k * 360 + 120, y = handcarTerrain(st, x) - 8;
    if (st.c.spans.some(s => x > s.x0 - 60 && x < s.x1 + 60)) continue;
    dkPost(x, y - 120, 6, 120, '#7a5032');
    dkPic('hcPoleArm', 36, 9, 18, 2, c => dkPlank(c, -16, 0, 32, 5, '#7a5032', 3, { r: 1, lw: 0.6, outline: '#4a2e18' }), x, y - 112);
    ctx.fillStyle = '#b9e0ff'; ctx.fillRect(x - 14, y - 116, 3, 4); ctx.fillRect(x + 11, y - 116, 3, 4);
    const nx = x + 360, ny = handcarTerrain(st, nx) - 8;
    if (!st.c.spans.some(s => nx > s.x0 - 60 && nx < s.x1 + 60)) {
      for (const dx of [-12, 12]) { ctx.beginPath(); ctx.moveTo(x + dx, y - 114); ctx.quadraticCurveTo((x + nx) / 2 + dx, (y + ny) / 2 - 92, nx + dx, ny - 114); ctx.stroke(); }
    }
  }
  // back cacti and rocks (more in a cactus forest), each from a steady hash so they never jump
  const c0 = Math.floor(x0 / 90), c1 = Math.floor(x1 / 90);
  for (let k = c0; k <= c1; k++) {
    const h = hash(k, 77), x = k * 90 + (h % 60);
    if (st.c.spans.some(s => x > s.x0 - 80 && x < s.x1 + 80)) continue;
    const zone = st.c.zones.find(z => x > z.x0 && x < z.x1);
    const forest = zone && zone.kind === 'cactus', town = zone && zone.kind === 'town';
    if (town) continue;
    const y = handcarTerrain(st, x) - 14 - (h >> 4) % 18;
    if (forest ? h % 3 !== 0 : h % 7 === 0) handcarCactus(x, y, 0.7 + ((h >> 8) % 40) / 100, h);
    else if (h % 11 === 1) handcarRock(x, y + 6, 10 + (h >> 5) % 10, h);
    else if (h % 13 === 2) handcarBush(x, y + 6, h);
  }
  // windmills on the flats, now and then
  const w0 = Math.floor(x0 / 2600), w1 = Math.floor(x1 / 2600);
  for (let k = w0; k <= w1; k++) {
    const x = k * 2600 + 1300, y = handcarTerrain(st, x) - 18;
    if (st.c.spans.some(s => x > s.x0 - 200 && x < s.x1 + 200) || st.c.zones.some(z => z.kind === 'town' && x > z.x0 - 200 && x < z.x1 + 200)) continue;
    handcarWindmill(x, y);
  }
  for (const z of st.c.zones) if (z.kind === 'town' && z.x1 > x0 - 300 && z.x0 < x1 + 300) handcarDrawTown(st, z);
}
function handcarCactus(x, y, s, h) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#5f9a52'; ctx.strokeStyle = '#3f6e3a'; ctx.lineWidth = 2.5;
  rr(-9, -70, 18, 72, 9); ctx.fill(); ctx.stroke();
  const l = (h >> 2) % 2, r = (h >> 3) % 2;
  if (l || !r) { ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(-22, -26); ctx.quadraticCurveTo(-26, -26, -26, -32); ctx.lineTo(-26, -50); ctx.stroke(); rr(-31, -54, 11, 30, 5.5); ctx.fill(); ctx.stroke(); rr(-24, -31, 16, 9, 4); ctx.fill(); }
  if (r) { rr(20, -62, 11, 32, 5.5); ctx.fill(); ctx.stroke(); rr(8, -40, 17, 9, 4); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -64); ctx.lineTo(-3, -4); ctx.stroke();
  if (h % 5 === 0) { ctx.fillStyle = '#ff8fb1'; circle(0, -71, 4); ctx.fill(); ctx.fillStyle = '#ffd36b'; circle(0, -71, 1.6); ctx.fill(); }
  ctx.restore();
}
function handcarRock(x, y, r, h) {
  ctx.fillStyle = '#b8643f'; ctx.strokeStyle = '#7a3a26'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - r * 1.3, y + 2); ctx.lineTo(x - r, y - r * 0.8); ctx.lineTo(x + r * 0.2 * ((h % 3) - 1), y - r); ctx.lineTo(x + r, y - r * 0.6); ctx.lineTo(x + r * 1.3, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,220,180,0.3)'; ctx.fillRect(x - r * 0.8, y - r * 0.7, r * 0.6, 3);
}
function handcarBush(x, y, h) {
  ctx.strokeStyle = '#a57a3e'; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 6); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (12 + (h >> i) % 6), y + Math.sin(a) * (12 + (h >> i) % 6)); } ctx.stroke();
}
function handcarWindmill(x, y) {
  ctx.strokeStyle = '#7a5032'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 4, y - 120); ctx.moveTo(x + 22, y); ctx.lineTo(x + 4, y - 120); ctx.moveTo(x - 16, y - 40); ctx.lineTo(x + 16, y - 40); ctx.moveTo(x - 11, y - 80); ctx.lineTo(x + 11, y - 80); ctx.stroke();
  ctx.save(); ctx.translate(x, y - 126); ctx.rotate(G.clock * 1.2);
  ctx.fillStyle = '#e9e2d0'; ctx.strokeStyle = '#8a7a66'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(30, -6); ctx.lineTo(30, 4); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(x + 4, y - 128); ctx.lineTo(x + 34, y - 136); ctx.lineTo(x + 34, y - 118); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a5032'; circle(x, y - 126, 5); ctx.fill();
}
// the little town: false-front buildings, a water tower, bunting
// each shop word's font size, measured once
const HANDCAR_SIGN_FS = new Map();
function handcarDrawTown(st, z) {
  const fronts = [
    { w: 150, h: 120, col: '#c98e57', trim: '#7d5030', word: 'GENERAL STORE' },
    { w: 130, h: 150, col: '#e0b36a', trim: '#8a5a2a', word: 'SALOON' },
    { w: 120, h: 110, col: '#d97a5a', trim: '#7a3a26', word: 'HOTEL' },
    { w: 140, h: 130, col: '#b9a07a', trim: '#6b5438', word: 'POST OFFICE' },
    { w: 110, h: 100, col: '#e8c27a', trim: '#8a6a3a', word: 'BAKERY' },
  ];
  let x = z.x0 + 40, i = 0;
  // (no shop fronts behind a station's depot)
  const depots = st.c.hz.filter(h => h.kind === 'mail' || h.kind === 'end').map(h => [h.box - 190, h.box + (h.kind === 'end' ? 330 : 240)]);
  while (x < z.x1 - 100) {
    const f = fronts[i % fronts.length], y = handcarTerrain(st, x + f.w / 2) - 30;
    const dep = depots.find(([a, b]) => x < b && x + f.w > a);
    if (dep) { x = dep[1] + 20; continue; }
    ctx.fillStyle = f.col; ctx.strokeStyle = f.trim; ctx.lineWidth = 3;
    ctx.fillRect(x, y - f.h, f.w, f.h); ctx.strokeRect(x, y - f.h, f.w, f.h);
    ctx.fillStyle = f.trim; ctx.fillRect(x - 6, y - f.h - 6, f.w + 12, 10);
    // the sign board
    // wall boards, then the sign board with its word sized to fit
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let bx = x + 12; bx < x + f.w - 4; bx += 12) { ctx.moveTo(bx, y - f.h + 4); ctx.lineTo(bx, y - 2); } ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + f.w - 14, y - f.h + 2, 12, f.h - 4);
    ctx.fillStyle = '#fff3d6'; rr(x + 10, y - f.h + 14, f.w - 20, 24, 4); ctx.fill();
    ctx.strokeStyle = f.trim; ctx.lineWidth = 1.5; rr(x + 10, y - f.h + 14, f.w - 20, 24, 4); ctx.stroke();
    const fkey = f.word + '|' + f.w; let fs = HANDCAR_SIGN_FS.get(fkey);
    if (fs === undefined) { fs = 16; ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif'; const tw = ctx.measureText(f.word).width; if (tw > f.w - 36) fs = Math.max(9, Math.floor(fs * (f.w - 36) / tw)); if (document.fonts.status === 'loaded') HANDCAR_SIGN_FS.set(fkey, fs); }
    text(f.word, x + f.w / 2, y - f.h + 27, fs, f.trim, 'center');
    // windows and door, a porch roof
    ctx.fillStyle = '#7a5a3a'; for (const wx of [0.2, 0.62]) { rr(x + f.w * wx, y - f.h + 52, f.w * 0.2, 26, 3); ctx.fill(); }
    ctx.fillStyle = '#ffe9a8'; for (const wx of [0.2, 0.62]) { ctx.fillRect(x + f.w * wx + 3, y - f.h + 55, f.w * 0.2 - 6, 9); }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); for (const wx of [0.2, 0.62]) { ctx.rect(x + f.w * wx + 4, y - f.h + 56, 3, 7); } ctx.fill();
    ctx.fillStyle = f.trim; rr(x + f.w * 0.42, y - 40, f.w * 0.16, 40, 3); ctx.fill();
    ctx.fillStyle = '#a36a3a'; ctx.fillRect(x - 4, y - 48, f.w + 8, 6);
    for (const px of [x + 2, x + f.w - 6]) ctx.fillRect(px, y - 44, 4, 44);
    x += f.w + 40 + (i % 2) * 30; i++;
  }
  // a water tower at the start of town
  const wx = z.x0 - 90, wy = handcarTerrain(st, wx) - 20;
  ctx.strokeStyle = '#6b4426'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(wx - 28, wy); ctx.lineTo(wx - 20, wy - 100); ctx.moveTo(wx + 28, wy); ctx.lineTo(wx + 20, wy - 100); ctx.moveTo(wx - 24, wy - 40); ctx.lineTo(wx + 24, wy - 70); ctx.moveTo(wx + 24, wy - 40); ctx.lineTo(wx - 24, wy - 70); ctx.stroke();
  ctx.fillStyle = '#b77a45'; ctx.strokeStyle = '#704622'; ctx.lineWidth = 2.5; rr(wx - 36, wy - 160, 72, 62, 6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#704622'; ctx.beginPath(); for (let k = 1; k < 4; k++) { ctx.moveTo(wx - 36, wy - 160 + k * 15); ctx.lineTo(wx + 36, wy - 160 + k * 15); } ctx.stroke();
  ctx.fillStyle = '#8a5228'; ctx.beginPath(); ctx.moveTo(wx - 42, wy - 158); ctx.lineTo(wx, wy - 190); ctx.lineTo(wx + 42, wy - 158); ctx.closePath(); ctx.fill();
  // bunting across the street
  const bx0 = z.x0 + 20, bx1 = Math.min(z.x1, bx0 + 700), by = handcarTerrain(st, bx0) - 190;
  ctx.strokeStyle = '#6b4426'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx0, by); ctx.quadraticCurveTo((bx0 + bx1) / 2, by + 40, bx1, by); ctx.stroke();
  for (let k = 1; k < 20; k++) {
    const u = k / 20, x2 = handcarLerp(bx0, bx1, u), y2 = by + 80 * u * (1 - u);
    ctx.fillStyle = ['#ff6b4a', '#5b95ff', '#ffd36b', '#8fe3b0'][k % 4];
    ctx.beginPath(); ctx.moveTo(x2 - 7, y2); ctx.lineTo(x2 + 7, y2); ctx.lineTo(x2, y2 + 13); ctx.closePath(); ctx.fill();
  }
}
// the ground: sandy top, red rock below; creeks and canyons under the bridges
// ---------- rich still art (cached; dkPic and the dk* kit live in world18/runaway-ship.js) ----------
// a world-anchored grain texture for the canyon dirt: specks, tiny stones and hairline cracks (a repeating pattern)
let handcarGrainPat = null;
function handcarGrain() {
  if (handcarGrainPat && (typeof handcarGrainPat === 'string' || handcarGrainPat.sc === canvas.width)) return dkPatAlign(handcarGrainPat);   // (built at the canvas scale; dkPatAlign maps it 1:1 to pixels)
  const S = Math.max(1, Math.min(3, canvas.width / W)), n = 256, cv = document.createElement('canvas'); cv.width = cv.height = Math.round(n * S);
  const c = cv.getContext('2d'); c.scale(cv.width / n, cv.width / n);
  for (let i = 0; i < 900; i++) { const hh = hash(i, 3131), x = hh % n, y = (hh >>> 8) % n; c.fillStyle = hh % 5 === 0 ? 'rgba(255,225,190,0.32)' : hh % 5 === 1 ? 'rgba(90,30,15,0.3)' : 'rgba(140,60,35,0.22)'; c.fillRect(x, y, hh % 7 === 0 ? 2 : 1, 1); }
  for (let i = 0; i < 40; i++) { const hh = hash(i, 3132), x = hh % n, y = (hh >>> 8) % n, r = 1 + (hh >>> 4) % 2; c.fillStyle = 'rgba(110,45,25,0.35)'; c.beginPath(); c.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,220,180,0.3)'; c.fillRect(x - r * 0.7, y - r * 0.7, r * 0.8, 0.8); }
  c.strokeStyle = 'rgba(90,30,15,0.22)'; c.lineWidth = 0.8; c.beginPath();
  for (let i = 0; i < 10; i++) { const hh = hash(i, 3133); let x = hh % n, y = (hh >>> 8) % n; c.moveTo(x, y); for (let k = 0; k < 3; k++) { x += 4 + (hash(i, k) % 6); y += (hash(k, i) % 7) - 3; c.lineTo(x, y); } }
  c.stroke();
  try { handcarGrainPat = ctx.createPattern(cv, 'repeat'); handcarGrainPat.setTransform(new DOMMatrix().scale(n / cv.width)); handcarGrainPat.sc = canvas.width; } catch (e) { handcarGrainPat = 'rgba(0,0,0,0)'; }
  return dkPatAlign(handcarGrainPat);
}
// embedded stones (a few cached shapes, blitted where the hash says)
function handcarStone(x, y, v) {
  const cols = ['#a0583a', '#8a4a30', '#b8705a', '#9a8a7a'], r = 3 + (v % 3);
  dkPic('hcStone|' + v, r * 2 + 8, r * 2 + 8, r + 3, r + 3, c => dkCobble(c, 0, 0, r * 1.25, r, cols[v % 4], 600 + v), x, y);
}
// a railway tie: grained timber with two spikes and a soft shadow
function handcarTie(c) {
  c.fillStyle = 'rgba(60,20,5,0.3)'; c.fillRect(-7, 2, 17, 7);
  dkPlank(c, -8, 0, 16, 7, '#6b4426', 5, { r: 1, lit: 0.25, lw: 0.8 });
  dkNail(c, -4.5, 1.5, 1); dkNail(c, 4.5, 1.5, 1);
}
function handcarDrawGround(st) {
  const cam = st.cam, x0 = Math.floor((cam.x - 20) / 6) * 6, x1 = cam.x + W + 20, yB = cam.y + H + 20;
  // canyons first (far walls and a river far below)
  for (const s of st.c.spans) {
    if (s.x1 + 120 < x0 || s.x0 - 120 > x1) continue;
    if (s.kind === 'canyon') {
      const gy = handcarY(st, s.x0);
      ctx.fillStyle = '#b8643f'; ctx.fillRect(s.x0 - 70, gy + 40, s.x1 - s.x0 + 140, yB - gy);
      dkPatFill(handcarGrain(), s.x0 - 70, gy + 40, s.x1 - s.x0 + 140, yB - gy);
      for (let k = 0; k < 6; k++) {
        const yy = gy + 80 + k * 46;
        ctx.fillStyle = '#9c4f33'; ctx.beginPath(); ctx.moveTo(s.x0 - 70, yy);
        for (let x = s.x0 - 70; x <= s.x1 + 70; x += 20) ctx.lineTo(x, yy + Math.sin(x / 37 + k) * 2.5);
        for (let x = s.x1 + 70; x >= s.x0 - 70; x -= 20) ctx.lineTo(x, yy + 10 + Math.sin(x / 29 + k) * 3);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,215,170,0.28)'; ctx.fillRect(s.x0 - 70, yy + 11, s.x1 - s.x0 + 140, 1.5);
      }
      ctx.fillStyle = 'rgba(60,20,10,0.25)'; ctx.fillRect(s.x0 - 70, gy + 40, 22, yB - gy); ctx.fillRect(s.x1 + 48, gy + 40, 22, yB - gy);
      ctx.fillStyle = '#6fb7d8'; ctx.fillRect(s.x0 - 70, gy + 330, s.x1 - s.x0 + 140, 40);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let k = 0; k < 10; k++) { const xx = s.x0 + ((k * 137 + G.clock * 30) % (s.x1 - s.x0)); ctx.fillRect(xx, gy + 340 + (k % 3) * 8, 24, 2); }
    }
  }
  ctx.beginPath(); ctx.moveTo(x0, yB);
  const topY = [];
  for (let x = x0; x <= x1; x += 6) { const y = handcarTerrain(st, x); topY.push(y); ctx.lineTo(x, y); }
  ctx.lineTo(x1, yB); ctx.closePath();
  // the dirt, darker deeper down (one opaque gradient), then fine grain anchored to the world (a pattern, so it slides
  // with the ground)
  const gg = ctx.createLinearGradient(0, cam.y + 300, 0, cam.y + H); gg.addColorStop(0, '#c06a48'); gg.addColorStop(1, '#aa593c');
  ctx.fillStyle = gg; ctx.fill();
  dkPatFill(handcarGrain());
  // rock strata following the ground: a darker band with a wavy lower edge, a lit lip under it and a dark seam
  for (const [dy, th, col] of [[44, 9, 'rgba(122,58,38,0.42)'], [96, 12, 'rgba(110,48,30,0.4)'], [150, 8, 'rgba(160,80,50,0.35)']]) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) { const y = handcarTerrain(st, x) + dy + Math.sin(x / 70) * 4; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    for (let x = Math.floor(x1 / 12) * 12; x >= x0; x -= 12) ctx.lineTo(x, handcarTerrain(st, x) + dy + th + Math.sin(x / 70) * 4 + Math.sin(x / 23) * 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,170,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) { const y = handcarTerrain(st, x) + dy + th + 1.5 + Math.sin(x / 70) * 4 + Math.sin(x / 23) * 2; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80,25,10,0.3)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) { const y = handcarTerrain(st, x) + dy + Math.sin(x / 70) * 4; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // sandy top
  ctx.strokeStyle = '#e8c27a'; ctx.lineWidth = 14; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 6) { const y = handcarTerrain(st, x) + 6; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();
  // pebbles
  // shaded embedded stones (cached shapes) scattered through the dirt
  for (let k = Math.floor(x0 / 37); k < x1 / 37; k++) { const h = hash(k, 5), x = k * 37 + h % 20, y = handcarTerrain(st, x) + 24 + (h >>> 4) % 40; handcarStone(x, y, (h >>> 9) % 6); }
  for (let k = Math.floor(x0 / 61); k < x1 / 61; k++) { const h = hash(k, 15), x = k * 61 + h % 30, y = handcarTerrain(st, x) + 70 + (h >>> 4) % 90; handcarStone(x, y, 6 + (h >>> 9) % 4); }
  // the gravel shoulder along the sandy top
  ctx.fillStyle = 'rgba(150,90,50,0.5)'; ctx.beginPath();
  for (let k = Math.floor(x0 / 9); k < x1 / 9; k++) { const h = hash(k, 25), x = k * 9 + h % 6, y = handcarTerrain(st, x) + 9 + (h >>> 5) % 5, r = 1 + (h >>> 8) % 2; ctx.moveTo(x + r, y); ctx.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2); }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,210,0.5)'; ctx.beginPath();
  for (let k = Math.floor(x0 / 9); k < x1 / 9; k++) { const h = hash(k, 25), x = k * 9 + h % 6, y = handcarTerrain(st, x) + 9 + (h >>> 5) % 5; ctx.rect(x - 1, y - 1, 1, 0.8); }
  ctx.fill();
  // dry grass tufts on the lip
  ctx.strokeStyle = '#b89a50'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath();
  for (let k = Math.floor(x0 / 83); k < x1 / 83; k++) { const h = hash(k, 35); if (h % 3) continue; const x = k * 83 + h % 40, y = handcarTerrain(st, x) + 13; for (let j = -2; j <= 2; j++) { ctx.moveTo(x + j, y); ctx.quadraticCurveTo(x + j * 2, y - 4, x + j * 3.5, y - 7 + Math.abs(j)); } }
  ctx.stroke(); ctx.lineCap = 'butt';
  // a sunlit lip on the sandy top and the odd dry tuft
  ctx.strokeStyle = 'rgba(255,240,200,0.6)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0, x = x0; i < topY.length; i++, x += 6) { if (i) ctx.lineTo(x, topY[i] - 0.5); else ctx.moveTo(x, topY[i] - 0.5); }
  ctx.stroke();
  // creeks
  for (const s of st.c.spans) {
    if (s.kind !== 'creek' || s.x1 + 120 < x0 || s.x0 - 120 > x1) continue;
    const gy = handcarY(st, s.x0) + 92;
    ctx.fillStyle = 'rgba(80,160,210,0.85)'; ctx.fillRect(s.x0 - 20, gy, s.x1 - s.x0 + 40, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let k = 0; k < 6; k++) { const xx = s.x0 + ((k * 71 + G.clock * 40) % (s.x1 - s.x0)); ctx.fillRect(xx, gy + 4 + (k % 2) * 4, 16, 2); }
  }
}
// bridges, the trestle, ties and rails
function handcarDrawTrack(st) {
  const cam = st.cam, x0 = cam.x - 40, x1 = cam.x + W + 40, yB = cam.y + H + 20;
  for (const s of st.c.spans) {
    if (s.x1 + 80 < x0 || s.x0 - 80 > x1) continue;
    const ty = handcarY(st, s.x0);
    if (s.kind === 'creek') {
      // a plank bridge on posts
      for (let x = s.x0 - 30; x < s.x1 + 30; x += 70) {
        for (const [ax, ay, bx, by] of [[x, ty + 14, x + 70, ty + 50], [x + 70, ty + 14, x, ty + 50]]) {
          ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(by - ay, bx - ax));
          dkPic('hcBrace', 82, 8, 1, 4, c => dkPlank(c, 0, -2, 80, 4, '#7a4a26', 21, { r: 1, lw: 0.7 }), 0, 0);
          ctx.restore();
        }
      }
      for (let x = s.x0 - 30; x <= s.x1 + 30; x += 70) { const g = Math.round(handcarTerrain(st, x) - ty); dkPic('hcPost|' + g, 12, g + 2, 6, 0, c => { dkPlank(c, -4, 0, 8, g, '#8a5228', g, { vert: true, r: 1, nails: true, lw: 0.8 }); c.fillStyle = 'rgba(40,80,90,0.35)'; c.fillRect(-4, g - 26, 8, 26); }, x, ty + 6); }
      const bl = Math.round(s.x1 - s.x0 + 80);
      dkPic('hcDeckB|' + bl, bl + 4, 16, 2, 2, c => { c.fillStyle = 'rgba(40,20,5,0.3)'; c.fillRect(0, 12, bl, 3); dkPlank(c, 0, 0, bl, 12, '#b77a45', bl, { r: 2, lit: 0.35 }); for (let px = 10; px < bl; px += 22) { c.fillStyle = 'rgba(90,50,20,0.45)'; c.fillRect(px, 1, 1, 10); dkNail(c, px - 3, 6, 1); dkNail(c, px + 4, 6, 1); } }, s.x0 - 40, ty + 2);
    } else {
      // the tall canyon trestle: a timber lattice to the bottom of the screen
      // (each timber drawn three times: a dark outline, the wood, a thin lit edge on its upper left)
      const beams = () => {
        ctx.beginPath(); for (let x = s.x0 - 60; x <= s.x1 + 60; x += 80) { ctx.moveTo(x, ty + 6); ctx.lineTo(x - 10, yB); } ctx.stroke();
      };
      const lattice = () => {
        ctx.beginPath();
        for (let y = ty + 40; y < yB; y += 70) {
          for (let x = s.x0 - 60; x < s.x1 + 60; x += 80) { ctx.moveTo(x, y); ctx.lineTo(x + 80, y + 70); ctx.moveTo(x + 80, y); ctx.lineTo(x, y + 70); }
          ctx.moveTo(s.x0 - 60, y); ctx.lineTo(s.x1 + 60, y);
        }
        ctx.stroke();
      };
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 5.5; lattice(); ctx.strokeStyle = '#8f5a30'; ctx.lineWidth = 3.5; lattice();
      ctx.save(); ctx.translate(-0.8, -0.8); ctx.strokeStyle = 'rgba(255,215,170,0.35)'; ctx.lineWidth = 1; lattice(); ctx.restore();
      ctx.strokeStyle = '#4e2c14'; ctx.lineWidth = 8; beams(); ctx.strokeStyle = '#7a4a26'; ctx.lineWidth = 6; beams();
      ctx.save(); ctx.translate(-1.6, 0); ctx.strokeStyle = 'rgba(255,215,170,0.35)'; ctx.lineWidth = 1.2; beams(); ctx.restore();
      ctx.fillStyle = '#c9c5d6'; ctx.beginPath();
      for (let y = ty + 40; y < yB; y += 70) for (let x = s.x0 - 60; x <= s.x1 + 60; x += 80) { const bx = x - 10 * (y - ty - 6) / (yB - ty - 6); ctx.moveTo(bx + 1.6, y); ctx.arc(bx, y, 1.6, 0, Math.PI * 2); }
      ctx.fill();
      const tl = Math.round(s.x1 - s.x0 + 140);
      dkPic('hcDeckT|' + tl, tl + 4, 20, 2, 2, c => { c.fillStyle = 'rgba(40,20,5,0.3)'; c.fillRect(0, 14, tl, 3); dkPlank(c, 0, 0, tl, 14, '#9c6236', tl, { r: 2, lit: 0.32 }); for (let px = 16; px < tl; px += 40) { dkRivet(c, px, 7, 1.6, '#8c8494'); } }, s.x0 - 70, ty + 2);
    }
  }
  // ties
  const k0 = Math.floor(x0 / 26), k1 = Math.ceil(x1 / 26);
  const gaps = st.c.hz.filter(h => h.kind === 'fix' && h.state !== 'fixed');
  for (let k = k0; k <= k1; k++) {
    const x = k * 26, y = handcarY(st, x);
    dkPic('hcTie|' + (k & 1), 22, 12, 9, 2, c => { handcarTie(c); if (k & 1) { c.fillStyle = 'rgba(255,230,190,0.08)'; c.fillRect(-8, 0, 16, 7); } }, x, y + 1);
  }
  // the rails (with a gap at broken track)
  const railPath = (dy, col, lw) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt'; ctx.beginPath();
    let on = false;
    for (let x = x0; x <= x1; x += 8) {
      const broken = gaps.some(g => x > g.gap - 34 && x < g.gap + 34);
      if (broken) { if (on) { ctx.stroke(); ctx.beginPath(); on = false; } continue; }
      const y = handcarY(st, x) + dy;
      if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  railPath(0.5, '#3a3448', 3);
  railPath(-1, '#5a5468', 5);
  railPath(-2.5, '#c9c5d6', 1.5);
  railPath(-3.2, 'rgba(255,255,255,0.55)', 0.6);
}
// the hazard sets, stations, signs, flags, the arch (front: the bits in front of the handcar)
function handcarDrawThings(st, front) {
  const cam = st.cam, x0 = cam.x - 300, x1 = cam.x + W + 300, t = G.clock;
  if (!front) {
    for (const s of st.c.signs) if (s.x > x0 && s.x < x1) handcarBoard(s.x, handcarY(st, s.x) - 6, s.text, '#fff3d6', '#704622');
    for (const f of st.c.flags) if (f.x > x0 && f.x < x1) handcarFlag(st, f);
  }
  for (const hz of st.c.hz) {
    const sx = handcarSignX(hz);
    if (!front && hz.kind !== 'end' && sx > x0 && sx < x1) handcarWarnSign(st, hz, sx);
    if (hz.kind === 'fix' && hz.flag > x0 - 200 && hz.flag < x1 + 200) handcarDrawFix(st, hz, front);
    else if (hz.kind === 'curve' && hz.x1 > x0 && hz.x0 < x1 && !front) handcarDrawCurve(st, hz);
    else if (hz.kind === 'cows' && hz.cx > x0 && hz.cx < x1) handcarDrawCows(st, hz, front);
    else if ((hz.kind === 'mail' || hz.kind === 'end') && hz.box > x0 - 200 && hz.box < x1 + 200) handcarDrawStation(st, hz, front);
    // the gold brake line
    if (!front && hz.gold && sx > x0 && sx < x1) {
      const lx = sx + 120, ly = handcarY(st, lx);
      ctx.fillStyle = Math.sin(t * 8) > 0 ? C.gold : 'rgba(255,197,61,0.6)'; ctx.fillRect(lx - 5, ly - 4, 10, 12);
      ctx.fillRect(lx - 30, ly + 8, 60, 4);
    }
  }
  if (!front && st.c.gate && st.c.gate.x > x0 && st.c.gate.x < x1) handcarDrawGate(st, false);
  if (front && st.c.gate && st.c.gate.x > x0 && st.c.gate.x < x1) handcarDrawGate(st, true);
}
// a wooden sign board on two posts
function handcarBoard(x, y, str, bg, ink) {
  ctx.font = '15px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  const w = Math.max(90, ctx.measureText(str).width + 26), h = 30, top = y - 92;
  ctx.fillStyle = '#7a5032'; ctx.fillRect(x - w / 2 + 10, top, 6, y - top); ctx.fillRect(x + w / 2 - 16, top, 6, y - top);
  ctx.fillStyle = '#b77a45'; ctx.strokeStyle = '#704622'; ctx.lineWidth = 2.5; rr(x - w / 2, top, w, h, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = bg; rr(x - w / 2 + 4, top + 4, w - 8, h - 8, 3); ctx.fill();
  text(str, x, top + h / 2 + 0.5, 15, ink, 'center');
}
// a yellow diamond warning sign (gold and flashing with gold help)
function handcarWarnSign(st, hz, x) {
  const y = handcarY(st, x) - 8, t = G.clock, gold = hz.gold, flash = gold && Math.sin(t * 9) > 0;
  const word = { fix: 'BROKEN TRACK', curve: 'SHARP CURVE', cows: 'COW CROSSING', mail: 'MAIL STOP' }[hz.kind];
  dkPost(x, y - 98, 6, 98, '#5a3a22');
  ctx.save(); ctx.translate(x, y - 104); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = flash ? '#fff2a0' : gold ? C.gold : hz.kind === 'mail' ? '#cfe8ff' : '#ffd54a'; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 3;
  rr(-24, -24, 48, 48, 5); ctx.fill(); ctx.stroke();
  ctx.restore();
  // the picture on the sign
  ctx.save(); ctx.translate(x, y - 104); ctx.strokeStyle = '#3a2a18'; ctx.fillStyle = '#3a2a18'; ctx.lineWidth = 3;
  if (hz.kind === 'fix') { ctx.fillRect(-14, 2, 10, 4); ctx.fillRect(4, 2, 10, 4); ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(0, -10); ctx.lineTo(4, 4); ctx.stroke(); }
  else if (hz.kind === 'curve') { ctx.beginPath(); ctx.moveTo(-6, 14); ctx.lineTo(-6, 0); ctx.quadraticCurveTo(-6, -10, 6, -10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2, -16); ctx.lineTo(10, -10); ctx.lineTo(2, -4); ctx.fill(); }
  else if (hz.kind === 'cows') { ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-9, 4, 3, 8); ctx.fillRect(6, 4, 3, 8); circle(12, -5, 5); ctx.fill(); }
  else if (hz.kind === 'mail') { ctx.fillStyle = '#7a5a2a'; ctx.beginPath(); ctx.moveTo(-9, 12); ctx.lineTo(-11, -4); ctx.lineTo(-4, -10); ctx.lineTo(4, -10); ctx.lineTo(11, -4); ctx.lineTo(9, 12); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // the words board under it
  ctx.font = '13px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  const w = ctx.measureText(word).width + 16;
  ctx.fillStyle = gold ? C.gold : '#fff3d6'; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2; rr(x - w / 2, y - 70, w, 20, 4); ctx.fill(); ctx.stroke();
  text(word, x, y - 59.5, 13, '#3a2a18', 'center');
  if (hz.kind === 'curve') {
    // a SLOW board under it
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2.5; rr(x - 26, y - 46, 52, 20, 4); ctx.fill(); ctx.stroke();
    text('SLOW', x, y - 35.5, 13, '#c0392b', 'center');
  }
}
function handcarFlag(st, f) {
  const y = handcarY(st, f.x) - 6;
  ctx.fillStyle = '#6b4426'; ctx.fillRect(f.x - 2, y - 70, 4, 70);
  const wave = Math.sin(G.clock * 6 + f.x) * 3;
  ctx.fillStyle = f.on ? '#8fe3b0' : '#e8e2d0';
  ctx.beginPath(); ctx.moveTo(f.x + 2, y - 70); ctx.quadraticCurveTo(f.x + 16, y - 66 + wave, f.x + 30, y - 62); ctx.lineTo(f.x + 2, y - 52); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
}
// a friendly cowpoke (the flagman, the work crew, the station hands): a hat, a bandana, a big smile
function handcarCowpoke(x, y, o) {
  o = o || {};
  const s = o.s || 1, shirt = o.shirt || '#6fa8dc', hat = o.hat || '#8a5a2a', face = o.face || 1, t = G.clock;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
  // legs
  ctx.fillStyle = '#4a5a8a'; const step = o.walk ? Math.sin(t * 10) * 4 : 0;
  ctx.fillRect(-7 + step, -18, 6, 18); ctx.fillRect(1 - step, -18, 6, 18);
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(-9 + step, -3, 9, 4); ctx.fillRect(0 - step, -3, 9, 4);
  // body
  ctx.fillStyle = shirt; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; rr(-10, -42, 20, 26, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.scarf || '#e0533d'; ctx.beginPath(); ctx.moveTo(-7, -42); ctx.lineTo(7, -42); ctx.lineTo(0, -34); ctx.closePath(); ctx.fill();
  // arms
  ctx.strokeStyle = shirt; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const arm = o.arm == null ? 0.4 : o.arm;
  ctx.beginPath(); ctx.moveTo(8, -38); ctx.lineTo(8 + Math.cos(-arm) * 14, -38 + Math.sin(-arm) * 14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, -38); ctx.lineTo(-14, -26); ctx.stroke();
  // head
  ctx.fillStyle = '#f2c7a0'; circle(0, -52, 9); ctx.fill();
  ctx.fillStyle = C.ink; circle(3, -53, 1.6); ctx.fill(); circle(-2, -53, 1.6); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(1, -50, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  if (o.mustache) { ctx.fillStyle = '#6b4426'; ctx.beginPath(); ctx.ellipse(1, -49, 5, 2, 0, 0, Math.PI * 2); ctx.fill(); }
  // hat
  ctx.fillStyle = hat; ctx.beginPath(); ctx.ellipse(0, -59, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  rr(-8, -70, 16, 12, 5); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-8, -62, 16, 2.5);
  ctx.restore();
  return { hx: x + face * s * (8 + Math.cos(-arm) * 14), hy: y + s * (-38 + Math.sin(-arm) * 14) };
}
// broken track: the flagman, the gap, the buffer, the work crew with a plank
function handcarDrawFix(st, hz, front) {
  const t = G.clock, fy = handcarY(st, hz.flag), gy = handcarY(st, hz.gap);
  if (!front) {
    // the buffer stop (red and white)
    const bx = hz.buffer + 8, by = handcarY(st, bx);
    if (hz.state !== 'fixed') {
      dkPic('hcBuffer', 34, 42, 14, 38, c => {
        c.fillStyle = 'rgba(40,15,5,0.3)'; c.beginPath(); c.ellipse(3, 0, 12, 2.5, 0, 0, Math.PI * 2); c.fill();
        dkPlank(c, -4, -30, 12, 30, '#6b4426', 8, { vert: true, r: 1, nails: 2, lw: 0.8 });
        c.save(); rrOn(c, -10, -34, 24, 14, 3); c.clip();
        c.fillStyle = '#ffffff'; c.fillRect(-10, -34, 24, 14);
        c.fillStyle = '#e0533d'; for (let k = -1; k < 4; k++) { c.beginPath(); c.moveTo(-10 + k * 8, -20); c.lineTo(-6 + k * 8, -20); c.lineTo(2 + k * 8, -34); c.lineTo(-2 + k * 8, -34); c.closePath(); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-10, -34, 24, 1.5); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(-10, -23, 24, 3);
        c.restore();
        c.strokeStyle = '#3a2a18'; c.lineWidth = 2; rrOn(c, -10, -34, 24, 14, 3); c.stroke();
        dkRivet(c, -6, -27, 1.3, '#c9c5d6'); dkRivet(c, 10, -27, 1.3, '#c9c5d6');
      }, bx, by);
    }
    // the crew at the gap: hammering while fixing, then waving
    const fixing = hz.state === 'fixing', done = hz.state === 'fixed';
    const cx = hz.gap + 70, cy = handcarY(st, cx) - 2;
    if (!done || hz.t < 6) {
      const ham = fixing ? Math.sin(t * 20) * 0.9 : done ? -1.2 + Math.sin(t * 8) * 0.4 : 0.3;
      handcarCowpoke(cx, cy, { shirt: '#e8a23a', hat: '#6b4426', face: -1, arm: ham, mustache: true });
      handcarCowpoke(cx + 50, cy, { shirt: '#8fbf6a', hat: '#a5683a', face: -1, arm: done ? -1.4 : 0.6, s: 0.92 });
    }
    // the plank: carried in, laid in the gap
    const u = fixing ? clamp(hz.t / (HANDCAR.fixT * 0.6), 0, 1) : done ? 1 : 0;
    if (u < 1) {
      const px = handcarLerp(cx + 25, hz.gap, handcarSmooth(u)), py = handcarLerp(cy - 44, gy - 4, handcarSmooth(u));
      ctx.save(); ctx.translate(px, py); ctx.rotate((1 - u) * -0.3);
      dkPic('hcFixPlank', 80, 12, 40, 6, c => dkPlank(c, -38, -4, 76, 8, '#c98e57', 14, { r: 2, nails: true, outline: '#7d5030', lw: 1.5 }), 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = '#5a5468'; ctx.fillRect(hz.gap - 36, gy - 4, 72, 4); ctx.fillStyle = '#c9c5d6'; ctx.fillRect(hz.gap - 36, gy - 4, 72, 1.2);
      dkPic('hcFixLaid', 80, 10, 40, 1, c => dkPlank(c, -38, 0, 76, 6, '#c98e57', 15, { r: 1, nails: true, outline: '#7d5030', lw: 1 }), hz.gap, gy + 1);
    }
    // the broken rail ends sticking up a little
    if (!done) {
      ctx.strokeStyle = '#5a5468'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hz.gap - 40, gy - 1); ctx.lineTo(hz.gap - 32, gy - 8); ctx.moveTo(hz.gap + 40, gy - 1); ctx.lineTo(hz.gap + 32, gy - 6); ctx.stroke();
      ctx.fillStyle = '#7a5032'; ctx.save(); ctx.translate(hz.gap - 6, gy + 6); ctx.rotate(0.5); ctx.fillRect(-8, -3, 16, 6); ctx.restore();
    }
  } else {
    // the flagman in front of the track, with his flag: red, then green
    const x = hz.flag + 10, y = fy + 30;
    const green = hz.state === 'fixed';
    const wave = green ? Math.sin(t * 10) * 0.5 - 1.1 : hz.state === 'broken' ? Math.sin(t * 6) * 0.6 - 0.9 : -0.3;
    const hand = handcarCowpoke(x, y, { shirt: '#c0392b', hat: '#8a5a2a', face: -1, arm: wave, s: 1.05 });
    ctx.strokeStyle = '#6b4426'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hand.hx, hand.hy + 6); ctx.lineTo(hand.hx, hand.hy - 36); ctx.stroke();
    const fl = Math.sin(t * 8) * 4;
    ctx.fillStyle = green ? '#3fbf5a' : '#e83a2a';
    ctx.beginPath(); ctx.moveTo(hand.hx, hand.hy - 36); ctx.quadraticCurveTo(hand.hx - 14, hand.hy - 32 + fl, hand.hx - 28, hand.hy - 30); ctx.lineTo(hand.hx, hand.hy - 18); ctx.closePath(); ctx.fill();
  }
}
// a sharp curve: chevron boards on the far side of the bend
function handcarDrawCurve(st, hz) {
  const t = G.clock;
  // the bend itself: the far rail curves away behind a rocky bluff
  const mx = (hz.x0 + hz.x1) / 2, my = handcarY(st, mx);
  // (cached) a sandstone bluff: strata bands, a lit left face and a shaded right one, cracks, ledges, scrub and a sandy cap
  dkPic('hcBluff', 430, 156, 210, 148, c => {
    const bp = () => { c.beginPath(); c.moveTo(-200, -4); c.quadraticCurveTo(-160, -120, -40, -130); c.quadraticCurveTo(80, -140, 170, -70); c.lineTo(210, -4); c.closePath(); };
    c.fillStyle = '#b8643f'; bp(); c.fill();
    c.save(); bp(); c.clip();
    for (let k = 0; k < 7; k++) { const yy = -122 + k * 17; c.fillStyle = k % 2 ? 'rgba(150,70,40,0.35)' : 'rgba(220,140,90,0.25)'; c.beginPath(); c.moveTo(-210, yy); for (let x = -210; x <= 215; x += 15) c.lineTo(x, yy + Math.sin(x / 40 + k) * 3); for (let x = 215; x >= -210; x -= 15) c.lineTo(x, yy + 8 + Math.sin(x / 33 + k * 2) * 3); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,220,180,0.3)'; c.fillRect(-210, yy + 8, 425, 1); }
    c.fillStyle = 'rgba(255,220,180,0.22)'; c.beginPath(); c.moveTo(-200, -4); c.quadraticCurveTo(-160, -120, -40, -130); c.lineTo(-70, -60); c.lineTo(-120, -4); c.closePath(); c.fill();
    c.fillStyle = 'rgba(80,25,10,0.3)'; c.beginPath(); c.moveTo(60, -128); c.quadraticCurveTo(120, -110, 170, -70); c.lineTo(210, -4); c.lineTo(80, -4); c.lineTo(100, -70); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(80,25,10,0.45)'; c.lineWidth = 1.3; c.beginPath();
    for (const [x, y] of [[-110, -100], [-20, -118], [70, -96], [130, -60], [-60, -50]]) { c.moveTo(x, y); c.lineTo(x + 4, y + 16); c.lineTo(x - 2, y + 30); c.lineTo(x + 3, y + 44); }
    c.stroke();
    for (let i = 0; i < 160; i++) { const hh = hash(i, 4141); c.fillStyle = hh % 3 ? 'rgba(110,40,20,0.3)' : 'rgba(255,225,190,0.4)'; c.fillRect(-200 + hh % 410, -130 + (hh >>> 9) % 126, 1.2, 1.2); }
    c.fillStyle = 'rgba(60,20,10,0.25)'; c.fillRect(-210, -14, 425, 10);
    c.restore();
    for (const [x, y, w] of [[-130, -78, 40], [40, -96, 46], [-60, -40, 34]]) { c.fillStyle = 'rgba(80,25,10,0.35)'; c.fillRect(x, y + 3, w, 3); c.fillStyle = 'rgba(255,215,170,0.45)'; c.fillRect(x, y, w, 2); }
    c.fillStyle = '#e8c27a'; c.beginPath(); c.ellipse(-30, -128, 70, 8, 0.04, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,245,210,0.6)'; c.beginPath(); c.ellipse(-40, -131, 44, 3, 0.04, 0, Math.PI * 2); c.fill();
    for (const [x, y] of [[-150, -84], [20, -134], [110, -100], [150, -60]]) {
      c.fillStyle = '#7a8a3a'; c.beginPath(); c.ellipse(x, y, 9, 5, 0, Math.PI, 0); c.fill(); c.fillStyle = '#9aaa4a'; c.beginPath(); c.ellipse(x - 2, y - 2, 5, 3, 0, Math.PI, 0); c.fill();
    }
    c.strokeStyle = '#7a3a26'; c.lineWidth = 3; bp(); c.stroke();
  }, mx, my);
  ctx.strokeStyle = 'rgba(90,84,104,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hz.x0, my - 6); ctx.quadraticCurveTo(mx, my - 40, hz.x1, my - 6); ctx.stroke();
  // chevron boards along the bend (in front of the bluff)
  for (let x = hz.x0 + 30; x < hz.x1; x += 90) {
    const y = handcarY(st, x) - 10;
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 2, y - 46, 4, 46);
    const hot = st.x + HANDCAR.half > hz.x0 - 300 && st.x < hz.x1 && st.v > hz.vMax - 10;
    ctx.fillStyle = hot && Math.sin(t * 10) > 0 ? '#fff2a0' : '#ffd54a'; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2;
    rr(x - 13, y - 62, 26, 18, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 5, y - 58); ctx.lineTo(x + 3, y - 53); ctx.lineTo(x - 5, y - 48); ctx.stroke();
  }
}
function handcarCow(x, y, s, face, step, ph) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
  // legs
  ctx.fillStyle = '#5a4a3a';
  const sw = Math.sin(step) * 4;
  for (const [lx, d] of [[-18, 1], [-10, -1], [12, 1], [20, -1]]) ctx.fillRect(lx + sw * d, -16, 5, 16);
  // body
  ctx.fillStyle = '#fff8ec'; ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, -26, 28, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a5a3a';
  ctx.beginPath(); ctx.ellipse(-10, -30, 8, 6, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, -22, 7, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  // tail
  ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-27, -30); ctx.quadraticCurveTo(-34, -22 + Math.sin(ph * 3) * 3, -32, -14); ctx.stroke();
  // head
  ctx.fillStyle = '#fff8ec'; ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(30, -34, 10, 9, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffb3c0'; ctx.beginPath(); ctx.ellipse(37, -30, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; circle(31, -37, 1.8); ctx.fill(); circle(36, -31, 1); ctx.fill(); circle(39, -31, 1); ctx.fill();
  ctx.fillStyle = '#e9d29a'; ctx.beginPath(); ctx.moveTo(26, -42); ctx.lineTo(23, -50); ctx.lineTo(29, -43); ctx.fill(); ctx.beginPath(); ctx.moveTo(32, -43); ctx.lineTo(33, -51); ctx.lineTo(36, -42); ctx.fill();
  // a bell
  ctx.fillStyle = C.gold; circle(26, -22, 3); ctx.fill();
  ctx.restore();
}
// three cows amble across the track (from behind it to in front of it)
function handcarDrawCows(st, hz, front) {
  const t = G.clock;
  for (let i = 0; i < 3; i++) {
    const z = handcarCowZ(hz, i), inFront = z >= 0;
    if (inFront !== front) continue;
    const x = hz.cx - 40 + i * 42 + (hz.state === 'done' ? (i - 1) * 20 : 0), y = handcarY(st, x) + z * 24 + (front ? 8 : 0);
    const walking = hz.state === 'walk' && z > -1 && z < 1.3;
    handcarCow(x, y, 0.8 + 0.12 * z, i % 2 ? 1 : -1, walking ? t * 8 + i : 0, t + i);
    if (hz.state === 'walk' && i === 1 && Math.sin(t * 2) > 0.6) text('Moo!', x, y - 64, 14, '#ffffff', 'center');
  }
}
// a mail station (or the town station): a platform, a little depot, the stop box on the ties, the mail sack
function handcarDrawStation(st, hz, front) {
  const t = G.clock, end = hz.kind === 'end', bx = hz.box, by = handcarY(st, bx), tol = end ? (hz.gold ? HANDCAR.endTolGold : HANDCAR.endTol) : HANDCAR.mailTol;
  if (!front) {
    // the depot behind the track
    const dx = bx + 40, dw = end ? 240 : 150, dh = end ? 120 : 90;
    // (cached) board-and-batten walls, a shingled roof with a lit eave, a planked door, framed windows with sills
    const wc = end ? '#c94f3a' : '#d9a066';
    dkPic('hcDepot|' + (end ? 1 : 0), dw + 40, dh + 40, dw / 2 + 20, dh + 38, c => {
      const y0 = -dh;
      c.save(); c.beginPath(); c.rect(-dw / 2, y0, dw, dh); c.clip();
      dkBoards(c, -dw / 2, y0, dw, dh, wc, end ? 5 : 6, { vert: true, bw: 15, r: 0, outline: dkS(wc, 0.4), lw: 0.8 });
      const g = c.createLinearGradient(0, y0, 0, 0); g.addColorStop(0, 'rgba(60,20,0,0.3)'); g.addColorStop(0.2, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,20,0,0.2)'); c.fillStyle = g; c.fillRect(-dw / 2, y0, dw, dh);
      c.restore();
      c.strokeStyle = '#704622'; c.lineWidth = 3; c.strokeRect(-dw / 2, y0, dw, dh);
      c.save(); c.beginPath(); c.moveTo(-dw / 2 - 16, y0); c.lineTo(0, y0 - 34); c.lineTo(dw / 2 + 16, y0); c.closePath(); c.clip();
      c.fillStyle = '#704622'; c.fillRect(-dw / 2 - 16, y0 - 36, dw + 32, 38);
      for (let r = 0; r < 5; r++) { const yy = y0 - 32 + r * 7; for (let sx = -dw / 2 - 16 + (r % 2) * 5; sx < dw / 2 + 16; sx += 10) { c.fillStyle = (hash(sx | 0, r) % 3) ? '#7e5230' : '#5e3a1c'; c.beginPath(); c.moveTo(sx, yy); c.lineTo(sx + 10, yy); c.lineTo(sx + 10, yy + 6); c.quadraticCurveTo(sx + 5, yy + 8, sx, yy + 6); c.closePath(); c.fill(); } }
      c.restore();
      c.strokeStyle = 'rgba(255,220,180,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-dw / 2 - 14, y0 - 1); c.lineTo(0, y0 - 33); c.stroke();
      c.strokeStyle = '#4a2a10'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-dw / 2 - 16, y0); c.lineTo(0, y0 - 34); c.lineTo(dw / 2 + 16, y0); c.closePath(); c.stroke();
      dkPlank(c, -56, y0 + 12, 112, 24, '#fff3d6', 9, { r: 4, nails: true, lit: 0.5, outline: '#b89a6a', lw: 1.2 });
      c.fillStyle = '#4a2e18'; rrOn(c, -16, -44, 32, 44, 3); c.fill();
      dkBoards(c, -14, -42, 28, 42, '#7a5a3a', 3, { vert: true, bw: 7, r: 0, lw: 0.7 });
      dkPlank(c, -14, -30, 28, 4, '#6a4a2a', 4, { r: 0, nails: true, lw: 0.6 }); dkRivet(c, 9, -20, 1.5, '#c9a24a');
      for (const wx of [-dw / 2 + 12, dw / 2 - 38]) {
        c.fillStyle = '#704622'; c.fillRect(wx - 3, y0 + 43, 32, 26);
        c.fillStyle = '#ffe9a8'; c.fillRect(wx, y0 + 46, 26, 20); c.fillStyle = 'rgba(255,190,110,0.35)'; c.fillRect(wx, y0 + 56, 26, 10);
        c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(wx + 3, y0 + 48, 4, 15); c.fillStyle = '#704622'; c.fillRect(wx + 12, y0 + 46, 2, 20); c.fillRect(wx, y0 + 55, 26, 2);
        dkPlank(c, wx - 5, y0 + 68, 36, 4, '#9a6a3a', wx | 0, { r: 1, lw: 0.6 });
      }
    }, dx, by - 40);
    text(end ? 'TUMBLEWEED' : 'MAIL', dx, by - 40 - dh + 25, end ? 15 : 17, '#704622', 'center');
    // the platform: grained boards on posts
    const pl = 320 + (end ? 120 : 0);
    dkPic('hcPlat|' + pl, pl + 6, 42, 3, 2, c => {
      for (let x = 10; x < pl; x += 40) { dkPlank(c, x, 12, 6, 26, '#8a5228', x, { vert: true, r: 0, lw: 0.7 }); c.fillStyle = 'rgba(30,10,0,0.3)'; c.fillRect(x, 12, 6, 3); }
      dkPlank(c, 0, 0, pl, 12, '#b77a45', pl, { r: 2, lit: 0.35 });
      for (let x = 30; x < pl; x += 30) { c.fillStyle = 'rgba(90,50,20,0.4)'; c.fillRect(x, 1, 1, 10); dkNail(c, x - 3, 6, 0.9); dkNail(c, x + 3, 6, 0.9); }
    }, bx - 160, by - 40);
    if (end) {
      // the station bell on a post, and the station master
      const bellX = bx + 150, bellY = by - 130, ring = st.fin ? Math.sin(st.fin.t * 18) * 0.5 * clamp(2 - st.fin.t, 0, 1) : 0;
      dkPost(bellX, bellY, 6, 92, '#6b4426');
      dkPic('hcBellArm', 44, 10, 22, 2, c => dkPlank(c, -20, 0, 40, 6, '#6b4426', 4, { r: 1, lw: 0.6, outline: '#40281a' }), bellX, bellY - 4);
      ctx.save(); ctx.translate(bellX, bellY + 2); ctx.rotate(ring);
      ctx.fillStyle = C.gold; ctx.strokeStyle = '#8a5a12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-12, 22); ctx.quadraticCurveTo(-12, 2, 0, 2); ctx.quadraticCurveTo(12, 2, 12, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      handcarCowpoke(bellX + 30, by - 40, { shirt: '#3a5a9a', hat: '#2a2a3a', face: -1, arm: st.fin ? -1.0 + Math.sin(st.fin.t * 18) * 0.4 : 0.3, mustache: true, scarf: C.gold });
    } else {
      // the station hand with the mail sack (tossed onto the handcar once you stop)
      const got = hz.state === 'got';
      const hand = handcarCowpoke(bx + 120, by - 40, { shirt: '#9a6fc4', hat: '#6b4426', face: -1, arm: got ? -1.3 + Math.sin(t * 8) * 0.3 : 0.2 });
      if (hz.state === 'wait') handcarSack(hand.hx - 4, hand.hy + 12, 1);
    }
  } else {
    // the stop box painted on the ties (gold while you're in it)
    const inBox = Math.abs(st.x - bx) <= tol && (end || hz.state === 'wait');
    if (end || hz.state === 'wait') {
      const x0 = bx - tol - HANDCAR.half + 8, x1 = bx + tol + HANDCAR.half - 8;
      ctx.strokeStyle = inBox ? (Math.sin(t * 10) > 0 ? C.gold : '#ffffff') : '#ffd54a'; ctx.lineWidth = 4;
      ctx.setLineDash([10, 7]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.moveTo(x0, handcarY(st, x0) + 12); ctx.lineTo(x1, handcarY(st, x1) + 12); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = inBox ? C.gold : '#ffd54a';
      ctx.fillRect(x0 - 3, handcarY(st, x0) - 10, 6, 26); ctx.fillRect(x1 - 3, handcarY(st, x1) - 10, 6, 26);
      text('STOP', bx, by + 30, 16, inBox ? C.gold : '#fff3d6', 'center');
    }
  }
}
function handcarSack(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#c9a46a'; ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, 12); ctx.quadraticCurveTo(-13, -4, -5, -8); ctx.lineTo(5, -8); ctx.quadraticCurveTo(13, -4, 9, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#7a5a2a'; ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(0, -13); ctx.lineTo(5, -8); ctx.stroke();
  text('M', 0, 3, 10, '#7a5a2a', 'center');
  ctx.restore();
}
// the swap arch at the end of a stretch (the posts and the board are in front, the back beam behind)
function handcarDrawGate(st, front) {
  const g = st.c.gate, y = handcarY(st, g.x);
  if (!front) { ctx.fillStyle = '#6b4426'; ctx.fillRect(g.x - 104, y - 160, 8, 160); return; }
  ctx.fillStyle = '#7a5032'; ctx.fillRect(g.x + 92, y - 170, 12, 200); ctx.fillRect(g.x - 110, y - 170, 12, 200);
  ctx.fillStyle = '#b77a45'; ctx.strokeStyle = '#704622'; ctx.lineWidth = 3; rr(g.x - 130, y - 200, 260, 40, 6); ctx.fill(); ctx.stroke();
  text('SWAP ENDS!', g.x, y - 179.5, 22, '#fff3d6', 'center');
  ctx.strokeStyle = '#e9d29a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x - 120, y - 160); ctx.quadraticCurveTo(g.x, y - 130, g.x + 120, y - 160); ctx.stroke();
}
// the work crew pushing the handcar back after a Whoops (or the station master backing it up)
function handcarDrawCrew(st) {
  const o = st.oops;
  if (st.state !== 'oops' || !o || o.t < 0.6) return;
  const P = handcarPose(st), fx = P.x + HANDCAR.half + 22, fy = handcarY(st, fx) + 4;
  const walk = o.t > 0.9 && o.t < HANDCAR.oopsT - 0.2;
  handcarCowpoke(fx, fy, { shirt: '#e8a23a', hat: '#6b4426', face: -1, arm: 0.1, walk, mustache: true });
  if (o.kind !== 'back') handcarCowpoke(fx + 26, fy + 2, { shirt: '#8fbf6a', hat: '#a5683a', face: -1, arm: 0.1, walk, s: 0.92 });
  if (o.t < 1.4) text(o.kind === 'back' ? 'Here, let me help!' : 'We\'ll push you back!', fx + 20, fy - 92, 15, '#ffffff', 'center');
}
// the handcar: iron wheels, the wooden deck, the post and the seesaw handle, mail sacks on board, Pip and Bo
function handcarDrawCar(st) {
  const H = HANDCAR, P = handcarPose(st), t = G.clock;
  const spin = st.x / H.wr;
  ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.a);
  // wheels with spokes
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * H.wb, -H.wr); ctx.rotate(spin);
    ctx.fillStyle = '#3a3448'; circle(0, 0, H.wr + 1); ctx.fill();
    ctx.strokeStyle = '#6a6478'; ctx.lineWidth = 1.5; circle(0, 0, H.wr - 2); ctx.stroke();
    ctx.strokeStyle = '#8a8498'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (H.wr - 2), Math.sin(a) * (H.wr - 2)); } ctx.stroke();
    ctx.fillStyle = '#c9c5d6'; circle(0, 0, 3.5); ctx.fill();
    ctx.fillStyle = '#7a7488'; circle(0, 0, 1.4); ctx.fill();
    ctx.rotate(-spin); ctx.strokeStyle = 'rgba(230,225,240,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, H.wr, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
    ctx.restore();
  }
  // the gear box and the rod from the handle down to the front axle
  const g = handcarGripLocal(st, 1);
  ctx.strokeStyle = '#5a5468'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(22 * g.x / H.arm, H.pivotY + (g.y - H.pivotY) * 22 / H.arm); ctx.lineTo(H.wb - 6, -H.wr - 4); ctx.stroke();
  ctx.save(); ctx.translate(H.wb, -H.wr); ctx.rotate(spin * 0.5);
  ctx.fillStyle = '#7a7488'; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-2, 6, 4, 5); }
  ctx.fillStyle = '#9a94a8'; circle(0, 0, 8); ctx.fill();
  ctx.restore();
  // the deck
  // the deck (cached): a riveted iron frame, short grained deck boards with nail pairs, a lit front edge, the lantern bracket
  dkPic('hcDeck', H.half * 2 + 8, 34, H.half + 4, 18 - H.deckY, c => {
    dkPlate(c, -H.half, H.deckY, H.half * 2, 10, '#704622', { step: 14, r: 3 });
    for (let i = 0, x = -H.half; x < H.half - 0.5; i++, x += 18) {
      const w2 = Math.min(18, H.half - x);
      dkPlank(c, x, H.deckY - 2, w2, 8, i % 2 ? '#b07440' : '#bc824c', 40 + i, { r: i === 0 || x + w2 >= H.half ? 3 : 0.5, lit: 0.35, lw: 0.8 });
      dkNail(c, x + 4, H.deckY + 2, 0.9); dkNail(c, x + w2 - 4, H.deckY + 2, 0.9);
    }
    dkPlate(c, -H.half + 4, H.deckY + 8, H.half * 2 - 8, 4, '#5a3a22', { rivets: false, r: 1 });
    c.fillStyle = '#3a3448'; c.fillRect(H.half - 6, H.deckY - 16, 6, 14); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(H.half - 6, H.deckY - 16, 1.2, 14);
    c.fillStyle = '#c9a24a'; c.fillRect(H.half - 7, H.deckY - 17, 8, 2); c.fillRect(H.half - 7, H.deckY - 5, 8, 2);
  }, 0, 0);
  // a lantern on the front, a little flag on the back
  ctx.fillStyle = '#ffd36b'; circle(H.half - 3, H.deckY - 10, 3.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(H.half - 4, H.deckY - 11, 1.2); ctx.fill();
  ctx.fillStyle = 'rgba(255,211,107,0.3)'; circle(H.half - 3, H.deckY - 10, 8); ctx.fill();
  // mail sacks on board
  const n = Math.min(8, st.sacks);
  for (let i = 0; i < n; i++) handcarSack(-26 + (i % 4) * 13 - 12 + (i % 2), H.deckY - 12 - Math.floor(i / 4) * 12, 0.8);
  // the A-frame post
  dkPic('hcFrame', 34, H.deckY - H.pivotY + 8, 17, -H.pivotY + 4, c => {
    const tri = () => { c.beginPath(); c.moveTo(-14, H.deckY - 1); c.lineTo(-4, H.pivotY + 2); c.lineTo(4, H.pivotY + 2); c.lineTo(14, H.deckY - 1); c.closePath(); };
    c.fillStyle = '#8a5228'; tri(); c.fill();
    c.save(); tri(); c.clip();
    dkBoards(c, -14, H.pivotY, 28, H.deckY - H.pivotY, '#8a5228', 17, { vert: true, bw: 7, r: 0, outline: '#6a3e1c', lw: 0.7 });
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(4, H.pivotY, 12, H.deckY - H.pivotY);
    dkPlank(c, -14, H.deckY - 22, 28, 5, '#7a4820', 18, { r: 0, nails: true, lw: 0.7 });
    c.restore();
    c.strokeStyle = 'rgba(255,220,180,0.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-13, H.deckY - 2); c.lineTo(-3.5, H.pivotY + 3); c.stroke();
    c.strokeStyle = '#5a3a22'; c.lineWidth = 2; tri(); c.stroke();
  }, 0, 0);
  ctx.restore();
  // Pip and Bo (behind the handle beam, in front of the post)
  for (const p of G.players) handcarDrawRider(st, p, P);
  // the walking beam handle with its T-grips
  ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.a);
  const gb = handcarGripLocal(st, 0), gf = handcarGripLocal(st, 1), jam = st.jamT > 0;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(gb.x, gb.y); ctx.lineTo(gf.x, gf.y); ctx.stroke();
  ctx.strokeStyle = jam ? '#e9b08a' : '#a36a3a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(gb.x, gb.y); ctx.lineTo(gf.x, gf.y); ctx.stroke();
  for (const gp of [gb, gf]) { ctx.fillStyle = '#4a2e18'; rr(gp.x - 4, gp.y - 7, 8, 14, 3); ctx.fill(); ctx.fillStyle = '#c98e57'; rr(gp.x - 2.5, gp.y - 5.5, 5, 11, 2); ctx.fill(); }
  ctx.fillStyle = '#5a5468'; circle(0, H.pivotY, 6); ctx.fill(); ctx.fillStyle = '#c9c5d6'; circle(0, H.pivotY, 2.5); ctx.fill();
  ctx.restore();
  // a jam: little stars over the pivot
  if (st.jamT > 0) { const pv = handcarLocal(P, 0, H.pivotY); for (let i = 0; i < 3; i++) { const a = t * 8 + i * 2.1; ctx.fillStyle = '#ffffff'; handcarStarPath(pv.x + Math.cos(a) * 16, pv.y - 14 + Math.sin(a) * 4, 5, 2, a); ctx.fill(); } }
  // the mail sack flying in
  if (st.sackFly) { const f = st.sackFly, u = handcarSmooth(clamp(f.t / 0.7, 0, 1)), d = handcarLocal(P, -20, H.deckY - 14); handcarSack(handcarLerp(f.x, d.x, u), handcarLerp(f.y, d.y, u) - Math.sin(u * Math.PI) * 60, 1); }
}
// one player on the deck, gripping their end of the handle (crouching as it goes down, stretching as it comes up)
function handcarDrawRider(st, p, P) {
  const H = HANDCAR, s = handcarSpot(st, p.id), e = handcarEnd(st, p.id);
  const g = handcarGripLocal(st, e), grip = handcarLocal(P, g.x, g.y);
  const low = (g.y - (H.pivotY - H.arm * Math.sin(H.swing))) / (2 * H.arm * Math.sin(H.swing)); // 0 up .. 1 down
  const swapping = st.state === 'swap';
  const save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive };
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(swapping ? P.a * 0.5 : P.a);
  ctx.scale(H.scale, H.scale);
  p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = 0;
  p.face = swapping ? (e === 0 ? 1 : -1) : e === 0 ? 1 : -1;
  p.sy = swapping ? 1.08 : 1.06 - 0.2 * low + 0.04 * st.bob[p.id]; p.sx = 2 - p.sy;
  p.stun = (st.state === 'oops' && st.oops && st.oops.t < 1.0 && st.oops.kind !== 'back') || (st.wob > 0.6) ? 0.5 : 0;
  drawPlayer(p);
  ctx.restore();
  // arms reaching from the shoulder on the post side up to the grip (a bent elbow under the reach)
  if (!swapping) {
    const bodyH = PH * H.scale * (1.06 - 0.2 * low), inward = e === 0 ? 1 : -1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const side of [0, 1]) {
      const sh = handcarLocal(P, s.lx + inward * (PW * H.scale / 2 - 5), H.deckY - bodyH * (0.42 + side * 0.1));
      const hx = grip.x + (side ? -1 : 1) * 1.5 * inward, hy = grip.y + 2 + side;
      const mx = (sh.x + hx) / 2, my = (sh.y + hy) / 2, dx = hx - sh.x, dy = hy - sh.y, L = Math.hypot(dx, dy) || 1;
      // the elbow bends down and out a little, more when the hands are close
      const bend = clamp(18 - L * 0.3, 2, 10);
      const ex = mx - inward * Math.abs(dy / L) * bend * 0.4, ey = my + Math.abs(dx / L) * bend * 0.6 + bend * 0.3;
      for (const [col, lw] of [[PDARK[p.id], 6], [PCOL[p.id], 3.4]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      }
    }
    ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 1.5; circle(grip.x, grip.y + 2, 3.8); ctx.fill(); ctx.stroke();
  }
  // a clunk: a little shake line
  if (st.clunkT[p.id] > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); for (const d of [-8, 8]) { ctx.moveTo(grip.x + d, grip.y - 10); ctx.lineTo(grip.x + d * 1.6, grip.y - 18); } ctx.stroke(); }
  Object.assign(p, save);
}
// whose turn: a glowing arrow over the end that is up, with that player's key
function handcarDrawTurn(st) {
  if (st.state !== 'ride' || G.introT > 0) return;
  const up = 1 - st.down, id = handcarAt(st, up), t = G.clock;
  const [gx, gy] = handcarGripXY(st, up, -20);
  const nd = handcarNeeds(st), go = ['pump', 'creep'].includes(nd.what) && st.jamT <= 0 && !st.held;
  const quiet = handcarQuiet(id);
  const bob = go ? Math.sin(t * 8) * 4 : 0, y = gy - 8 + bob;
  ctx.globalAlpha = go ? 1 : 0.45;
  if (go) { ctx.fillStyle = 'rgba(255,197,61,0.35)'; circle(gx, y - 10, 20 + Math.sin(t * 8) * 2); ctx.fill(); }
  ctx.fillStyle = go ? C.gold : '#d9d3ef'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(gx - 10, y - 16); ctx.lineTo(gx + 10, y - 16); ctx.lineTo(gx + 10, y - 6); ctx.lineTo(gx + 16, y - 6); ctx.lineTo(gx, y + 8); ctx.lineTo(gx - 16, y - 6); ctx.lineTo(gx - 10, y - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  const k = quiet ? '' : handcarKey(id, 'pump');
  if (k) {
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.max(24, ctx.measureText(k).width + 12);
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 2; rr(gx - w / 2, y - 40, w, 22, 6); ctx.fill(); ctx.stroke();
    text(k, gx, y - 28.5, 14, C.ink, 'center', 'body');
  }
  ctx.globalAlpha = 1;
}
// cacti and rocks right at the front (low, so they never hide the handcar)
function handcarDrawForeground(st) {
  const cam = st.cam, x0 = cam.x - 100, x1 = cam.x + W + 100, yB = cam.y + H;
  const k0 = Math.floor(x0 / 230), k1 = Math.floor(x1 / 230);
  for (let k = k0; k <= k1; k++) {
    const h = hash(k, 41), x = k * 230 + h % 120;
    if (st.c.spans.some(s => x > s.x0 - 120 && x < s.x1 + 120)) continue;
    const zone = st.c.zones.find(z => x > z.x0 && x < z.x1);
    const y = Math.max(handcarTerrain(st, x) + 96, yB - 20);
    if (y > yB + 60) continue;
    if (zone && zone.kind === 'cactus' ? h % 2 === 0 : h % 5 === 0) handcarCactus(x, y + 30, 1.25, h);
    else if (h % 3 === 0) handcarRock(x, y + 10, 18 + h % 12, h);
    else if (h % 7 === 1) {
      // a tumbleweed rolling by
      const tx = x + ((G.clock * 60 + h % 500) % 600) - 300, ty = y - 12 - Math.abs(Math.sin(G.clock * 4 + k)) * 14;
      ctx.strokeStyle = '#b98f45'; ctx.lineWidth = 2;
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(G.clock * 4);
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 14, 6, i * Math.PI / 6, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
  }
}

/* ---------- the HUD: clock and mail sacks, the speed gauge and the pump-o-meter, the job panels, prompts ---------- */
function handcarHud(st) {
  const HC = HANDCAR, big = hudBig(), z = big ? 1.35 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.sacks + ' / ' + (st.sacksAll || st.sacksN);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    handcarSack(x0 + 15 + tw + gap + icon / 2, cy, fs / 16);
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe7a8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const nd = handcarNeeds(st);
  // the speed gauge and the pump-o-meter, bottom centre
  {
    const pw = Math.round(250 * z), ph = Math.round(66 * z), px = W / 2 - pw / 2, py = H - ph - 10;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = '#e9d29a'; ctx.lineWidth = 2; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    // speed: a dial from 0 to 40 mph (px/s / 10)
    const cx = px + 52 * z, cy = py + ph - 14 * z, r = 36 * z, a0 = Math.PI, mph = Math.max(0, st.v) / 10;
    ctx.lineWidth = 7 * z; ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(cx, cy, r, a0, 2 * Math.PI); ctx.stroke();
    const curve = st.c.hz.find(h => h.kind === 'curve' && !h.passed && h.x0 - (st.x + HC.half) < 1300 && st.x < h.x1);
    if (curve) { const ca = a0 + Math.PI * clamp(curve.vMax / 400, 0, 1); ctx.strokeStyle = 'rgba(232,58,42,0.75)'; ctx.beginPath(); ctx.arc(cx, cy, r, ca, 2 * Math.PI); ctx.stroke(); }
    ctx.strokeStyle = st.v > (curve ? curve.vMax : 999) ? '#ff6b4a' : C.gold; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + Math.PI * clamp(mph / 40, 0, 1)); ctx.stroke();
    const na = a0 + Math.PI * clamp(mph / 40, 0, 1);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(na) * r * 0.55, cy + Math.sin(na) * r * 0.55); ctx.lineTo(cx + Math.cos(na) * (r + 4 * z), cy + Math.sin(na) * (r + 4 * z)); ctx.stroke();
    text(Math.round(mph) + '', cx, cy - 9 * z, 17 * z, C.paper, 'center', 'body');
    text('mph', cx, cy + 6 * z, 10 * z, '#d9d3ef', 'center', 'body');
    // the pump-o-meter: a needle that sways with the handle, and the rhythm streak
    const mx = px + 168 * z, my = py + 30 * z, mw = 120 * z;
    text('PUMP-O-METER', mx, py + 11 * z, 10 * z, '#e9d29a', 'center', 'body');
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(mx - mw / 2, my - 7 * z, mw, 14 * z, 7 * z); ctx.fill();
    const backId = st.back, frontId = 1 - st.back;
    ctx.fillStyle = PCOL[backId]; rr(mx - mw / 2, my - 7 * z, 16 * z, 14 * z, 7 * z); ctx.fill();
    ctx.fillStyle = PCOL[frontId]; rr(mx + mw / 2 - 16 * z, my - 7 * z, 16 * z, 14 * z, 7 * z); ctx.fill();
    const nx = mx - st.hd * (mw / 2 - 12 * z);
    ctx.fillStyle = st.jamT > 0 ? '#ff6b4a' : '#ffffff'; ctx.beginPath(); ctx.moveTo(nx, my - 11 * z); ctx.lineTo(nx + 6 * z, my + 9 * z); ctx.lineTo(nx - 6 * z, my + 9 * z); ctx.closePath(); ctx.fill();
    const s = Math.min(HC.streakMax, st.streak), on = s >= 3;
    for (let i = 0; i < HC.streakMax; i++) { ctx.fillStyle = i < s ? (on ? C.gold : '#ffe7a8') : 'rgba(255,255,255,0.18)'; circle(mx - mw / 2 + 8 * z + i * (mw - 16 * z) / (HC.streakMax - 1), py + ph - 12 * z, 3.5 * z); ctx.fill(); }
    text(st.jamT > 0 ? 'Jammed!' : on ? 'Steady! +' + Math.round(s * HC.streakK * 100) + '%' : 'Take turns', mx, py + ph - 26 * z, 11 * z, st.jamT > 0 ? '#ff6b4a' : on ? C.gold : '#d9d3ef', 'center', 'body');
  }
  // the job panels: Pip's bottom left, Bo's bottom right
  const upId = handcarAt(st, 1 - st.down);
  for (const id of [0, 1]) {
    const pw = Math.round(214 * z), ph = Math.round(56 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    // (it fades while someone stands right behind it)
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const quiet = handcarQuiet(id), e = handcarEnd(st, id);
    text(NAMES[id] + (e === 0 ? ' · back end' : ' · front end') + (quiet ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 14 * z, PCOL[id], 'left');
    const myTurn = id === upId && ['pump', 'creep'].includes(nd.what) && st.state === 'ride' && !st.held && st.jamT <= 0;
    const brakeNow = nd.what === 'brake' && !st.braking[id];
    const chips = [['pump', 'PUMP', myTurn], ['brake', st.braking[id] ? 'BRAKING' : 'BRAKE', brakeNow]];
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 8 * z) / n;
    chips.forEach(([k, lab, lit], i) => {
      const cx = px + 12 * z + i * (cw + 8 * z), cy = py + 26 * z, chh = 24 * z;
      const held = k === 'brake' && st.braking[id];
      ctx.fillStyle = lit ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(255,107,74,0.85)' : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = quiet ? '' : handcarKey(id, k);
      let fs = 12 * z;
      const str = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(str).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(str, cx + cw / 2, cy + chh / 2 + 0.5, fs, lit ? C.ink : '#ffffff', 'center', 'body');
    });
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the stretch pill
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
  // prompts over the heads: the back end's opens to the left, the front's to the right, so they never overlap.
  // A hint bubble replaces that player's prompt while it shows.
  const fs = 14 * z, yMax = H - Math.round(66 * z) - 18;
  // the same words for both players show once, centred over the handcar
  const said = [], heard = [];
  const twin = (list, p, str) => list.some(e => e.id !== p.id && e.str === str);
  const place = (p, w, h, both) => {
    const hx = p.x + PW / 2, left = handcarEnd(st, p.id) === 0;
    if (both) {
      const mx = (ps[0].x + ps[1].x) / 2 + PW / 2, top = Math.min(ps[0].y, ps[1].y) - 44 * z - h;
      return { x: clamp(mx - w / 2, 4, W - w - 4), y: clamp(top, big ? 96 : 80, yMax - h) };
    }
    let top = p.y - 44 * z - h;
    if (typeof CPU === 'object' && cpuSolo() && !cpuOn(p.id)) { const cb = CPU.bubbles[1 - p.id]; if (cb && cb.t > 0) top = Math.min(top, p.y - 22 - (big ? 30 : 22) - 10 - h); }
    const y = clamp(top, big ? 96 : 80, yMax - h);
    return { x: clamp(left ? hx + 18 * z - w : hx - 18 * z, 4, W - w - 4), y };
  };
  const say = (p, str, col, pulse) => {
    if (handcarQuiet(p.id) || st.hints[p.id]) return;
    const both = twin(said, p, str);
    if (both && heard.includes(str)) return;
    heard.push(str);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(p, w, h, both);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const bubble = (p, str, both) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 14 * z, o = place(p, w, h, both);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = both ? C.gold : PCOL[p.id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(str, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  const want = (p, str, col, pulse) => { if (!handcarQuiet(p.id) && !st.hints[p.id]) said.push({ id: p.id, p, str, col, pulse }); };
  for (const p of ps) {
    const id = p.id, say = want;
    if (nd.what === 'brake') say(p, st.braking[id] ? 'Keep braking!' : 'Brake! Hold ' + handcarKey(id, 'brake'), C.gold, !st.braking[id]);
    else if (nd.what === 'coast') say(p, 'Stop pumping! Get ready to brake', '#ffe7a8', false);
    else if (nd.what === 'waitFix') say(p, 'Wait: the crew is fixing the track', '#d9d3ef', false);
    else if (nd.what === 'waitCows') say(p, 'Wait for the cows to cross', '#d9d3ef', false);
    else if (nd.what === 'back') say(p, 'Too far! Wait: they back you up', '#d9d3ef', false);
    else if (nd.what === 'hold' && Math.abs(st.v) < 5) say(p, nd.kind === 'end' ? 'In the box! Hold still...' : 'In the box! Hold still for the mail', C.gold, false);
    else if (nd.what === 'creep' && id === upId && Math.abs(st.v) < 25) say(p, 'A little push ' + handcarKey(id, 'pump') + ', then brake', '#ffe7a8', false);
  }
  for (const e of said) say(e.p, e.str, e.col, e.pulse);
  heard.length = 0;
  for (const p of ps) {
    const hn = st.hints[p.id];
    if (!hn) continue;
    const o = ps.find(q => q.id !== p.id), both = !!(o && st.hints[o.id] && st.hints[o.id].text === hn.text);
    if (both && heard.length) continue;
    heard.push(p.id); bubble(p, hn.text, both);
  }
}

/* ---------- sounds ---------- */
Sfx.extra.handcarPump = function (p) { this.tone(190 * p, 0.12, 'triangle', 0.06, 120 * p); this.tone(70, 0.08, 'square', 0.02, 50, 0.03); };
Sfx.extra.handcarClunk = function () { this.tone(150, 0.1, 'square', 0.045, 95); this.tone(90, 0.12, 'triangle', 0.05, 60, 0.02); };
Sfx.extra.handcarJam = function () { this.tone(240, 0.3, 'sawtooth', 0.03, 120); this.tone(120, 0.25, 'square', 0.025, 80, 0.05); };
Sfx.extra.handcarClack = function () { this.tone(520, 0.03, 'square', 0.012, 330); this.tone(480, 0.03, 'square', 0.01, 300, 0.07); };
Sfx.extra.handcarSqueal = function (p, n) { this.tone(1700 + Math.random() * 200, 0.28, 'sawtooth', 0.006 * (n || 1), 1500); };
Sfx.extra.handcarWhoa = function () { this.tone(700, 0.45, 'sine', 0.06, 260); this.tone(350, 0.35, 'triangle', 0.03, 180, 0.1); };
Sfx.extra.handcarWhoops = function () { this.tone(620, 0.45, 'sine', 0.06, 200); this.tone(200, 0.2, 'triangle', 0.05, 120, 0.05); };
Sfx.extra.handcarMoo = function () { this.tone(150, 0.55, 'sawtooth', 0.03, 120); this.tone(155, 0.5, 'triangle', 0.03, 125, 0.05); };
Sfx.extra.handcarWhistle = function () { this.tone(1800, 0.12, 'sine', 0.04, 2000); this.tone(1800, 0.18, 'sine', 0.04, 1600, 0.16); };
Sfx.extra.handcarHammer = function () { this.tone(900, 0.04, 'square', 0.03, 600); this.tone(200, 0.05, 'triangle', 0.04, 140); };
Sfx.extra.handcarFixed = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.08)); };
Sfx.extra.handcarSack = function () { this.tone(180, 0.12, 'triangle', 0.06, 120); [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, 0.12 + i * 0.07)); };
Sfx.extra.handcarFlag = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.handcarHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.handcarStreak = function () { [659, 784, 988].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.handcarRollBack = function () { this.tone(400, 0.4, 'sine', 0.04, 200); };
Sfx.extra.handcarSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.handcarHop = function (p) { this.tone(300 * p, 0.2, 'sine', 0.05, 640 * p); };
Sfx.extra.handcarArrive = function () { this.tone(1200, 0.2, 'sine', 0.03, 1400); [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, 0.15 + i * 0.08)); };
Sfx.extra.handcarBoing = function () { this.tone(160, 0.35, 'sine', 0.08, 520); };
Sfx.extra.handcarBell = function () { this.tone(1568, 0.6, 'triangle', 0.06, 1560); this.tone(2350, 0.4, 'sine', 0.02, 2340); };
