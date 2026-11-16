/* Pip & Bo - Level 13-1 Pumpkin Patch Roll (team, World 13 Spooky Hollow). */
'use strict';

/* ===== 13-1 Pumpkin Patch Roll (mode 'pumpkin', World 13 "Spooky Hollow", team) =====
   Roll one GIANT pumpkin over the hilly pumpkin patch to the hayride wagon. Side-on and scrolling: the mode owns the
   tick, the camera, the whole picture and the HUD (def.ownStep + def.ownHUD); the engine grid is empty apart from the
   two spawns.
   The PUSHER walks on the ground. Walking into the pumpkin (or holding the action, push) pushes it from behind (it
   fades out at a brisk walk); from in front the same press holds it back to a slow walk. Jump while touching the
   pumpkin = LEAPFROG right over it (and over the rider's head) to its other side; only when it is rolling slower than
   frogV and not from behind on a climb (there a jump is just a hop). Rocks block the pusher's feet: hop them (▲).
   The RIDER stands on top and balances like a log-roll. The pumpkin's roll carries the rider's feet the way it rolls,
   and off the flat spot on top you slowly slide on down the side (faster in the red), so the rider keeps stepping
   against it (◀ ▶ walk at a steady pace; nothing holds you in place). Where you stand is your lean: forward of the top
   (LEAN) adds roll force, fading out above vLean; behind it (BRAKE) slows a forward roll and never rolls it backward.
   ▼ or the action (hug) grabs the stem: half the carry, no sliding, much less jolt from a rock, but no lean and no
   walking, and the arms tire after hugMax s (let go and rest). Off the end of the balance bar is a "Whoa!" tumble.
   Both jobs are needed: steep climbs are too much for the pusher alone (push + lean gets it up), and a steep downhill
   into a pond or a mud ditch is too fast unless the pusher leapfrogs in front and holds AND the rider leans back; a
   bridge only holds a slow pumpkin ("Sploosh!"). Fails are soft: a puff of purple smoke and back to the last hay bale
   (its jack-o'-lantern lights up when you pass it); a tumble on level ground climbs straight back on where it happened.
   Rolling back down a hill stops at the bale.
   Rooms swap the jobs at the corn gate ("Swap jobs!"). Room 3 has gusts that blow the rider (weaker on each replay);
   room 4 ends with a ramp onto the hayride wagon, where the pumpkin gets its big goofy carved smile and rides off.
   Gold help (announced, only for tries you both took part in): Gold planks on a bridge after 2 splashes there, super
   gold planks after 3, and after 5 Mister Straw piles hay on it (any speed); Mister Straw the scarecrow pushes too on a
   climb you have both been stuck on for a while; Sticky boots after 3 tumbles in a room, super sticky boots after 6.
   Room def: { title, pusher: 0|1, tip, act, course: [tokens], map (spawns only) }. Course tokens (lengths in px):
     fN uN UN dN DN   flat / gentle up / steep up / gentle down / steep down for N px
     pN mN            a pond / mud ditch N px wide with a plank bridge (put it right at the foot of a steep down)
     k   a rock (a bump for the rider)    b   a hay bale checkpoint    g> g<   a gust (blows the rider ▶ / ◀)
     S:text  a sign ({P} the pusher's name, {R} the rider's)    D:kind  scenery    X  the swap gate (room end)
     E   the hayride: a plank ramp up onto the wagon (the finish)
   Every global is prefixed pumpkin / PUMPKIN (and Sfx.extra.pumpkin*); all state lives in G.mst. */
const PUMPKIN = {
  R: 46, D: 50, touch: 10,                     // pumpkin radius; pusher centre to pumpkin centre when touching (+ slack)
  Kg: 1000, fr: 45, vMax: 280,                 // gravity along the slope (x slope), rolling friction, top speed (px/s)
  push: 320, vPush: 160, pushFade: 30,         // a push: force, and the speed where it fades out (a brisk walk)
  block: 270, vBack: 80, blockFade: 25,        // holding it back from the front: force, and the slow walk it allows
  lean: 150, vLean: 110, leanFade: 30,         // the rider standing forward of the top: roll force (full from leanFull), fading out above vLean
  brake: 230, leanFull: 0.3, leanDead: 0.1,    // standing behind the top: a brake (it never rolls the pumpkin backward)
  // the balance (phi: the rider's angle off the top, + = forward). The roll carries the feet (carry x the pumpkin's
  // spin), off the flat spot on top you slide further (tip, faster in the red), and ◀ ▶ walk at a steady pace
  carry: 0.11, walk: 0.75, redWalk: 0.35, tip: 0.2, redTip: 0.4, flat: 0.1, phiMax: 1.1, red: 0.8,
  hugCarry: 0.5, hugMax: 1.2, hugOk: 0.4,      // a hug (▼): less carry, no slide, no lean; arms tire after hugMax s (rest to hugOk)
  jolt: 0.34, gustPush: 0.62, gustT: 0.95, gustWarn: 1.3,
  slopes: { f: 0, u: -0.14, U: -0.36, d: 0.14, D: 0.36 }, blend: 50,
  vSafe: 130, vSafeGold: 205, vSafeGold2: 250, // the most a bridge holds (gold planks: more; after more shared splashes, much more; then anything)
  run: 200, acc: 2200, fric: 2600, hopV: 430, g: 1900, frogT: 0.62, frogH: 150, frogReach: 22, frogD: 240, frogV: 110, leash: 430, rockW: 13,
  tryWin: 5, bridgeTries: 2, bridgeTries2: 3, bridgeTries3: 5, climbStuck: 22, tumbleHelp: 3, tumbleHelp2: 6, helpPush: 60,
  sticky: [null, { carry: 0.6, tip: 0.5, lim: 1.3 }, { carry: 0.35, tip: 0, lim: 1.5 }],   // sticky boots, then super sticky boots
  splashT: 1.55, tumbleT: 1.3, swapT: 1.7, finT: 4.6, hintLife: 2.8, boardT: 0.45,
  camLead: 380, camY: 300, introDrop: 50,
};
const pumpkinLerp = (a, b, u) => a + (b - a) * u;
const pumpkinSmooth = u => u * u * (3 - 2 * u);

/* ---------- the course: tokens -> ground (2 px steps), the pumpkin's centre line, hazards, scenery ---------- */
function pumpkinCompile(def) {
  const P = PUMPKIN, X0 = -900, pusher = def.pusher || 0;
  const name = s => s.replace(/\{P\}/g, NAMES[pusher]).replace(/\{R\}/g, NAMES[1 - pusher]);
  const c = { x0: X0, rocks: [], bales: [], bridges: [], signs: [], deco: [], gusts: [], ups: [], downs: [], swap: null, wagon: null };
  const knots = [{ x: X0, s: 0 }];
  let x = 0;
  for (const tk of def.course || []) {
    const t = String(tk), ch = t[0], n = parseInt(t.slice(1), 10) || 0;
    if ('fuUdD'.includes(ch) && !t.includes(':')) {
      knots.push({ x, s: P.slopes[ch] });
      if (ch === 'U') c.ups.push({ x0: x, x1: x + n, t: 0, help: false });
      if (ch === 'D' || ch === 'd') c.downs.push({ x0: x, x1: x + n, wet: false, gentle: ch === 'd' });
      x += n;
    } else if ((ch === 'p' || ch === 'm') && n) {
      knots.push({ x, s: 0 });
      c.bridges.push({ x0: x, x1: x + n, kind: ch === 'p' ? 'pond' : 'mud', fails: 0, tries: 0, gold: false, broke: 0, wob: 0 });
      x += n;
    } else if (ch === 'k') c.rocks.push({ x, ph: c.rocks.length });
    else if (ch === 'b') c.bales.push({ x, lit: false, litT: 0 });
    else if (ch === 'g') c.gusts.push({ x, dir: t[1] === '<' ? -1 : 1, state: 'wait', t: 0 });
    else if (ch === 'S') c.signs.push({ x, text: name(t.slice(2)) });
    else if (ch === 'D') c.deco.push({ x, kind: t.slice(2), t: 0, gone: 0, seen: false });
    else if (ch === 'X') c.swap = { x };
    else if (ch === 'E') {
      // the hayride: a short flat, a plank ramp up onto the wagon bed, then the bed
      knots.push({ x, s: -0.4 });
      c.wagon = { ramp0: x, bed0: x + 110, bedX: x + 110 + 120, x1: x + 110 + 250 };
      c.ups.push({ x0: x, x1: x + 110, t: 0, help: false, ramp: true });
      x += 110;
      knots.push({ x, s: 0 });
      x += 250;
    }
  }
  knots.push({ x, s: 0 });
  c.len = x + 1400;
  // the bale behind the start is checkpoint 0
  c.bales.unshift({ x: -118, lit: true, litT: 1, start: true });
  // a steep down that ends at a bridge is "wet": the pusher holds it back in front
  for (const d of c.downs) d.wet = !d.gentle && c.bridges.some(b => Math.abs(b.x0 - d.x1) < 40);
  // ground y every 2 px: the slope of each stretch, blended over P.blend px at each change
  const N = Math.ceil((c.len - X0) / 2) + 2, gy = new Float32Array(N);
  const slopeAt = xx => {
    let k = 0;
    while (k + 1 < knots.length && knots[k + 1].x <= xx) k++;
    let s = knots[k].s;
    const B = P.blend / 2;
    if (k + 1 < knots.length && knots[k + 1].x - xx < B) s = pumpkinLerp(s, knots[k + 1].s, pumpkinSmooth((xx - (knots[k + 1].x - B)) / (2 * B)));
    else if (k > 0 && xx - knots[k].x < B) s = pumpkinLerp(knots[k - 1].s, s, pumpkinSmooth((xx - (knots[k].x - B)) / (2 * B)));
    return s;
  };
  let y = 0;
  for (let i = 0; i < N; i++) { gy[i] = y; y += slopeAt(X0 + i * 2) * 2; }
  c.gy = gy;
  // the pumpkin's centre: the circle resting on the ground under it (the highest touch point wins, so crests are round)
  const R = P.R, pc = new Float32Array(N), gAt = xx => { const f = (xx - X0) / 2, i = clamp(Math.floor(f), 0, N - 2); return gy[i] + (gy[i + 1] - gy[i]) * (f - i); };
  for (let i = 0; i < N; i++) {
    const cx = X0 + i * 2;
    let best = Infinity;
    for (let dx = -R + 2; dx <= R - 2; dx += 4) best = Math.min(best, gAt(cx + dx) - Math.sqrt(R * R - dx * dx));
    pc[i] = best;
  }
  c.pc = pc;
  // the vines along the patch (little pumpkins, leaves, curls), placed once
  c.patch = [];
  for (let xx = -600; xx < c.len - 400; xx += 46) {
    const h = hash(xx, 13);
    if (h % 5 === 0) continue;
    if (c.bridges.some(b => xx > b.x0 - 30 && xx < b.x1 + 30)) continue;
    c.patch.push({ x: xx + (h % 30), kind: h % 7 === 0 ? 'pump' : h % 3 === 0 ? 'leaf' : 'curl', s: 0.6 + ((h >> 5) % 50) / 100, h });
  }
  return c;
}
function pumpkinGY(st, x) {
  const c = st.c, a = c.gy, f = (x - c.x0) / 2, i = Math.floor(f);
  if (i < 0) return a[0];
  if (i >= a.length - 1) return a[a.length - 1];
  return a[i] + (a[i + 1] - a[i]) * (f - i);
}
function pumpkinPC(st, x) {
  const c = st.c, a = c.pc, f = (x - c.x0) / 2, i = Math.floor(f);
  if (i < 0) return a[0];
  if (i >= a.length - 1) return a[a.length - 1];
  return a[i] + (a[i + 1] - a[i]) * (f - i);
}
const pumpkinSlope = (st, x) => (pumpkinPC(st, x + 4) - pumpkinPC(st, x - 4)) / 8;
const pumpkinGSlope = (st, x) => (pumpkinGY(st, x + 6) - pumpkinGY(st, x - 6)) / 12;
// a small rock under x: its height there (px), for a pusher who lands on top of one
function pumpkinRockH(st, x) {
  for (const r of st.c.rocks) { const d = Math.abs(x - r.x); if (d < 16) return 11 * Math.cos(d / 16 * Math.PI / 2); }
  return 0;
}
// a rock the pusher walked into going from xa to xb on the ground (rocks are hopped over, never walked through)
function pumpkinRockHit(st, xa, xb) {
  const w = PUMPKIN.rockW;
  for (const r of st.c.rocks) {
    if (xb > xa && xa <= r.x - w + 0.01 && xb > r.x - w) return { r, x: r.x - w };
    if (xb < xa && xa >= r.x + w - 0.01 && xb < r.x + w) return { r, x: r.x + w };
  }
  return null;
}
// a rock just ahead of the pusher's feet (dir: the way they walk), so ▲ hops it instead of leapfrogging
function pumpkinRockAhead(st, x, dir, reach) {
  const w = PUMPKIN.rockW;
  return st.c.rocks.find(r => { const d = dir > 0 ? r.x - w - x : x - (r.x + w); return d > -2 && d < reach; }) || null;
}
// the balance limits: where the red starts and where you tip off (sticky boots make it wider)
const pumpkinBoots = st => PUMPKIN.sticky[st.sticky || 0] || { carry: 1, tip: 1, lim: PUMPKIN.phiMax };
const pumpkinLim = st => pumpkinBoots(st).lim;
// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function pumpkinKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'jump') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? 'stick ▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad ? '◀' : touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad ? '▶' : touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  return pad ? 'stick' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const pumpkinQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- a room ---------- */
function pumpkinRoom(st, L, k) {
  const P = PUMPKIN, def = L.def;
  st.k = k; st.pusher = def.pusher || 0; st.rider = 1 - st.pusher; st.title = def.title || '';
  st.c = pumpkinCompile(def);
  st.stats.roomT[k] = null; st.stats.roomFails[k] = 0; st.stats.roomTitles[k] = st.title;
  st.cp = 0; st.roomTumbles = 0; st.sticky = 0;
  pumpkinPlace(st, 0);
  st.rd.board = -1;   // the rider waits beside the pumpkin during the room card, then hops on
  st.cam = { x: st.pk.x - P.camLead, y: st.pk.y - P.camY - P.introDrop };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null;
  st.roomT = 0; st.segStart = G.time; st.inT = [-99, -99]; st.swap = null; st.fin = null; st.wrongT = [0, 0];
  st.rollSnd = 0; st.dustT = 0; st.gustNow = null;
  pumpkinActLabels(st);
  pumpkinMirror(st);
}
// put the pumpkin (and both players) at checkpoint bale i, standing still
function pumpkinPlace(st, i, atX) {
  const P = PUMPKIN, b = st.c.bales[i], x = atX != null ? atX : b.x + 118, pu0 = atX != null && st.pu;
  st.pk = { x, y: pumpkinPC(st, x), v: 0, ang: (st.pk && st.pk.ang) || 0, state: 'roll', t: 0, bob: 0, lock: 0.35, appear: 0.5, drop: 0, splashB: null, wob: 0 };
  st.rd = { phi: 0, lean: 0, hug: 0, hugT: 0, tired: false, hopT: 0, fly: null, wob: 0, board: st.rd && st.rd.board };
  if (pu0) { pu0.vx = 0; pu0.vy = 0; pu0.frog = null; pu0.air = false; pu0.y = pumpkinGY(st, pu0.x); return; }   // (a tumble on the level: the pusher stays put)
  const px = x - P.D - 6;
  st.pu = { x: px, y: pumpkinGY(st, px), vx: 0, vy: 0, air: false, side: -1, face: 1, frog: null, act: 0, actVis: 0, step: 0, stun: 0, shove: 0 };
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function pumpkinStep(st, dt) {
  if (!st.pk) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.act || ps[k].pendingJump) st.inT[k] = G.time;
  }
  st.roomT += dt;
  const pk = st.pk, rd = st.rd;
  if (pk.appear > 0) pk.appear = Math.max(0, pk.appear - dt);
  // after the room card the rider hops up onto the pumpkin
  if (rd.board < 0 && G.introT <= 0) { rd.board = 0; pk.lock = Math.max(pk.lock, PUMPKIN.boardT + 0.1); Sfx.play('pumpkinHop', st.rider); }
  else if (rd.board >= 0 && rd.board < PUMPKIN.boardT) rd.board = Math.min(PUMPKIN.boardT, rd.board + dt);
  if (G.introT > 0) { for (const p of ps) { p.pendingJump = false; p.pendingAct = false; } }
  else if (pk.state === 'roll') pumpkinRoll(st, dt);
  else if (pk.state === 'splash') pumpkinSplashStep(st, dt);
  else if (pk.state === 'tumble') pumpkinTumbleStep(st, dt);
  else if (pk.state === 'swap') { if (pumpkinSwapStep(st, dt)) return; }
  else if (pk.state === 'finish') { if (pumpkinFinStep(st, dt)) return; }
  pumpkinCam(st, dt);
  pumpkinFx(st, dt);
  pumpkinMirror(st);
}
function pumpkinRoll(st, dt) {
  const P = PUMPKIN, pk = st.pk, rd = st.rd, pu = st.pu, ps = G.players, c = st.c;
  const R = ps[st.rider], U = ps[st.pusher], ri = R.input, ui = U.input;
  pk.lock = Math.max(0, pk.lock - dt);
  const locked = pk.lock > 0;
  const rJump = R.pendingJump, uJump = U.pendingJump;
  R.pendingJump = false; U.pendingJump = false; R.pendingAct = false; U.pendingAct = false;

  /* -- the pusher: walk, hop, leapfrog -- */
  if (pu.stun > 0) pu.stun -= dt;
  const touching = Math.abs(pu.x - (pk.x + pu.side * P.D)) <= P.frogReach && !pu.frog && !pu.air;   // (a leapfrog works from a step away too)
  let pushing = 0;
  if (pu.frog) {
    const fr = pu.frog;
    fr.t += dt;
    const u = clamp(fr.t / P.frogT, 0, 1);
    pu.x = pk.x + pumpkinLerp(fr.from, fr.to, pumpkinSmooth(u));
    pu.y = pumpkinLerp(fr.y0 - pk.y, pumpkinGY(st, pu.x) - pk.y, u) + pk.y - P.frogH * 4 * u * (1 - u);
    if (u >= 1) {
      pu.frog = null; pu.side = Math.sign(fr.to); pu.y = pumpkinGY(st, pu.x); pu.air = false; pu.vx = 0; pu.vy = 0;
      U.sx = 1.25; U.sy = 0.78; Sfx.play('pumpkinLand', st.pusher);
    }
  } else {
    const dir = locked || pu.stun > 0 ? 0 : (ui.right ? 1 : 0) - (ui.left ? 1 : 0);
    if (dir) pu.face = dir;
    if (uJump && !locked && !pu.air) {
      const rockNear = pumpkinRockAhead(st, pu.x, dir || pu.face, 26);
      // (a pumpkin rolling by at full speed is too quick to leapfrog, and on a climb you'd let go of it: those are just hops)
      const frogOk = Math.abs(pk.v) < P.frogV && !(pu.side < 0 && pumpkinSlope(st, pk.x) < -0.05);
      if (touching && !rockNear && frogOk) {
        pu.frog = { t: 0, from: pu.x - pk.x, to: -pu.side * (P.D + 4), y0: pu.y };
        pu.face = -pu.side; pu.side = 0;
        st.stats.frogs[st.pusher]++;
        U.sx = 0.75; U.sy = 1.3;
        pumpkinPop(st, pk.x, pk.y - P.R - 96, 'Leapfrog!', PCOL[st.pusher], 20);
        Sfx.play('pumpkinFrog', st.pusher); rumble(st.pusher, 0, 0.3, 70);
        st.hints[st.pusher] = null;
      } else { pu.air = true; pu.vy = -P.hopV; U.sx = 0.8; U.sy = 1.25; Sfx.play('jump', st.pusher); }
    }
    if (!pu.frog) {
      const target = dir * P.run, a = pu.air ? P.acc * 0.6 : dir ? P.acc : P.fric;
      pu.vx = approach(pu.vx, target, a * dt);
      const xa = pu.x;
      pu.x += pu.vx * dt;
      // a rock blocks your feet: hop it (▲)
      const hit = !pu.air && pumpkinRockHit(st, xa, pu.x);
      if (hit) {
        pu.x = hit.x; pu.vx = 0; pu.rockT = (pu.rockT || 0) + dt;
        if (pu.rockT > 0.25) pumpkinHintOnce(st, 'rock' + st.k, st.pusher, 'A rock! Hop over it: ' + pumpkinKey(st.pusher, 'jump'));
      } else if (!pu.air) pu.rockT = 0;
      if (pu.air) {
        pu.vy += P.g * dt; pu.y += pu.vy * dt;
        const gy = pumpkinGY(st, pu.x) - pumpkinRockH(st, pu.x);
        if (pu.vy > 0 && pu.y >= gy) { pu.y = gy; pu.air = false; pu.vy = 0; U.sx = 1.2; U.sy = 0.82; }
      } else pu.y = pumpkinGY(st, pu.x) - pumpkinRockH(st, pu.x);
      // which side of the pumpkin, and is the pusher pressing into it?
      if (pu.side === 0) pu.side = pu.x < pk.x ? -1 : 1;
      const into = pu.side < 0 ? (ui.right || ui.act) : (ui.left || ui.act);
      const near = Math.abs(pu.x - (pk.x + pu.side * P.D)) <= P.touch + 1;
      if (near && into && !locked && pu.stun <= 0 && !pu.air) pushing = pu.side < 0 ? 1 : -1;
    }
  }
  pu.act = pushing;
  pu.actVis = approach(pu.actVis, pushing ? 1 : 0, dt * 8);

  /* -- the rider: balance like a log-roll (walk against the roll), lean, hug for a moment, hop -- */
  const hugKey = !locked && (ri.down || ri.act);
  // arms tire: a hug lasts hugMax s, then you must let go and rest (so hugging is for rocks, not for the whole ride)
  if (hugKey && !rd.tired) { rd.hugT += dt; if (rd.hugT >= P.hugMax) { rd.tired = true; pumpkinHint(st, st.rider, 'Arms tired! Let go and balance ' + pumpkinKey(st.rider, 'lr'), 2.2); } }
  else { rd.hugT = Math.max(0, rd.hugT - dt); if (rd.tired && !hugKey && rd.hugT <= P.hugOk) rd.tired = false; }
  const hug = hugKey && !rd.tired;
  rd.hug = approach(rd.hug, hug ? 1 : 0, dt * 8);
  if (rJump && !locked && rd.hopT <= 0) { rd.hopT = 0.34; Sfx.play('pumpkinHop', st.rider); R.sx = 0.85; R.sy = 1.2; }
  if (rd.hopT > 0) rd.hopT = Math.max(0, rd.hopT - dt);
  const boots = pumpkinBoots(st), sticky = boots.carry, omega = pk.v / P.R, lim = boots.lim, red = lim * P.red;
  // the pumpkin turning under your feet carries you the way it rolls
  let dphi = P.carry * omega * (hug ? P.hugCarry : 1) * sticky;
  if (st.gustNow) dphi += st.gustNow.dir * P.gustPush * (st.gustNow.str || 1) * (hug ? 0.5 : 1) * sticky;
  // off the flat spot on top you slide on down the side (faster in the red), unless you hug
  const off = Math.abs(rd.phi);
  if (!hug && off > P.flat) dphi += Math.sign(rd.phi) * (P.tip * (off - P.flat) + (off > red ? P.redTip * (off - red) : 0)) * boots.tip;
  // ◀ ▶ walk (hugging, you hold still)
  const rdir = locked || hug ? 0 : (ri.right ? 1 : 0) - (ri.left ? 1 : 0);
  dphi += rdir * P.walk * (rdir * rd.phi > red ? P.redWalk : 1);   // (stepping further out in the red is slow)
  rd.phi += dphi * dt;
  if (locked) rd.phi = approach(rd.phi, 0, dt);
  // where you stand is your lean: forward of the top rolls it on, behind the top brakes
  const L = hug || off < P.leanDead ? 0 : clamp((rd.phi - Math.sign(rd.phi) * P.leanDead) / (P.leanFull - P.leanDead), -1, 1);
  rd.lean = approach(rd.lean, L, dt * 6);
  if (rdir || hug) { st.stats.leanT[st.rider] += dt; }
  if (pushing) st.stats.pushT[st.pusher] += dt;

  /* -- the pumpkin -- */
  const s = pumpkinSlope(st, pk.x);
  // leaning forward pushes the roll on; leaning back is a brake (it slows a forward roll, it never rolls it backward)
  let F = P.Kg * s + (L > 0 ? P.lean * L * clamp((P.vLean - pk.v) / P.leanFade, 0, 1) : P.brake * L * clamp(pk.v / 20, 0, 1));
  if (pushing > 0) {
    F += P.push * clamp((P.vPush - pk.v) / P.pushFade, 0, 1);
    const up = c.ups.find(u => u.help && pk.x > u.x0 - 60 && pk.x < u.x1 + 20);
    if (up) F += P.helpPush * clamp((P.vPush - pk.v) / P.pushFade, 0, 1);
  }
  if (pushing < 0) F -= P.block * clamp((pk.v - P.vBack) / P.blockFade, 0, 1);
  if (Math.abs(pk.v) < 3 && Math.abs(F) <= P.fr) pk.v = 0;
  else { pk.v += F * dt; pk.v = approach(pk.v, 0, P.fr * dt); }
  pk.v = clamp(pk.v, -P.vMax, P.vMax);
  const x0 = pk.x;
  pk.x += pk.v * dt; pk.ang += pk.v / P.R * dt;
  // the checkpoint bale stops a pumpkin rolling back down the hill
  const bale = c.bales[st.cp];
  if (pk.x < bale.x + 72 && pk.v <= 0) {
    pk.x = bale.x + 72;
    if (pk.v < -30) { pumpkinPop(st, pk.x - 40, pk.y - 60, 'Bump!', '#ffe7a8', 18); Sfx.play('pumpkinBale'); }
    pk.v = -pk.v * 0.2;
  }
  pk.y = pumpkinPC(st, pk.x);
  // keep the pusher out of the pumpkin (it shoves them along), and near it
  if (!pu.frog) {
    const xs = pu.x;
    if (pu.side < 0 && pu.x > pk.x - P.D) { pu.shove = Math.max(pu.shove, (pu.x - (pk.x - P.D)) / dt); pu.x = pk.x - P.D; pu.vx = Math.min(pu.vx, pk.v); }
    else if (pu.side > 0 && pu.x < pk.x + P.D) { pu.shove = Math.max(pu.shove, ((pk.x + P.D) - pu.x) / dt); pu.x = pk.x + P.D; pu.vx = Math.max(pu.vx, pk.v); }
    // shoved into a rock by the pumpkin: a little trip-hop over it
    if (!pu.air && pu.x !== xs && pumpkinRockHit(st, xs, pu.x)) {
      pu.air = true; pu.vy = -P.hopV * 0.8; U.sx = 0.85; U.sy = 1.2;
      pumpkinPop(st, pu.x, pu.y - 50, 'Oops! Hop!', '#ffe7a8', 16); Sfx.play('jump', st.pusher);
    }
    if (pu.x < pk.x - P.leash) { pu.x = pk.x - P.leash; pu.vx = Math.max(0, pu.vx); pumpkinHintOnce(st, 'leash', st.pusher, 'Stay with your pumpkin!'); }
    if (pu.x > pk.x + P.leash) { pu.x = pk.x + P.leash; pu.vx = Math.min(0, pu.vx); pumpkinHintOnce(st, 'leash', st.pusher, 'Stay with your pumpkin!'); }
    // the screen edges stop the pusher too (Gavyn, Nov 2026): the leash alone let them walk out of the picture while the pumpkin rolled on
    if (st.cam) {
      const ex0 = st.cam.x + PW / 2 + 4, ex1 = st.cam.x + W - PW / 2 - 4;
      // (never across the pumpkin: after a poof back to the bale the camera is still easing over, and the old edge used to
      // put the pusher on the far side of the pumpkin for a moment)
      const lim0 = pu.side < 0 ? Math.min(ex0, pk.x - P.D) : ex0, lim1 = pu.side > 0 ? Math.max(ex1, pk.x + P.D) : ex1;
      if (pu.x < lim0) { pu.x = lim0; pu.vx = Math.max(0, pu.vx); } else if (pu.x > lim1) { pu.x = lim1; pu.vx = Math.min(0, pu.vx); }
    }
    if (!pu.air) pu.y = pumpkinGY(st, pu.x) - pumpkinRockH(st, pu.x);
  }
  pu.shove = approach(pu.shove, 0, dt * 400);
  pu.step += Math.abs(pu.vx) * dt * 0.06 + (pushing ? dt * 7 : 0);

  /* -- rocks: a bump under the rider's feet -- */
  for (const r of c.rocks) {
    if ((x0 < r.x && pk.x >= r.x) || (x0 > r.x && pk.x <= r.x)) {
      const j = P.jolt * Math.sign(pk.v || 1) * clamp(Math.abs(pk.v) / 90, 0.35, 1.3) * (hug ? 0.25 : 1);
      rd.phi += j; pk.bob = 0.28; rd.wob = 0.4;
      Sfx.play('pumpkinBump');
      pumpkinPop(st, r.x, pumpkinGY(st, r.x) - 30, hug ? 'Hugged it!' : 'Bump!', hug ? '#8fe3b0' : '#ffe7a8', 17);
      if (!hug && Math.abs(pk.v) > 50) pumpkinHintOnce(st, 'hug', st.rider, 'Rocks! Hug the stem with ' + pumpkinKey(st.rider, 'down'));
      R.sx = 1.15; R.sy = 0.85;
    }
  }
  if (pk.bob > 0) pk.bob = Math.max(0, pk.bob - dt);
  if (rd.wob > 0) rd.wob = Math.max(0, rd.wob - dt);

  /* -- gusts (Scarecrow Ridge) -- */
  st.gustNow = null;
  for (const gu of c.gusts) {
    if (gu.state === 'wait' && pk.x > gu.x - 330) { gu.state = 'warn'; gu.t = 0; Sfx.play('pumpkinGustWarn'); }
    else if (gu.state === 'warn') { gu.t += dt; if (gu.t >= P.gustWarn) { gu.state = 'blow'; gu.t = 0; gu.str = [1, 0.75, 0.5][Math.min(2, gu.n || 0)]; gu.n = (gu.n || 0) + 1; Sfx.play('pumpkinGust'); pumpkinPop(st, pk.x, pk.y - P.R - 110, gu.dir > 0 ? 'WHOOSH! →' : '← WHOOSH!', '#d8f0ff', 22); } }
    else if (gu.state === 'blow') { gu.t += dt; st.gustNow = gu; if (gu.t >= P.gustT) { gu.state = 'done'; } }
  }

  /* -- checkpoints -- */
  for (let i = st.cp + 1; i < c.bales.length; i++) {
    const b = c.bales[i];
    if (pk.x > b.x + 128) {
      st.cp = i; b.lit = true; b.litT = 0;
      pumpkinPop(st, b.x, pumpkinGY(st, b.x) - 76, 'Checkpoint!', '#ffd27a', 18);
      Sfx.play('pumpkinCheck');
      for (let n = 0; n < 12; n++) { const a = Math.random() * Math.PI * 2; pumpkinPart(st, b.x, pumpkinGY(st, b.x) - 46, Math.cos(a) * 90, Math.sin(a) * 90 - 40, 0.6, n % 2 ? '#ffd27a' : '#ff9a3d', 3, 60, 'spark'); }
    }
  }
  /* -- climbs: help when you have both been stuck on one for a while -- */
  const both = G.time - st.inT[0] < P.tryWin && G.time - st.inT[1] < P.tryWin;
  for (const u of c.ups) {
    if (pk.x > u.x0 - 50 && pk.x < u.x1 && both) u.t += dt;
    if (!u.help && u.t > P.climbStuck) {
      u.help = true; st.stats.helps++;
      pumpkinMsg(st, 'Mister Straw the scarecrow helps you push!', C.gold, 3.4);
      Sfx.play('pumpkinHelp');
    }
  }
  /* -- the rider's balance -- */
  if (Math.abs(rd.phi) > lim) { pumpkinStartTumble(st); return; }
  if (Math.abs(rd.phi) > lim * P.red) pumpkinHintOnce(st, 'wobble' + (rd.phi > 0 ? 1 : 0), st.rider, rd.phi > 0 ? 'Wobbly! Walk back ' + pumpkinKey(st.rider, 'left') : 'Wobbly! Walk forward ' + pumpkinKey(st.rider, 'right'));
  /* -- bridges -- */
  for (const b of c.bridges) {
    if (pk.x < b.x0 - 4 || pk.x > b.x1 + 4) continue;
    const safe = pumpkinSafe(b);
    b.wob = Math.max(b.wob, clamp(Math.abs(pk.v) / safe, 0, 1));
    if (pk.x > b.x0 + 10 && pk.x < b.x1 - 10 && Math.abs(pk.v) > safe) { pumpkinStartSplash(st, b); return; }
    st.creakT = (st.creakT || 0) - dt;
    if (st.creakT <= 0 && Math.abs(pk.v) > 15) { st.creakT = 0.5; Sfx.play('pumpkinCreak'); }
  }
  /* -- scenery wakes up as you pass -- */
  for (const d of c.deco) if (!d.seen && Math.abs(d.x - pk.x) < (d.kind === 'crows' ? 170 : 120)) {
    d.seen = true;
    if (d.kind === 'crows') { Sfx.play('pumpkinCaw'); pumpkinPop(st, d.x, pumpkinGY(st, d.x) - 70, 'Caw!', '#ffffff', 16); }
    else if (d.kind === 'ghost') { Sfx.play('pumpkinBoo'); pumpkinPop(st, d.x, pumpkinGY(st, d.x) - 150, 'Boo! Hee hee!', '#ffffff', 18); }
    else if (d.kind === 'frog') Sfx.play('pumpkinRibbit');
  }
  /* -- the room end: the swap gate, or the wagon -- */
  if (c.swap && pk.x >= c.swap.x) { pumpkinStartSwap(st); return; }
  if (c.wagon && pk.x >= c.wagon.bedX) { pumpkinStartFinish(st); return; }
  /* -- sounds and nudges -- */
  st.rollSnd -= Math.abs(pk.v) * dt;
  if (st.rollSnd <= 0) { st.rollSnd = 72; if (Math.abs(pk.v) > 12) Sfx.play('pumpkinRoll'); }
  if (pushing && !st.pushSnd) Sfx.play('pumpkinPush', st.pusher);
  st.pushSnd = !!pushing;
  if (rJump) pumpkinWrong(st, st.rider, 'hop');
  // the rider holding ◀ ▶ uphill while the pusher is in front: that's fine. A pusher pressing ▼ does nothing: say what it does
  if (ui.down && !ui.left && !ui.right) { st.wrongT[st.pusher] += dt; if (st.wrongT[st.pusher] > 0.7) pumpkinWrong(st, st.pusher, 'down'); } else st.wrongT[st.pusher] = 0;
  pumpkinNudges(st);
}
// pressing the other job's keys: a friendly word, now and then
function pumpkinWrong(st, id, what) {
  const key = 'wrong' + id + what, now = G.time;
  if (st.hinted[key] && now - st.hinted[key] < 14) return;
  if (what === 'hop') { st.hopN = (st.hopN || 0) + 1; if (st.hopN < 3) return; st.hopN = 0; }
  st.hinted[key] = now;
  if (what === 'hop') pumpkinHint(st, id, 'Wheee! Your job: ' + pumpkinKey(id, 'lr') + ' to balance');
  else pumpkinHint(st, id, 'Push: walk into the pumpkin ' + pumpkinKey(id, 'right'));
}
// the gentle lessons, once each room, when they first matter
function pumpkinNudges(st) {
  const nd = pumpkinNeeds(st), pk = st.pk;
  if (nd.pusher === 'front') pumpkinHintOnce(st, 'front', st.pusher, 'Downhill! Leapfrog in front: ' + pumpkinKey(st.pusher, 'jump'));
  if (nd.pusher === 'hold' && pk.v > PUMPKIN.vBack + 25) pumpkinHintOnce(st, 'hold', st.pusher, 'Hold it back: ' + pumpkinKey(st.pusher, 'left') + ' into it');
  if (nd.rider === 'fwd' && nd.onUp && pk.v < 10 && st.pu.act > 0) pumpkinHintOnce(st, 'fwd', st.rider, 'Too steep! Lean forward ' + pumpkinKey(st.rider, 'right'));
  if (nd.rider === 'back' && nd.onDown && pk.v > 90) pumpkinHintOnce(st, 'back', st.rider, 'Too fast! Lean back ' + pumpkinKey(st.rider, 'left'));
}

/* ---------- what each job needs right now (the prompts, the panels and the computer read this) ---------- */
function pumpkinNeeds(st) {
  const P = PUMPKIN, pk = st.pk, pu = st.pu, c = st.c, out = { rider: 'center', pusher: 'push', onUp: false, onDown: false, downD: 9999, rockD: 9999, bridge: null, gust: null };
  if (!pk || pk.state !== 'roll') { out.rider = out.pusher = null; return out; }
  const x = pk.x, v = pk.v;
  const up = c.ups.find(u => x > u.x0 - 40 && x < u.x1 + 10);
  out.onUp = !!up;
  // the next steep down into water (or mud), and whether we're on it or the bridge at its foot
  let dn = null;
  for (const d of c.downs) {
    if (!d.wet) continue;
    const br = c.bridges.find(b => Math.abs(b.x0 - d.x1) < 40);
    const end = br ? br.x1 + 10 : d.x1 + 10;
    if (x < end) { dn = { d, br, end }; break; }
  }
  if (dn) { out.downD = dn.d.x0 - x; out.onDown = x > dn.d.x0 - 12 && x < dn.end; out.bridge = dn.br; }
  const dry = c.downs.find(d => !d.wet && x > d.x0 - 20 && x < d.x1);
  // the rider
  const rock = c.rocks.find(r => (v >= 0 ? r.x - x : x - r.x) > -8 && (v >= 0 ? r.x - x : x - r.x) < Math.abs(v) * 0.45 + 34 && Math.abs(v) > 25);
  if (rock) out.rockD = Math.abs(rock.x - x);
  const slope = pumpkinSlope(st, x);
  if (out.onUp) out.rider = 'fwd';
  else if (pu.side <= 0 && dn && !out.onDown && out.downD < P.frogD && v > P.frogV - 20) out.rider = 'back';   // slow it on the crest, so the pusher can leapfrog in front
  else if (pu.side > 0 && dn && out.downD > -30 && out.downD < P.frogD + 60 && slope < 0.1 && v < (out.downD > 70 ? 70 : 40)) out.rider = out.downD > 70 ? 'fwd' : 'nudge';   // the pusher waits in front: roll it to the edge, then tip it over gently
  else if (out.onDown && dn.br && x > dn.d.x1 - 6) out.rider = v < 70 ? 'fwd' : v > 108 ? 'back' : 'center';   // on the bridge: roll it across at a steady walk
  else if (out.onDown || out.downD < 20 + Math.max(0, v) * 0.35) out.rider = v < 40 && slope < 0.12 && pu.side > 0 ? 'nudge' : 'back';   // (at the very top it still needs tipping over)
  else if (dry && v > 135) out.rider = 'back';   // a dry hill: brake when it gets too fast to stand on
  else if (rock && !out.onUp) out.rider = 'hug';
  for (const g of c.gusts) if (g.state === 'warn' || g.state === 'blow') out.gust = g;
  // the pusher
  if (pu.side < 0 || pu.frog && pu.frog.to < 0) out.pusher = dn && out.downD < P.frogD && !out.onUp ? 'front' : 'push';
  else out.pusher = dn && (out.onDown || out.downD < P.frogD + 60) ? 'hold' : 'behind';
  return out;
}

/* ---------- fails: a sploosh at a bridge, a tumble off the top ---------- */
const pumpkinSafe = b => (b.gold === 3 ? Infinity : b.gold === 2 ? PUMPKIN.vSafeGold2 : b.gold ? PUMPKIN.vSafeGold : PUMPKIN.vSafe);
// did each player press something lately? (gold help only counts tries you both took part in)
const pumpkinBoth = st => G.time - st.inT[0] < PUMPKIN.tryWin && G.time - st.inT[1] < PUMPKIN.tryWin;
function pumpkinStartSplash(st, b) {
  const pk = st.pk, rd = st.rd, P = PUMPKIN;
  pk.state = 'splash'; pk.t = 0; pk.splashB = b; pk.v0 = pk.v;
  b.fails++; b.broke = 1;
  if (pumpkinBoth(st)) b.tries++;
  st.stats.splashes++; st.stats.roomFails[st.k]++;
  const pond = b.kind === 'pond';
  pumpkinPop(st, pk.x, pk.y - 90, pond ? 'SPLOOSH!' : 'SQUELCH!', pond ? '#9fe0ff' : '#e0b27a', 34);
  Sfx.play(pond ? 'pumpkinSploosh' : 'pumpkinSquelch'); rumble(0, 0.5, 0.6, 260); rumble(1, 0.5, 0.6, 260);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.2);
  const feet = pumpkinRiderFeet(st);
  rd.fly = { t: 0, x0: feet.x, y0: feet.y, x1: b.x0 - 40, y1: pumpkinGY(st, b.x0 - 40), spin: 1 };
  // what went wrong, said to whoever can fix it (each splash)
  const pu = st.pu, U = st.pusher, Rr = st.rider;
  if (pu.side <= 0 && !pu.frog) pumpkinHint(st, U, 'Leapfrog in front first! ' + pumpkinKey(U, 'jump') + ' next to it', 3.2);
  else if (pu.act >= 0) pumpkinHint(st, U, 'Hold it back: walk ' + pumpkinKey(U, 'left') + ' into it', 3.2);
  if (rd.lean > -0.5) pumpkinHint(st, Rr, 'Lean back ' + pumpkinKey(Rr, 'left') + ' all the way down!', 3.2);
  if (!pumpkinBoth(st)) {
    const lazy = [0, 1].filter(k => G.time - st.inT[k] >= P.tryWin);
    for (const k of lazy) pumpkinHint(st, k, k === st.pusher ? 'Your turn! Hold it back from in front' : 'Your turn! Lean back to brake', 3.4);
  }
}
function pumpkinSplashStep(st, dt) {
  const P = PUMPKIN, pk = st.pk, b = pk.splashB, rd = st.rd;
  pk.t += dt;
  // the pumpkin plops into the water with a big splash and bobs there
  const bottomY = pumpkinGY(st, (b.x0 + b.x1) / 2) + 38 - P.R * 0.35;
  pk.x = approach(pk.x, clamp(pk.x, b.x0 + P.R * 0.7, b.x1 - P.R * 0.7), dt * 200);
  if (pk.t < 0.35) pk.y = pumpkinLerp(pumpkinPC(st, pk.x), bottomY, pumpkinSmooth(pk.t / 0.35));
  else pk.y = bottomY + Math.sin((pk.t - 0.35) * 8) * 3;
  pk.ang += (pk.v0 || 0) * 0.002 * dt;
  if (pk.t > 0.3 && !pk.splashed) {
    pk.splashed = true;
    const pond = b.kind === 'pond';
    for (let i = 0; i < 34; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()), s = 120 + Math.random() * 280; pumpkinPart(st, pk.x + (Math.random() - 0.5) * 60, bottomY - 10, Math.cos(a) * s, Math.sin(a) * s, 0.9, pond ? (i % 3 ? '#9fe0ff' : '#ffffff') : (i % 3 ? '#8a5a34' : '#b07a48'), 3 + Math.random() * 4, 700); }
  }
  pumpkinRiderFly(st, dt, 0.9);
  if (pk.t >= P.splashT) pumpkinPoofBack(st);
}
function pumpkinStartTumble(st) {
  const pk = st.pk, rd = st.rd;
  pk.state = 'tumble'; pk.t = 0; pk.v0 = pk.v;
  st.stats.tumbles++; st.stats.roomFails[st.k]++;
  if (G.time - st.inT[st.rider] < PUMPKIN.tryWin) st.roomTumbles++;   // (sticky boots only count falls while the rider was trying)
  const dir = Math.sign(rd.phi) || 1, feet = pumpkinRiderFeet(st);
  rd.fly = { t: 0, x0: feet.x, y0: feet.y, x1: pk.x + dir * 120, y1: pumpkinGY(st, pk.x + dir * 120), spin: dir };
  pumpkinPop(st, feet.x, feet.y - 60, 'Whoa!', '#ffffff', 30);
  Sfx.play('pumpkinWhoa'); rumble(st.rider, 0.4, 0.5, 220);
  pumpkinHintOnce(st, 'tumble', st.rider, dir > 0 ? 'Walk back ' + pumpkinKey(st.rider, 'left') + ' as it rolls!' : 'Walk forward ' + pumpkinKey(st.rider, 'right') + ' as it rolls back!');
  const want = st.roomTumbles >= PUMPKIN.tumbleHelp2 ? 2 : st.roomTumbles >= PUMPKIN.tumbleHelp ? 1 : 0;
  if (want > st.sticky) {
    st.sticky = want; st.stats.helps++;
    pumpkinMsg(st, want === 1 ? 'Sticky boots! Balancing is easier now' : 'Super sticky boots! No more sliding off', C.gold, 3.4);
    Sfx.play('pumpkinHelp');
  }
}
function pumpkinTumbleStep(st, dt) {
  const P = PUMPKIN, pk = st.pk;
  pk.t += dt;
  pk.v = approach(pk.v, 0, 500 * dt);
  pk.x += pk.v * dt; pk.ang += pk.v / P.R * dt;
  const bale = st.c.bales[st.cp];
  if (pk.x < bale.x + 72) { pk.x = bale.x + 72; pk.v = 0; }
  pk.y = pumpkinPC(st, pk.x);
  pumpkinRiderFly(st, dt, 0.75);
  if (pk.t >= P.tumbleT) pumpkinPoofBack(st);
}
function pumpkinRiderFly(st, dt, dur) {
  const fl = st.rd.fly;
  if (!fl) return;
  fl.t += dt;
  if (fl.t >= dur && !fl.landed) { fl.landed = true; Sfx.play('pumpkinFlop'); const p = G.players[st.rider]; p.sx = 1.4; p.sy = 0.6; }
}
// a puff of purple smoke, and you're back at the last bale
function pumpkinPoofBack(st) {
  const pk = st.pk, b = pk.splashB;
  if (b) {
    b.broke = 0;
    const P = PUMPKIN, want = b.tries >= P.bridgeTries3 ? 3 : b.tries >= P.bridgeTries2 ? 2 : b.tries >= P.bridgeTries ? 1 : 0;
    if (want > (b.gold || 0)) {
      b.gold = want; st.stats.helps++;
      pumpkinMsg(st, ['', 'Gold planks! This bridge holds a faster pumpkin now', 'Super gold planks! Extra strong for you two', 'Mister Straw piled hay on the bridge! Nothing sinks now'][want], C.gold, 3.6);
      Sfx.play('pumpkinHelp');
    }
  }
  for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 150; pumpkinPart(st, pk.x, pk.y, Math.cos(a) * s, Math.sin(a) * s - 30, 0.8, i % 2 ? '#b48cff' : '#d9c2ff', 8 + Math.random() * 8, -40, 'smoke'); }
  // a tumble on level ground: the rider just climbs back on right there. Anything else: back to the last bale
  const here = !b && pk.x > st.c.bales[st.cp].x + 100 && [-60, -30, 0, 30, 60].every(d => Math.abs(pumpkinSlope(st, pk.x + d)) < 0.05)
    && !st.c.bridges.some(br => pk.x > br.x0 - 60 && pk.x < br.x1 + 60) && Math.abs(st.pu.x - pk.x) < 120 && !st.pu.frog;
  pumpkinPlace(st, st.cp, here ? pk.x : null);
  const np = st.pk;
  for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 150; pumpkinPart(st, np.x, np.y, Math.cos(a) * s, Math.sin(a) * s - 30, 0.8, i % 2 ? '#b48cff' : '#d9c2ff', 8 + Math.random() * 8, -40, 'smoke'); }
  pumpkinPop(st, np.x, np.y - 100, 'Poof!', '#d9c2ff', 26);
  Sfx.play('pumpkinPoof');
  for (const gu of st.c.gusts) if (gu.x > np.x) { gu.state = 'wait'; gu.t = 0; }
  st.gustNow = null;
}

/* ---------- the swap gate and the hayride ---------- */
function pumpkinRiderFeet(st) {
  const P = PUMPKIN, pk = st.pk, rd = st.rd, hop = rd.hopT > 0 ? Math.sin(rd.hopT / 0.34 * Math.PI) * 16 : 0;
  return { x: pk.x + P.R * Math.sin(rd.phi), y: pk.y - P.R * Math.cos(rd.phi) - hop - (pk.bob > 0 ? Math.sin(pk.bob / 0.28 * Math.PI) * 7 : 0) };
}
function pumpkinStartSwap(st) {
  const pk = st.pk;
  pk.state = 'swap'; pk.t = 0;
  st.stats.roomT[st.k] = G.time - st.segStart;
  const feet = pumpkinRiderFeet(st);
  st.swap = { t: 0, r0: feet, u0: { x: st.pu.x, y: st.pu.y }, said: false };
  pumpkinPop(st, pk.x, pk.y - 175, 'Swap jobs!', C.gold, 30);
  Sfx.play('pumpkinSwap'); rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
  for (let i = 0; i < 24; i++) { const a = -Math.PI * Math.random(); pumpkinPart(st, st.c.swap.x, pumpkinGY(st, st.c.swap.x) - 90, Math.cos(a) * 200, Math.sin(a) * 200, 0.9, ['#ff9a3d', '#b48cff', '#8fe3b0', C.gold][i % 4], 4, 400, 'conf'); }
}
function pumpkinSwapStep(st, dt) {
  const P = PUMPKIN, pk = st.pk, sw = st.swap;
  sw.t += dt;
  pk.v = approach(pk.v, 0, 260 * dt); pk.x += pk.v * dt; pk.ang += pk.v / P.R * dt; pk.y = pumpkinPC(st, pk.x);
  if (sw.t > 0.55 && !sw.said) { sw.said = true; Sfx.play('pumpkinFrog', 0); Sfx.play('pumpkinFrog', 1); }
  if (sw.t >= P.swapT) {
    const L = G.level;
    if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return true; }
    pumpkinClear(st); return true;
  }
  return false;
}
function pumpkinStartFinish(st) {
  const pk = st.pk, w = st.c.wagon;
  pk.state = 'finish'; pk.t = 0;
  st.stats.roomT[st.k] = G.time - st.segStart;
  st.fin = { t: 0, r0: pumpkinRiderFeet(st), u0: { x: st.pu.x, y: st.pu.y }, carved: false, drive: 0, cleared: false, bedX: w.bedX };
  pumpkinPop(st, pk.x, pk.y - 175, 'All aboard the hayride!', C.gold, 28);
  Sfx.play('pumpkinToot'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
}
function pumpkinFinStep(st, dt) {
  const P = PUMPKIN, pk = st.pk, fin = st.fin;
  fin.t += dt;
  // it rolls to a stop on the wagon bed, then rides along with the wagon when it drives off
  pk.v = approach(pk.v, 0, 400 * dt);
  fin.restX = Math.min((fin.restX == null ? pk.x : fin.restX) + pk.v * dt, fin.bedX + 30);
  pk.x = fin.restX + (fin.driveX || 0);
  // the pumpkin turns stem-up, then: chop chop, a big goofy smile, lit from inside
  const want = Math.round(pk.ang / (Math.PI * 2)) * Math.PI * 2;
  pk.ang = approach(pk.ang, want, dt * 3);
  pk.y = pumpkinPC(st, fin.restX);
  if (fin.t > 1.0 && !fin.chop) { fin.chop = true; Sfx.play('pumpkinChop'); }
  if (fin.t > 1.55 && !fin.carved) {
    fin.carved = true;
    pumpkinPop(st, pk.x, pk.y - 140, 'Ta-da! A happy jack-o\'-lantern!', '#ffd75e', 26);
    Sfx.play('pumpkinCarve');
    for (let i = 0; i < 60; i++) confetti(pk.x - st.cam.x, pk.y - st.cam.y - 60);
  }
  if (fin.t > 2.6) fin.drive = Math.min(160, fin.drive + dt * 90);
  if (fin.t > 2.6 && !fin.toot) { fin.toot = true; Sfx.play('pumpkinToot'); }
  if (fin.t >= P.finT && !fin.cleared) { fin.cleared = true; pumpkinClear(st); return true; }
  return false;
}
function pumpkinClear(st) {
  const pk = st.pk;
  G.level.goal = { x: pk.x - st.cam.x, y: pk.y - 80 - st.cam.y };
  levelClear();
}

/* ---------- small helpers ---------- */
function pumpkinHint(st, id, text, life) { if (pumpkinQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || PUMPKIN.hintLife }; }
function pumpkinHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; pumpkinHint(st, id, text); }
function pumpkinMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function pumpkinPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 12) st.pops.shift(); }
function pumpkinPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 300) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
// the touch buttons and the top-bar legend name each player's own action this room: the pusher pushes, the rider hugs
let pumpkinLabelEls = null;
function pumpkinActLabels(st) {
  try {
    if (!pumpkinLabelEls || !pumpkinLabelEls.every(o => document.contains(o.el))) pumpkinLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of pumpkinLabelEls) {
      const want = o.id < 0 ? 'push/hug' : o.id === st.pusher ? 'push' : 'hug';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function pumpkinCam(st, dt) {
  const P = PUMPKIN, pk = st.pk, cam = st.cam;
  let tx = pk.x - P.camLead + clamp(pk.v * 0.4, -60, 90);
  // look a little down the hill ahead (or up it), so a steep down and its bridge stay above the job panels
  let ty = pk.y * 0.55 + pumpkinPC(st, Math.min(pk.x + 320, st.c.len)) * 0.45 - P.camY;
  // a bridge coming up: keep its planks above the job panels (but the rider and the prompts stay on screen)
  if (pk.state === 'roll') {
    const b = st.c.bridges.find(br => br.x1 > pk.x - 20 && br.x0 < pk.x + 620);
    if (b) { const panel = Math.round(56 * (hudBig() ? 1.4 : 1)) + 10; ty = Math.min(Math.max(ty, pumpkinGY(st, b.x0) + 40 - (H - panel - 30)), pk.y - 240); }
  }
  if (pk.state === 'splash') ty = pumpkinPC(st, pk.x) - P.camY;
  if (G.introT > 0) ty -= P.introDrop;   // (during the room card the pumpkin sits lower, under the card)
  if (pk.state === 'finish') { tx = st.fin.bedX - 420 + (st.fin.driveX || 0) * 0.6; ty = pumpkinPC(st, st.fin.bedX) - P.camY - 10; }
  cam.x += (tx - cam.x) * Math.min(1, dt * 5);
  cam.y += (ty - cam.y) * Math.min(1, dt * 4);
}
function pumpkinFx(st, dt) {
  const pk = st.pk;
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'smoke') { q.vx *= 1 - dt * 2.5; q.vy *= 1 - dt * 2.5; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.2);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  for (const b of st.c.bales) if (b.lit) b.litT += dt;
  for (const b of st.c.bridges) b.wob = Math.max(0, b.wob - dt * 2);
  for (const d of st.c.deco) if (d.seen) d.t += dt;
  if (st.fin && st.fin.drive) st.fin.driveX = (st.fin.driveX || 0) + st.fin.drive * dt;
  // dust when the pusher digs in, soil flicks from a fast roll
  if (pk.state === 'roll') {
    st.dustT -= dt;
    if (st.dustT <= 0) {
      st.dustT = 0.06;
      const pu = st.pu;
      if (pu.act && Math.abs(pk.v) > 5) pumpkinPart(st, pu.x - pu.side * 8, pu.y - 2, -pu.side * (30 + Math.random() * 40), -30 - Math.random() * 30, 0.4, 'rgba(190,150,110,0.8)', 3 + Math.random() * 2, 200);
      if (Math.abs(pk.v) > 140) pumpkinPart(st, pk.x - Math.sign(pk.v) * 20, pk.y + PUMPKIN.R - 3, -pk.v * 0.3, -40 - Math.random() * 60, 0.4, 'rgba(120,85,60,0.9)', 2 + Math.random() * 2, 500);
    }
  }
}
// copy the job positions into the engine players (screen px): name tags, bubbles and drawPlayer read p.x / p.y
function pumpkinMirror(st) {
  const P = PUMPKIN, pk = st.pk, cam = st.cam, ps = G.players;
  const feet = [null, null];
  const rf = pumpkinRiderFeet(st);
  feet[st.rider] = rf; feet[st.pusher] = { x: st.pu.x, y: st.pu.y };
  if (st.rd.fly && (pk.state === 'splash' || pk.state === 'tumble')) feet[st.rider] = pumpkinFlyPos(st);
  if (pumpkinBoarding(st)) {
    const gx = pk.x + 62, ground = { x: gx, y: pumpkinGY(st, gx) };
    feet[st.rider] = st.rd.board < 0 ? ground : pumpkinArc(ground, rf, st.rd.board / P.boardT, 46);
  }
  if (pk.state === 'swap') {
    const u = clamp((st.swap.t - 0.45) / 0.8, 0, 1), sw = st.swap;
    feet[st.rider] = pumpkinArc(sw.r0, { x: pk.x - P.D - 6, y: pumpkinGY(st, pk.x - P.D - 6) }, u, 90);
    feet[st.pusher] = pumpkinArc(sw.u0, { x: pk.x, y: pk.y - P.R }, u, 130);
  }
  if (pk.state === 'finish') {
    const fin = st.fin, u = clamp((fin.t - 0.3) / 0.7, 0, 1), dx = fin.driveX || 0, bedY = pumpkinGY(st, fin.bedX);
    const rx = fin.restX == null ? pk.x : fin.restX;
    feet[st.rider] = pumpkinArc(fin.r0, { x: rx + 70, y: bedY }, u, 70);
    feet[st.pusher] = pumpkinArc(fin.u0, { x: rx - 70, y: bedY }, u, 110);
    for (const k of [0, 1]) { feet[k].x += dx; if (u >= 1) feet[k].y -= Math.abs(Math.sin((fin.t - 1) * 7 + k * 1.4)) * 12; }
  }
  for (const p of ps) {
    const f = feet[p.id];
    p.x = f.x - cam.x - PW / 2; p.y = f.y - cam.y - PH;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0;
    p.face = p.id === st.pusher ? st.pu.face : 1;
    p.vx = pk.v;
    p.stun = (pk.state === 'tumble' || pk.state === 'splash') && p.id === st.rider ? 0.5 : 0;
  }
}
const pumpkinBoarding = st => st.rd.board != null && st.rd.board < PUMPKIN.boardT && st.pk.state === 'roll';
function pumpkinFlyPos(st) {
  const fl = st.rd.fly, dur = st.pk.state === 'splash' ? 0.9 : 0.75, u = clamp(fl.t / dur, 0, 1);
  return pumpkinArc({ x: fl.x0, y: fl.y0 }, { x: fl.x1, y: fl.y1 }, u, 80);
}
function pumpkinArc(a, b, u, h) {
  const e = pumpkinSmooth(u);
  return { x: pumpkinLerp(a.x, b.x, e), y: pumpkinLerp(a.y, b.y, u) - h * 4 * u * (1 - u), u };
}

MODES.pumpkin = {
  // medal goals (js/medals.js): time and slips (splashes plus tumbles)
  medals: { bronze: 'Roll the pumpkin home', goals: [
    { key: 'time', gold: 240, silver: 390 },
    { key: 'fails', gold: 2, silver: 8, word: 'splash or tumble', text: n => `${n} or fewer splashes and tumbles`,
      gap: (v, n) => { const d = Math.max(1, Math.ceil(v - n)); return d + ' fewer ' + (d === 1 ? 'splash or tumble' : 'splashes and tumbles'); } },
  ] },
  medalValues() { const s = G.mst.stats; return s ? { fails: s.splashes + s.tumbles } : {}; },
  PUMPKIN,
  compile: pumpkinCompile, gy: pumpkinGY, pc: pumpkinPC, needs: pumpkinNeeds, key: pumpkinKey, riderFeet: pumpkinRiderFeet, lim: pumpkinLim, boots: pumpkinBoots, rockAhead: pumpkinRockAhead, slope: pumpkinSlope,
  setup(st, L) {
    st.stats = { splashes: 0, tumbles: 0, frogs: [0, 0], pushT: [0, 0], leanT: [0, 0], helps: 0, roomT: [], roomFails: [], roomTitles: [] };
    pumpkinRoom(st, L, 0);
  },
  room(k, L) { pumpkinRoom(G.mst, L, k); },
  step(dt) { pumpkinStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.pk) return;
    pumpkinDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.pk) return;
    pumpkinDrawFront(st);
  },
  hud() { const st = G.mst; if (st.pk) pumpkinHud(st); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const fails = s.splashes + s.tumbles;
    const out = [
      { label: 'Splashes', value: s.splashes },
      { label: 'Tumbles', value: s.tumbles },
      { label: 'Leapfrogs', values: s.frogs.slice() },
    ];
    let best = -1;
    s.roomFails.forEach((f, k) => { if (s.roomT[k] == null) return; if (best < 0 || f < s.roomFails[best] || (f === s.roomFails[best] && s.roomT[k] < s.roomT[best])) best = k; });
    const words = fails === 0 ? 'Not one splash or tumble. Gourd-geous!' : fails <= 3 ? 'Smooth rolling, pumpkin pals!' : 'Wobbly, splashy, and you made it together!';
    out.push(best >= 0 && fails > 0 ? words + ' Smoothest stretch: ' + s.roomTitles[best] + '.' : words);
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
let pumpkinSkyG = null, pumpkinStars = null, pumpkinWaterG = null;
function pumpkinDrawWorld(st) {
  pumpkinDrawSky(st);
  pumpkinDrawFar(st);
  pumpkinDrawMid(st);
  pumpkinDrawBack(st);      // scenery standing behind the track (scarecrows, trees, signs, gate posts, wagon)
  pumpkinDrawGround(st);
  pumpkinDrawPatch(st);
  pumpkinDrawBales(st);
  pumpkinDrawRocks(st);
}
function pumpkinDrawFront(st) {
  const pk = st.pk;
  pumpkinDrawGusts(st);
  if (pk.state === 'finish') pumpkinDrawWagon(st, true);
  pumpkinDrawHelper(st);
  pumpkinDrawPusher(st);
  pumpkinDrawPumpkin(st);
  pumpkinDrawRider(st);
  if (pk.state === 'finish') pumpkinDrawWagon(st, false);
  pumpkinDrawGate(st, true);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1), x = q.x - st.cam.x, y = q.y - st.cam.y;
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    ctx.globalAlpha = q.kind === 'smoke' ? a * 0.8 : a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { pumpkinStar(x, y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'smoke') { circle(x, y, q.size * (1.4 - 0.6 * a)); ctx.fill(); }
    else { circle(x, y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - st.cam.x, 90, W - 90), y = clamp(q.y - st.cam.y - q.t * 34, 70, H - 90);
    ctx.globalAlpha = clamp((1.2 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function pumpkinStar(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function pumpkinDrawSky(st) {
  if (!pumpkinSkyG) {
    pumpkinSkyG = ctx.createLinearGradient(0, 0, 0, H);
    pumpkinSkyG.addColorStop(0, '#241b4d'); pumpkinSkyG.addColorStop(0.45, '#5a3a86'); pumpkinSkyG.addColorStop(0.78, '#c46a7a'); pumpkinSkyG.addColorStop(1, '#f0915a');
  }
  ctx.fillStyle = pumpkinSkyG; ctx.fillRect(0, 0, W, H);
  if (!pumpkinStars) { pumpkinStars = []; for (let i = 0; i < 46; i++) pumpkinStars.push({ x: hash(i, 3) % W, y: 8 + hash(i, 5) % 210, s: 0.8 + (hash(i, 9) % 10) / 8, ph: (hash(i, 7) % 100) / 16 }); }
  for (const s of pumpkinStars) {
    const x = ((s.x - st.cam.x * 0.02) % W + W) % W;
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(G.clock * 1.7 + s.ph);
    ctx.fillStyle = '#fff4d8'; circle(x, s.y, s.s); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // the big orange harvest moon
  const mx = 742, my = 104;
  ctx.fillStyle = 'rgba(255,170,90,0.16)'; circle(mx, my, 98); ctx.fill();
  ctx.fillStyle = 'rgba(255,186,100,0.28)'; circle(mx, my, 74); ctx.fill();
  ctx.fillStyle = '#ffc86e'; circle(mx, my, 58); ctx.fill();
  ctx.fillStyle = '#f5b357';
  for (const [dx, dy, r] of [[-20, -14, 11], [16, 10, 8], [-6, 24, 6], [24, -22, 5], [-30, 12, 4]]) { circle(mx + dx, my + dy, r); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,240,200,0.35)'; circle(mx - 18, my - 20, 20); ctx.fill();
  // a few friendly bats flap across now and then
  for (let i = 0; i < 3; i++) {
    const per = 19 + i * 7, u = ((G.clock + i * 6.3) % per) / per;
    if (u > 0.55) continue;
    const bx = pumpkinLerp(-60, W + 60, u / 0.55) , by = 60 + i * 46 + Math.sin(G.clock * 2 + i) * 18;
    pumpkinBat(i % 2 ? W - bx : bx, by, 0.75 + i * 0.12, G.clock * 11 + i, i % 2 ? -1 : 1);
  }
  // wisps of cloud across the moon
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 3; i++) {
    const x = ((i * 380 - st.cam.x * 0.03 + G.clock * (4 + i * 2)) % (W + 300) + W + 300) % (W + 300) - 150;
    ctx.fillStyle = '#7d5a9e'; ctx.beginPath(); ctx.ellipse(x, 70 + i * 52, 90, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 30, 63 + i * 52, 50, 8, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// a friendly bat: little body, smile, flapping wings
function pumpkinBat(x, y, s, ph, dir) {
  const f = Math.sin(ph) * 0.8;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
  ctx.fillStyle = '#3b2a5c';
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sd * 12, -10 - f * 12, sd * 24, -4 - f * 14);
    ctx.quadraticCurveTo(sd * 18, 0, sd * 16, 4); ctx.quadraticCurveTo(sd * 10, 2, sd * 7, 6); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, 1, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-3, -11); ctx.lineTo(-1, -6); ctx.moveTo(5, -5); ctx.lineTo(3, -11); ctx.lineTo(1, -6); ctx.fill();
  ctx.fillStyle = '#ffe08a'; circle(-2.5, -1, 1.6); ctx.fill(); circle(2.5, -1, 1.6); ctx.fill();
  ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 2, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}
// far hills: a farmhouse, a barn with a lit window, a windmill
function pumpkinDrawFar(st) {
  const off = st.cam.x * 0.1, hy = 330 - clamp((st.cam.y + 200) * 0.03, -30, 40);
  const yAt = sx => hy + Math.sin((sx + off) * 0.004) * 26 + Math.sin((sx + off) * 0.009 + 1) * 10;
  ctx.fillStyle = '#5a3f78';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 16) ctx.lineTo(sx, yAt(sx));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(230,170,200,0.22)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let sx = 0; sx <= W; sx += 16) sx ? ctx.lineTo(sx, yAt(sx) + 1) : ctx.moveTo(sx, yAt(sx) + 1);
  ctx.stroke();
  // fields in rows on the far hills
  ctx.strokeStyle = 'rgba(40,24,64,0.28)'; ctx.lineWidth = 1.5;
  for (let k = 1; k <= 3; k++) { ctx.beginPath(); for (let sx = 0; sx <= W; sx += 16) { const y = yAt(sx) + k * 14 + Math.sin((sx + off) * 0.01 + k) * 3; sx ? ctx.lineTo(sx, y) : ctx.moveTo(sx, y); } ctx.stroke(); }
  const RW = 1700;
  for (const [bx0, kind] of [[260, 'barn'], [900, 'house'], [1350, 'mill']]) for (const rep of [-1, 0, 1, 2]) {
    const sx = bx0 - (off % RW) + rep * RW;
    if (sx < -120 || sx > W + 120) continue;
    const gy = yAt(sx) + 4;
    ctx.fillStyle = '#3f2c5a';
    if (kind === 'barn') {
      ctx.beginPath(); ctx.moveTo(sx - 34, gy); ctx.lineTo(sx - 34, gy - 34); ctx.lineTo(sx - 20, gy - 52); ctx.lineTo(sx + 20, gy - 52); ctx.lineTo(sx + 34, gy - 34); ctx.lineTo(sx + 34, gy); ctx.fill();
      ctx.fillStyle = 'rgba(230,170,200,0.2)'; ctx.fillRect(sx - 34, gy - 34, 3, 34);
      ctx.strokeStyle = '#4f3970'; ctx.lineWidth = 1.5; ctx.strokeRect(sx - 12, gy - 22, 24, 22); ctx.beginPath(); ctx.moveTo(sx - 12, gy - 22); ctx.lineTo(sx + 12, gy); ctx.moveTo(sx + 12, gy - 22); ctx.lineTo(sx - 12, gy); ctx.stroke();
      ctx.fillStyle = '#ffcf6e'; ctx.fillRect(sx - 6, gy - 40, 12, 9);
      ctx.fillStyle = 'rgba(255,207,110,0.25)'; circle(sx, gy - 36, 14); ctx.fill();
    } else if (kind === 'house') {
      ctx.fillRect(sx - 22, gy - 30, 44, 30); ctx.beginPath(); ctx.moveTo(sx - 28, gy - 28); ctx.lineTo(sx, gy - 50); ctx.lineTo(sx + 28, gy - 28); ctx.fill();
      ctx.fillRect(sx + 10, gy - 52, 6, 14);
      ctx.fillStyle = '#ffcf6e'; ctx.fillRect(sx - 14, gy - 22, 8, 8); ctx.fillRect(sx + 6, gy - 22, 8, 8);
    } else {
      ctx.fillRect(sx - 3, gy - 64, 6, 64);
      ctx.save(); ctx.translate(sx, gy - 64); ctx.rotate(G.clock * 0.5);
      for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-2, 0, 4, 26); ctx.fillRect(-6, 8, 12, 16); }
      ctx.restore();
    }
  }
}
// the nearer layer: dark rolling hills with bare trees and corn rows
function pumpkinDrawMid(st) {
  const off = st.cam.x * 0.3, hy = 392 - clamp((st.cam.y + 200) * 0.08, -60, 80);
  const yAt = sx => hy + Math.sin((sx + off) * 0.0052 + 2) * 20 + Math.sin((sx + off) * 0.013) * 7;
  ctx.fillStyle = '#44305f';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 16) ctx.lineTo(sx, yAt(sx));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(200,150,220,0.2)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let sx = 0; sx <= W; sx += 16) sx ? ctx.lineTo(sx, yAt(sx) + 1) : ctx.moveTo(sx, yAt(sx) + 1);
  ctx.stroke();
  const TW = 120;
  for (let k = Math.floor(off / TW) - 1; k < Math.floor(off / TW) + W / TW + 2; k++) {
    const h = hash(k, 31), sx = k * TW - off + (h % 50), gy = yAt(sx) + 4;
    ctx.strokeStyle = '#35244c'; ctx.fillStyle = '#35244c';
    if (h % 4 === 0) {   // a bare twisty tree
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, gy); ctx.quadraticCurveTo(sx + 4, gy - 30, sx - 2, gy - 54); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx, gy - 36); ctx.quadraticCurveTo(sx + 16, gy - 44, sx + 22, gy - 58); ctx.moveTo(sx - 1, gy - 46); ctx.quadraticCurveTo(sx - 14, gy - 52, sx - 18, gy - 64); ctx.stroke();
      ctx.lineCap = 'butt';
    } else if (h % 4 === 1) {   // corn stalks
      for (let j = 0; j < 5; j++) { const cx = sx + j * 9; ctx.fillRect(cx - 1.5, gy - 34 - (j % 2) * 6, 3, 36); ctx.beginPath(); ctx.ellipse(cx + 4, gy - 22, 6, 2, -0.5, 0, Math.PI * 2); ctx.fill(); }
    } else if (h % 4 === 2) {   // a far jack-o'-lantern on a fence post, glowing
      ctx.fillRect(sx - 2, gy - 22, 4, 22);
      ctx.fillStyle = '#ff9a3d'; circle(sx, gy - 28, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,100,' + (0.25 + 0.1 * Math.sin(G.clock * 6 + k)) + ')'; circle(sx, gy - 28, 14); ctx.fill();
      ctx.fillStyle = '#ffe48a'; ctx.fillRect(sx - 4, gy - 30, 2.5, 2.5); ctx.fillRect(sx + 1.5, gy - 30, 2.5, 2.5); ctx.fillRect(sx - 3, gy - 26, 6, 1.6);
    }
  }
}
// the ground: dark soil and a grassy top, cut away into a pond (or mud) under each bridge
function pumpkinDrawGround(st) {
  const c = st.c, cam = st.cam, xa = cam.x - 20, xb = cam.x + W + 20, bot = H + 10;
  const basin = x => { for (const b of c.bridges) if (x > b.x0 - 2 && x < b.x1 + 2) { const u = (x - b.x0) / (b.x1 - b.x0); return 70 * Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.6); } return 0; };
  // ponds first (behind the soil front edge)
  for (const b of c.bridges) {
    if (b.x1 < xa || b.x0 > xb) continue;
    const y0 = pumpkinGY(st, b.x0) - cam.y, wy = y0 + 22;
    if (b.kind === 'pond') {
      if (!pumpkinWaterG) { pumpkinWaterG = ctx.createLinearGradient(0, 0, 0, 80); pumpkinWaterG.addColorStop(0, '#3b6fa8'); pumpkinWaterG.addColorStop(1, '#1f3460'); }
      ctx.save(); ctx.translate(0, wy); ctx.fillStyle = pumpkinWaterG;
      ctx.fillRect(b.x0 - cam.x, 0, b.x1 - b.x0, 80); ctx.restore();
      // the moon's reflection, ripples and lily pads
      ctx.fillStyle = 'rgba(255,200,120,0.35)';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse((b.x0 + b.x1) / 2 - cam.x + Math.sin(G.clock * 1.5 + k) * 4, wy + 8 + k * 9, 22 - k * 4, 2, 0, 0, Math.PI * 2); ctx.fill(); }
      for (let k = 0; k < 3; k++) {
        const lx = b.x0 + (b.x1 - b.x0) * (0.2 + k * 0.3) - cam.x, ly = wy + 4 + (k % 2) * 3;
        ctx.fillStyle = '#4f9a54'; ctx.beginPath(); ctx.ellipse(lx, ly, 12, 4, 0, 0.3, Math.PI * 2 - 0.1); ctx.lineTo(lx, ly); ctx.fill();
        if (k === 1) { ctx.fillStyle = '#ffb3d1'; circle(lx + 3, ly - 2, 3); ctx.fill(); }
      }
    } else {
      ctx.fillStyle = '#6b4226'; ctx.fillRect(b.x0 - cam.x, wy, b.x1 - b.x0, 80);
      ctx.fillStyle = '#7d5030';
      for (let k = 0; k < 5; k++) { const bx = b.x0 + (b.x1 - b.x0) * ((k * 0.23 + G.clock * 0.05) % 1) - cam.x; const r = 2 + ((G.clock * 1.3 + k * 0.4) % 1) * 4; circle(bx, wy + 6, r); ctx.fill(); }
    }
  }
  const pts = [];
  for (let x = Math.floor(xa / 4) * 4; x <= xb; x += 4) pts.push(x);
  ctx.fillStyle = '#4a2f2a';
  ctx.beginPath(); ctx.moveTo(xa - cam.x, bot);
  for (const x of pts) ctx.lineTo(x - cam.x, pumpkinGY(st, x) + basin(x) - cam.y);
  ctx.lineTo(xb - cam.x, bot); ctx.closePath(); ctx.fill();
  // soil layers (darker the deeper), roots and pebbles
  const band = (dy, lw, col) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach((x, i) => { const y = pumpkinGY(st, x) + basin(x) + dy - cam.y; if (i) ctx.lineTo(x - cam.x, y); else ctx.moveTo(x - cam.x, y); }); ctx.stroke(); };
  const deep = (dy, lw, col) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach((x, i) => { const y = pumpkinGY(st, x) + dy - cam.y; if (i) ctx.lineTo(x - cam.x, y); else ctx.moveTo(x - cam.x, y); }); ctx.stroke(); };
  deep(190, 160, 'rgba(24,12,22,0.35)'); deep(100, 14, 'rgba(24,12,22,0.18)');
  band(44, 8, 'rgba(30,18,20,0.35)'); band(14, 6, 'rgba(110,70,55,0.22)');
  ctx.strokeStyle = 'rgba(130,90,70,0.45)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  for (let x = Math.floor(xa / 53) * 53; x < xb; x += 53) {
    const h = hash(x, 13); if (basin(x) > 0 || h % 3) continue;
    const sx = x - cam.x, y = pumpkinGY(st, x) + 10 - cam.y;
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.quadraticCurveTo(sx - 6, y + 10, sx + 2, y + 20); ctx.moveTo(sx - 2, y + 9); ctx.lineTo(sx - 9, y + 14); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  for (let x = Math.floor(xa / 37) * 37; x < xb; x += 37) {
    const h = hash(x, 7); if (basin(x) > 0) continue;
    const px = x - cam.x + (h % 20), py = pumpkinGY(st, x) + 20 + (h % 60) - cam.y, r = 2 + (h % 3);
    ctx.fillStyle = 'rgba(120,80,60,0.5)'; circle(px, py, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,190,0.18)'; circle(px - r * 0.3, py - r * 0.35, r * 0.45); ctx.fill();
  }
  // the grass (not over the water)
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const grass = (lw, col, dy) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
    let on = false;
    for (const x of pts) {
      if (basin(x) > 3) { on = false; continue; }
      const y = pumpkinGY(st, x) + dy - cam.y;
      if (on) ctx.lineTo(x - cam.x, y); else { ctx.moveTo(x - cam.x, y); on = true; }
    }
    ctx.stroke();
  };
  grass(12, '#3f7a3c', 5); grass(6, '#6fae55', 1); grass(2, '#a3d97a', -1);
  ctx.lineCap = 'butt';
  // grass tufts
  ctx.strokeStyle = '#6fae55'; ctx.lineWidth = 2;
  for (let x = Math.floor(xa / 23) * 23; x < xb; x += 23) {
    if (basin(x) > 0) continue;
    const h = hash(x, 19), y = pumpkinGY(st, x) - cam.y, sx = x - cam.x;
    if (h % 3) continue;
    ctx.beginPath(); ctx.moveTo(sx - 3, y); ctx.lineTo(sx - 5, y - 7); ctx.moveTo(sx, y); ctx.lineTo(sx + 1, y - 9); ctx.moveTo(sx + 3, y); ctx.lineTo(sx + 6, y - 6); ctx.stroke();
  }
  // bridges
  for (const b of c.bridges) if (!(b.x1 < xa || b.x0 > xb)) pumpkinDrawBridge(st, b);
}
function pumpkinDrawBridge(st, b) {
  const cam = st.cam, t = G.clock, gold = b.gold, n = Math.max(4, Math.round((b.x1 - b.x0) / 18));
  const sag = x => 5 * Math.sin(Math.PI * clamp((x - b.x0) / (b.x1 - b.x0), 0, 1)) * (1 + b.wob * (1 + Math.sin(t * 30)));
  // posts and rope rails
  for (const x of [b.x0, b.x1]) {
    const y = pumpkinGY(st, x) - cam.y;
    ctx.fillStyle = gold ? '#c9952a' : '#6b4630'; ctx.fillRect(x - cam.x - 4, y - 30, 8, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - cam.x - 4, y - 30, 2, 64);
    ctx.fillStyle = 'rgba(20,10,20,0.3)'; ctx.fillRect(x - cam.x + 2, y - 30, 2, 64);
    ctx.fillStyle = gold ? C.gold : '#8a5c3a'; circle(x - cam.x, y - 31, 5); ctx.fill();
  }
  ctx.strokeStyle = gold ? C.gold : '#d7b07a'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(b.x0 - cam.x, pumpkinGY(st, b.x0) - 28 - cam.y); ctx.quadraticCurveTo((b.x0 + b.x1) / 2 - cam.x, pumpkinGY(st, b.x0) - 12 - cam.y, b.x1 - cam.x, pumpkinGY(st, b.x1) - 28 - cam.y); ctx.stroke();
  if (b.broke) {   // snapped planks dangling
    for (const s of [-1, 1]) {
      const x = s < 0 ? b.x0 : b.x1, y = pumpkinGY(st, x) - cam.y;
      ctx.save(); ctx.translate(x - cam.x, y); ctx.rotate(s * 1.1);
      ctx.fillStyle = '#c98b5a'; ctx.fillRect(0, -3, -s * 26, 7); ctx.restore();
    }
    return;
  }
  for (let k = 0; k < n; k++) {
    const x = b.x0 + (k + 0.5) * (b.x1 - b.x0) / n, y = pumpkinGY(st, x) + sag(x) - cam.y;
    ctx.fillStyle = gold ? (k % 2 ? '#ffd76a' : '#f5c242') : (k % 2 ? '#c98b5a' : '#b87b4c');
    rr(x - cam.x - (b.x1 - b.x0) / n / 2 + 1, y - 2, (b.x1 - b.x0) / n - 2, 9, 2); ctx.fill();
    ctx.fillStyle = gold ? '#a77b15' : '#7a4c2c'; ctx.fillRect(x - cam.x - 1, y + 1, 2, 2);
  }
  if (gold === 3) {   // Mister Straw's hay piled along it
    for (let k = 0; k < n; k += 2) {
      const x = b.x0 + (k + 1) * (b.x1 - b.x0) / n, y = pumpkinGY(st, x) + sag(x) - cam.y;
      ctx.fillStyle = '#e8bd55'; rr(x - cam.x - 15, y - 9, 30, 9, 4); ctx.fill();
      ctx.strokeStyle = '#b8862a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - cam.x - 8, y - 8); ctx.lineTo(x - cam.x - 6, y - 1); ctx.moveTo(x - cam.x + 5, y - 8); ctx.lineTo(x - cam.x + 7, y - 1); ctx.stroke();
    }
  }
  // the SLOW turtle sign before it
  const sx = b.x0 - 150, sy = pumpkinGY(st, sx) - cam.y;
  if (sx - cam.x > -60 && sx - cam.x < W + 60) {
    ctx.fillStyle = '#6b4630'; ctx.fillRect(sx - cam.x - 3, sy - 52, 6, 52);
    ctx.fillStyle = gold ? C.gold : '#ffd36e'; ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 3;
    ctx.save(); ctx.translate(sx - cam.x, sy - 64); ctx.rotate(Math.PI / 4); rr(-15, -15, 30, 30, 4); ctx.fill(); ctx.stroke(); ctx.restore();
    // a little turtle
    ctx.fillStyle = '#3f7a3c'; ctx.beginPath(); ctx.ellipse(sx - cam.x, sy - 63, 8, 5.5, 0, Math.PI, 0); ctx.fill();
    circle(sx - cam.x + 9, sy - 64, 3); ctx.fill(); ctx.fillRect(sx - cam.x - 7, sy - 63, 3, 4); ctx.fillRect(sx - cam.x + 4, sy - 63, 3, 4);
    text(gold === 3 ? 'HAY!' : gold ? 'GOLD' : 'SLOW', sx - cam.x, sy - 88, 13, '#ffe7a8', 'center', 'body');
  }
}
// the patch: vines, leaves and little pumpkins along the ground
function pumpkinDrawPatch(st) {
  const cam = st.cam;
  for (const v of st.c.patch) {
    const sx = v.x - cam.x;
    if (sx < -40 || sx > W + 40) continue;
    const y = pumpkinGY(st, v.x) - cam.y + 2;
    ctx.strokeStyle = '#4f8a44'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx - 22, y); ctx.quadraticCurveTo(sx - 6, y - 8 * v.s, sx + 10, y - 1); ctx.quadraticCurveTo(sx + 18, y + 2, sx + 24, y - 2); ctx.stroke();
    if (v.kind === 'curl') { ctx.beginPath(); ctx.arc(sx + 4, y - 9 * v.s, 4 * v.s, 0, Math.PI * 1.6); ctx.stroke(); }
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#5f9a4c';
    ctx.beginPath(); ctx.ellipse(sx - 8, y - 5 * v.s, 7 * v.s, 4 * v.s, -0.5, 0, Math.PI * 2); ctx.fill();
    if (v.kind === 'leaf') { ctx.beginPath(); ctx.ellipse(sx + 12, y - 6 * v.s, 8 * v.s, 5 * v.s, 0.4, 0, Math.PI * 2); ctx.fill(); }
    if (v.kind === 'pump') pumpkinMini(sx + 6, y - 1, 9 + (v.h % 5), v.h % 2 ? '#ff9a3d' : '#f07a24');
  }
}
// a small pumpkin sitting on the ground (y = its bottom)
function pumpkinMini(x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y - r * 0.8, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(160,60,10,0.6)'; ctx.lineWidth = 1.5;
  for (const k of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.ellipse(x + k * r, y - r * 0.8, r * 0.35, r * 0.78, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#5b7a2a'; ctx.fillRect(x - 1.5, y - r * 1.75, 3, r * 0.4);
}
// hay bales: the checkpoints, each with a little jack-o'-lantern that lights up when you pass
function pumpkinDrawBales(st) {
  const cam = st.cam, t = G.clock;
  st.c.bales.forEach((b, i) => {
    const sx = b.x - cam.x;
    if (sx < -60 || sx > W + 60) return;
    const y = pumpkinGY(st, b.x) - cam.y + 3, a = Math.atan(pumpkinGSlope(st, b.x));
    ctx.save(); ctx.translate(sx, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(20,10,30,0.25)'; ctx.beginPath(); ctx.ellipse(4, 0, 34, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9a63a'; rr(-26, -36, 52, 36, 7); ctx.fill();
    ctx.fillStyle = '#b9862a'; rr(8, -36, 18, 36, 7); ctx.fill();
    ctx.fillStyle = '#e8bd55'; rr(-26, -36, 52, 12, 7); ctx.fill();
    ctx.strokeStyle = '#8a5a1a'; ctx.lineWidth = 1.8; rr(-26, -36, 52, 36, 7); ctx.stroke();
    ctx.strokeStyle = '#a8761e'; ctx.lineWidth = 1.5;
    for (let k = -18; k <= 18; k += 6) { ctx.beginPath(); ctx.moveTo(k, -33); ctx.lineTo(k + 3, -4); ctx.stroke(); }
    ctx.strokeStyle = '#8a5a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -36); ctx.lineTo(-14, 0); ctx.moveTo(14, -36); ctx.lineTo(14, 0); ctx.stroke();
    // its jack-o'-lantern
    const lit = b.lit, fl = lit ? 0.75 + 0.25 * Math.sin(t * 9 + i) : 0, pop = lit && b.litT < 0.4 ? 1 + 0.4 * Math.sin(b.litT / 0.4 * Math.PI) : 1;
    ctx.save(); ctx.translate(0, -46); ctx.scale(pop, pop);
    if (lit) { ctx.fillStyle = 'rgba(255,190,90,' + (0.25 * fl) + ')'; circle(0, 0, 24); ctx.fill(); }
    ctx.fillStyle = lit ? '#ff9a3d' : '#b9783c'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 10.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = lit ? '#c4581a' : '#8a5428'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 5, 10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#5b7a2a'; ctx.fillRect(-1.5, -14, 3, 5);
    ctx.fillStyle = lit ? 'rgba(255,236,140,' + fl + ')' : '#6a3e1a';
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-5, -7); ctx.lineTo(-2, -2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(5, -7); ctx.lineTo(8, -2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7, 2); ctx.quadraticCurveTo(0, 9, 7, 2); ctx.lineTo(3, 3.5); ctx.lineTo(1.5, 1.5); ctx.lineTo(-1.5, 3.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  });
}
function pumpkinDrawRocks(st) {
  const cam = st.cam;
  for (const r of st.c.rocks) {
    const sx = r.x - cam.x;
    if (sx < -30 || sx > W + 30) continue;
    const y = pumpkinGY(st, r.x) - cam.y + 2;
    ctx.fillStyle = 'rgba(20,10,30,0.25)'; ctx.beginPath(); ctx.ellipse(sx + 3, y, 19, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a7390'; ctx.strokeStyle = '#4e4866'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(sx, y - 6, 15, 10, 0, Math.PI, 0); ctx.lineTo(sx + 15, y); ctx.lineTo(sx - 15, y); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#655e7e'; ctx.beginPath(); ctx.ellipse(sx + 7, y - 4, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#958eab'; ctx.beginPath(); ctx.ellipse(sx - 4, y - 10, 7, 4, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5f9a4c'; ctx.beginPath(); ctx.ellipse(sx + 7, y - 13, 4, 2.4, 0.4, 0, Math.PI * 2); ctx.fill();
  }
}
// scenery behind the track: signs, scarecrows, crows, the ghost, frogs, cattails, the willow, the swap gate, the wagon
function pumpkinDrawBack(st) {
  const cam = st.cam, c = st.c, t = G.clock;
  for (const s of c.signs) {
    const sx = s.x - cam.x;
    if (sx < -260 || sx > W + 260) continue;
    const y = pumpkinGY(st, s.x) - cam.y;
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.max(70, ctx.measureText(s.text).width + 22);
    ctx.fillStyle = '#6b4630'; ctx.fillRect(sx - 3, y - 58, 6, 58);
    ctx.fillStyle = '#c98b5a'; rr(sx - w / 2, y - 84, w, 28, 5); ctx.fill();
    ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 2; rr(sx - w / 2, y - 84, w, 28, 5); ctx.stroke();
    text(s.text, sx, y - 69.5, 13, '#3a2210', 'center', 'body');
  }
  for (const d of c.deco) {
    const sx = d.x - cam.x;
    if (sx < -160 || sx > W + 160) continue;
    const y = pumpkinGY(st, d.x) - cam.y;
    if (d.kind === 'scarecrow') pumpkinScarecrow(sx, y + 2, t, Math.abs(d.x - st.pk.x) < 240, false);
    else if (d.kind === 'crows') pumpkinCrows(st, d, sx, y);
    else if (d.kind === 'ghost') pumpkinGhost(sx, y, t, d);
    else if (d.kind === 'frog') pumpkinFrog(sx, y, t, d);
    else if (d.kind === 'cattails') pumpkinCattails(sx, y, t);
    else if (d.kind === 'willow') pumpkinWillow(sx, y, t);
    else if (d.kind === 'jacks') { for (let k = 0; k < 3; k++) pumpkinJack(sx - 30 + k * 30, pumpkinGY(st, d.x - 30 + k * 30) - cam.y + 2, 12 - (k % 2) * 3, t + k); }
  }
  pumpkinDrawGate(st, false);
  if (c.wagon && st.pk.state !== 'finish') pumpkinDrawWagon(st, true);
}
// a goofy scarecrow (gold when it is helping push)
function pumpkinScarecrow(x, y, t, wave, gold) {
  const sw = Math.sin(t * (wave ? 6 : 1.5)) * (wave ? 0.35 : 0.08);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = gold ? '#c9952a' : '#6b4630'; ctx.fillRect(-3, -96, 6, 96); ctx.fillRect(-34, -72, 68, 5);
  // shirt
  ctx.fillStyle = gold ? '#ffd75e' : '#5b8fc9'; ctx.beginPath(); ctx.moveTo(-18, -74); ctx.lineTo(18, -74); ctx.lineTo(14, -40); ctx.lineTo(-14, -40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = gold ? '#f5c242' : '#e86a5a'; ctx.fillRect(-8, -64, 8, 8);
  // arms with straw hands (one waves)
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 16, -71); ctx.rotate(s < 0 ? -sw : 0);
    ctx.fillStyle = gold ? '#ffd75e' : '#5b8fc9'; ctx.fillRect(s < 0 ? -22 : 0, -4, 22, 9);
    ctx.strokeStyle = '#e8c36a'; ctx.lineWidth = 2;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(s * 22, 0); ctx.lineTo(s * 30, k * 5); ctx.stroke(); }
    ctx.restore();
  }
  // head: a sack with button eyes and a stitched smile, a floppy hat
  ctx.fillStyle = '#e8d3a0'; circle(0, -86, 13); ctx.fill();
  ctx.fillStyle = '#3a2a40'; circle(-5, -88, 2.4); ctx.fill(); circle(5, -88, 2.4); ctx.fill();
  ctx.strokeStyle = '#3a2a40'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -84, 6, 0.3, Math.PI - 0.3); ctx.stroke();
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 2.6, -80); ctx.lineTo(k * 2.6, -77); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,120,120,0.5)'; circle(-8, -83, 2.5); ctx.fill(); circle(8, -83, 2.5); ctx.fill();
  ctx.fillStyle = gold ? '#e0a82a' : '#8a6a3a'; ctx.beginPath(); ctx.ellipse(0, -97, 22, 5, -0.08, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-11, -98); ctx.lineTo(-7, -114); ctx.lineTo(8, -113); ctx.lineTo(11, -98); ctx.fill();
  ctx.fillStyle = '#e86a5a'; ctx.fillRect(-10, -103, 21, 4);
  ctx.strokeStyle = '#e8c36a'; ctx.lineWidth = 2;
  for (const k of [-12, -6, 6, 12]) { ctx.beginPath(); ctx.moveTo(k * 0.8, -42); ctx.lineTo(k, -32); ctx.stroke(); }
  ctx.restore();
}
// crows on a fence: they flap off when the pumpkin rolls near
function pumpkinCrows(st, d, x, y) {
  ctx.fillStyle = '#6b4630'; ctx.fillRect(x - 40, y - 34, 80, 5); ctx.fillRect(x - 36, y - 40, 5, 40); ctx.fillRect(x + 31, y - 40, 5, 40); ctx.fillRect(x - 2, y - 40, 5, 40);
  for (let k = 0; k < 3; k++) {
    const u = d.seen ? Math.min(3, d.t * (1 + k * 0.3)) : 0, bx = x - 26 + k * 26 + u * 60 * (k - 0.6), by = y - 40 - u * 90 - (k % 2) * u * 30;
    if (by < -40) continue;
    const flap = d.seen ? Math.sin(G.clock * 22 + k) : 0;
    ctx.save(); ctx.translate(bx, by);
    ctx.fillStyle = '#2a2236';
    ctx.beginPath(); ctx.ellipse(0, -6, 8, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    circle(6, -12, 5); ctx.fill();
    if (d.seen) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(-6 + s * 4, -8 - 12 * flap * s - 6); ctx.lineTo(4, -6); ctx.fill(); } }
    else { ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-14, -2); ctx.lineTo(-6, -2); ctx.fill(); }
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(10, -13); ctx.lineTo(15, -11); ctx.lineTo(10, -10); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(7.5, -13.5, 1.8); ctx.fill(); ctx.fillStyle = C.ink; circle(8, -13.5, 0.9); ctx.fill();
    ctx.restore();
  }
}
// a cute sheet ghost peeking out from behind a tree, waving
function pumpkinGhost(x, y, t, d) {
  ctx.fillStyle = '#35244c'; ctx.fillRect(x - 9, y - 120, 18, 120);
  ctx.beginPath(); ctx.ellipse(x, y - 128, 44, 30, 0, 0, Math.PI * 2); ctx.fill();
  const peek = d.seen ? clamp(d.t / 0.4, 0, 1) : 0.35 + 0.1 * Math.sin(t * 2);
  const gx = x + 8 + peek * 30, gy = y - 54 + Math.sin(t * 2.4) * 5;
  ctx.fillStyle = 'rgba(240,236,255,0.95)';
  ctx.beginPath(); ctx.moveTo(gx - 16, gy + 22); ctx.lineTo(gx - 16, gy - 6); ctx.arc(gx, gy - 6, 16, Math.PI, 0); ctx.lineTo(gx + 16, gy + 22);
  for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(gx + 12 - k * 8, gy + 16 + (k % 2) * 10, gx + 8 - k * 8, gy + 22);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(gx - 5, gy - 7, 2.6, 3.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(gx + 6, gy - 7, 2.6, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,170,0.6)'; circle(gx - 9, gy, 2.6); ctx.fill(); circle(gx + 10, gy, 2.6); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(gx + 1, gy + 2, 3, d.seen ? 3.5 : 1.6, 0, 0, Math.PI * 2); ctx.fill();
  if (d.seen) {   // a waving arm
    ctx.fillStyle = 'rgba(240,236,255,0.95)'; ctx.save(); ctx.translate(gx + 15, gy + 2); ctx.rotate(-0.6 + Math.sin(t * 8) * 0.5); ctx.beginPath(); ctx.ellipse(6, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}
function pumpkinFrog(x, y, t, d) {
  const hop = d.seen ? Math.max(0, Math.sin(clamp(d.t * 3, 0, Math.PI))) * 30 : 0, fx = x + (d.seen ? Math.min(40, d.t * 40) : 0);
  ctx.save(); ctx.translate(fx, y - hop);
  ctx.fillStyle = '#5fb04a'; ctx.beginPath(); ctx.ellipse(0, -7, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  circle(-5, -14, 4); ctx.fill(); circle(5, -14, 4); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(-5, -15, 2.6); ctx.fill(); circle(5, -15, 2.6); ctx.fill();
  ctx.fillStyle = C.ink; circle(-5, -15, 1.3); ctx.fill(); circle(5, -15, 1.3); ctx.fill();
  ctx.strokeStyle = '#2f6a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -8, 5, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.fillStyle = '#4a9a3a'; ctx.beginPath(); ctx.ellipse(-10, -2, 6, 3, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(10, -2, 6, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (!d.seen && Math.sin(t * 1.3) > 0.9) text('ribbit', x, y - 32, 11, '#d8ffd0', 'center', 'body');
}
function pumpkinCattails(x, y, t) {
  for (let k = 0; k < 5; k++) {
    const cx = x - 16 + k * 8, sw = Math.sin(t * 1.6 + k) * 3, h = 40 + (k % 3) * 10;
    ctx.strokeStyle = '#4f8a44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y); ctx.quadraticCurveTo(cx, y - h / 2, cx + sw, y - h); ctx.stroke();
    ctx.fillStyle = '#7a4a2a'; rr(cx + sw - 3, y - h - 2, 6, 14, 3); ctx.fill();
  }
}
function pumpkinWillow(x, y, t) {
  ctx.fillStyle = '#35244c'; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x - 2, y - 60, x - 10, y - 110); ctx.lineTo(x + 8, y - 110); ctx.quadraticCurveTo(x + 4, y - 60, x + 10, y); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y - 122, 60, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4a3a6a'; ctx.lineWidth = 2;
  for (let k = 0; k < 10; k++) { const sx = x - 54 + k * 12, sw = Math.sin(t * 1.2 + k) * 4; ctx.beginPath(); ctx.moveTo(sx, y - 112); ctx.quadraticCurveTo(sx + sw, y - 80, sx + sw * 1.5, y - 56 - (k % 3) * 8); ctx.stroke(); }
  // an owl
  ctx.fillStyle = '#8a6a5a'; ctx.beginPath(); ctx.ellipse(x + 26, y - 124, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
  const bl = Math.sin(t * 0.9) > 0.95;
  ctx.fillStyle = '#ffe08a'; circle(x + 22, y - 127, 3.5); ctx.fill(); circle(x + 30, y - 127, 3.5); ctx.fill();
  if (!bl) { ctx.fillStyle = C.ink; circle(x + 22, y - 127, 1.6); ctx.fill(); circle(x + 30, y - 127, 1.6); ctx.fill(); }
  ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(x + 24, y - 123); ctx.lineTo(x + 28, y - 123); ctx.lineTo(x + 26, y - 120); ctx.fill();
}
// a carved jack-o'-lantern on the ground (y = its bottom), glowing
function pumpkinJack(x, y, r, t) {
  const fl = 0.75 + 0.25 * Math.sin(t * 8);
  ctx.fillStyle = 'rgba(255,190,90,' + (0.22 * fl) + ')'; circle(x, y - r, r * 2.1); ctx.fill();
  ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.85, r * 1.15, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5b7a2a'; ctx.fillRect(x - 1.5, y - r * 1.85, 3, r * 0.4);
  ctx.fillStyle = 'rgba(255,236,140,' + fl + ')';
  ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r); ctx.lineTo(x - r * 0.35, y - r * 1.35); ctx.lineTo(x - r * 0.1, y - r); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + r * 0.1, y - r); ctx.lineTo(x + r * 0.35, y - r * 1.35); ctx.lineTo(x + r * 0.6, y - r); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.65); ctx.quadraticCurveTo(x, y - r * 0.05, x + r * 0.6, y - r * 0.65); ctx.closePath(); ctx.fill();
}
// the swap gate: two corn-stalk posts and a banner (the front post is drawn over the players)
function pumpkinDrawGate(st, front) {
  const g = st.c.swap;
  if (!g) return;
  const cam = st.cam, sx = g.x - cam.x;
  if (sx < -200 || sx > W + 200) return;
  const y = pumpkinGY(st, g.x) - cam.y;
  const post = (px, py) => {
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(px - 5, py - 150, 10, 150);
    ctx.fillStyle = '#8fbf5a';
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(px + (k % 2 ? 10 : -10), py - 30 - k * 20, 12, 3.5, k % 2 ? 0.6 : -0.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffd36e'; ctx.beginPath(); ctx.ellipse(px + 7, py - 70, 4, 9, 0.3, 0, Math.PI * 2); ctx.fill();
  };
  if (!front) {
    post(sx - 90, pumpkinGY(st, g.x - 90) - cam.y);
    const by = y - 160;
    ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx - 90, by + 8); ctx.quadraticCurveTo(sx, by + 20, sx + 90, by + 8); ctx.stroke();
    ctx.fillStyle = '#7a3fa0'; rr(sx - 82, by - 14, 164, 34, 8); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(sx - 82, by - 14, 164, 34, 8); ctx.stroke();
    text('SWAP JOBS!', sx, by + 3.5, 20, '#ffd36e', 'center');
    const cols = ['#ff9a3d', '#b48cff', '#8fe3b0', C.gold];
    for (let k = 0; k < 8; k++) {
      const u = (k + 0.5) / 8, px = pumpkinLerp(sx - 88, sx + 88, u), py = by + 24 + 14 * 4 * u * (1 - u);
      ctx.fillStyle = cols[k % 4]; ctx.beginPath(); ctx.moveTo(px - 7, py); ctx.lineTo(px + 7, py); ctx.lineTo(px, py + 13); ctx.closePath(); ctx.fill();
    }
  } else post(sx + 90, pumpkinGY(st, g.x + 90) - cam.y);
}
// the hayride wagon at the top of Hayride Hill: hay, lanterns, a little tractor with a scarecrow driver
function pumpkinDrawWagon(st, back) {
  const w = st.c.wagon;
  if (!w) return;
  const cam = st.cam, dx = st.fin ? st.fin.driveX || 0 : 0, bx = w.bed0 - cam.x + dx, by = pumpkinGY(st, w.bed0) - cam.y, bw = w.x1 - w.bed0;
  if (bx > W + 300 || bx + bw < -300) return;
  const t = G.clock;
  if (back) {
    // the ramp (it stays behind when the wagon drives off)
    const rx = w.ramp0 - cam.x, ry = pumpkinGY(st, w.ramp0) - cam.y;
    ctx.fillStyle = '#b87b4c'; ctx.strokeStyle = '#7a4c2c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(w.bed0 - cam.x, by); ctx.lineTo(w.bed0 - cam.x, by + 8); ctx.lineTo(rx, ry + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    // a banner and a string of lanterns over the wagon
    ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 3;
    ctx.fillStyle = '#6b4630'; ctx.fillRect(bx - 4, by - 140, 6, 140); ctx.fillRect(bx + bw - 2, by - 140, 6, 140);
    ctx.beginPath(); ctx.moveTo(bx, by - 136); ctx.quadraticCurveTo(bx + bw / 2, by - 110, bx + bw, by - 136); ctx.stroke();
    for (let k = 0; k < 7; k++) { const u = (k + 0.5) / 7, px = pumpkinLerp(bx, bx + bw, u), py = by - 136 + 26 * 4 * u * (1 - u) + 12; pumpkinJack(px, py + 10, 7, t + k); }
    text('HAYRIDE', bx + bw / 2, by - 154, 22, '#ffd36e', 'center');
    // the bed and hay
    ctx.fillStyle = '#d9a63a'; rr(bx + 4, by - 26, 46, 26, 6); ctx.fill(); rr(bx + bw - 50, by - 26, 46, 26, 6); ctx.fill();
    ctx.fillStyle = '#e8bd55'; rr(bx + 4, by - 26, 46, 8, 6); ctx.fill(); rr(bx + bw - 50, by - 26, 46, 8, 6); ctx.fill();
    return;
  }
  // the front of the wagon (over the pumpkin's bottom): its side boards and wheels, and the tractor
  ctx.fillStyle = '#b8423a'; rr(bx - 6, by, bw + 12, 26, 4); ctx.fill();
  ctx.fillStyle = '#d65a4a'; ctx.fillRect(bx - 6, by + 3, bw + 12, 5);
  ctx.strokeStyle = '#8a2a24'; ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(bx - 6 + k * (bw + 12) / 6, by + 8); ctx.lineTo(bx - 6 + k * (bw + 12) / 6, by + 26); ctx.stroke(); }
  const spin = dx / 18;
  for (const wx of [bx + 34, bx + bw - 34]) {
    ctx.fillStyle = '#3a2a40'; circle(wx, by + 34, 16); ctx.fill();
    ctx.fillStyle = '#e8c36a'; circle(wx, by + 34, 6); ctx.fill();
    ctx.strokeStyle = '#e8c36a'; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const a = spin + k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 6, by + 34 + Math.sin(a) * 6); ctx.lineTo(wx + Math.cos(a) * 14, by + 34 + Math.sin(a) * 14); ctx.stroke(); }
  }
  // the tractor
  const tx = bx + bw + 30, ty = by + 50;
  ctx.strokeStyle = '#3a2a40'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx + bw + 6, by + 16); ctx.lineTo(tx, by + 16); ctx.stroke();
  ctx.fillStyle = '#ff8a1f'; rr(tx, ty - 58, 70, 32, 6); ctx.fill(); rr(tx + 40, ty - 82, 30, 28, 4); ctx.fill();
  ctx.fillStyle = '#ffe9b0'; rr(tx + 46, ty - 78, 18, 12, 3); ctx.fill();
  ctx.fillStyle = '#3a2a40'; ctx.fillRect(tx + 12, ty - 76, 5, 20);
  if (st.fin && st.fin.toot) { for (let i = 0; i < 3; i++) { const u = (t * 1.5 + i / 3) % 1; ctx.globalAlpha = 1 - u; ctx.fillStyle = '#cfc6e6'; circle(tx + 14 + u * 10, ty - 80 - u * 40, 4 + u * 6); ctx.fill(); } ctx.globalAlpha = 1; }
  ctx.fillStyle = '#ffe48a'; circle(tx + 72, ty - 44, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,228,138,0.3)'; circle(tx + 76, ty - 44, 12); ctx.fill();
  ctx.fillStyle = '#3a2a40'; circle(tx + 14, ty - 18, 22); ctx.fill(); circle(tx + 58, ty - 12, 13); ctx.fill();
  ctx.fillStyle = '#e8c36a'; circle(tx + 14, ty - 18, 8); ctx.fill(); circle(tx + 58, ty - 12, 5); ctx.fill();
  // the driver: a little scarecrow in the cab, waving
  ctx.save(); ctx.translate(tx + 54, ty - 84); ctx.scale(0.55, 0.55);
  ctx.fillStyle = '#e8d3a0'; circle(0, 0, 13); ctx.fill();
  ctx.fillStyle = '#3a2a40'; circle(-5, -2, 2.4); ctx.fill(); circle(5, -2, 2.4); ctx.fill();
  ctx.strokeStyle = '#3a2a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 2, 6, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.ellipse(0, -11, 20, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-10, -26, 20, 15);
  ctx.restore();
}
// gust warning: leaves streaming in, then the blow
function pumpkinDrawGusts(st) {
  const cam = st.cam, pk = st.pk;
  for (const g of st.c.gusts) {
    if (g.state !== 'warn' && g.state !== 'blow') continue;
    const n = g.state === 'blow' ? 14 : 5, t = G.clock;
    for (let i = 0; i < n; i++) {
      const u = ((t * (g.state === 'blow' ? 1.6 : 0.8) + i / n) % 1), x = g.dir > 0 ? u * W : W - u * W, y = pk.y - cam.y - 120 + ((i * 53) % 160);
      ctx.globalAlpha = Math.sin(u * Math.PI) * (g.state === 'blow' ? 0.9 : 0.6);
      if (i % 2) { ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - g.dir * 40, y); ctx.stroke(); }
      else { ctx.fillStyle = i % 4 ? '#ff9a3d' : '#d9a63a'; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6 + i); ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }
}
// the gold helper scarecrow behind the pumpkin on a climb it helps with
function pumpkinDrawHelper(st) {
  const pk = st.pk, cam = st.cam;
  if (pk.state !== 'roll') return;
  const up = st.c.ups.find(u => u.help && pk.x > u.x0 - 60 && pk.x < u.x1 + 20);
  if (!up) return;
  const hx = pk.x - PUMPKIN.D - 40, hy = pumpkinGY(st, hx);
  ctx.save(); ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(255,197,61,0.25)'; circle(hx - cam.x, hy - cam.y - 60, 46); ctx.fill();
  ctx.translate(hx - cam.x, hy - cam.y); ctx.rotate(0.25); pumpkinScarecrow(0, 0, G.clock, false, true);
  ctx.restore();
}
// one player drawn by the engine's drawPlayer (a copy at the origin)
function pumpkinDrawBody(p, rot, sx, sy) {
  ctx.save(); ctx.rotate(rot || 0);
  drawPlayer(Object.assign({}, p, { alive: true, x: -PW / 2, y: -PH, sx: p.sx * (sx || 1), sy: p.sy * (sy || 1), vy: 0 }));
  ctx.restore();
}
function pumpkinDrawPusher(st) {
  const pk = st.pk, pu = st.pu, p = G.players[st.pusher], cam = st.cam;
  if (pk.state === 'swap' || pk.state === 'finish') { ctx.save(); ctx.translate(p.x + PW / 2, p.y + PH); pumpkinDrawBody(p, 0); ctx.restore(); return; }
  const x = pu.x - cam.x, y = pu.y - cam.y;
  ctx.save(); ctx.translate(x, y);
  if (pu.frog) {
    const u = clamp(pu.frog.t / PUMPKIN.frogT, 0, 1);
    ctx.translate(0, -PH / 2); ctx.rotate((pu.frog.to > 0 ? 1 : -1) * Math.PI * 2 * pumpkinSmooth(u)); ctx.translate(0, PH / 2);
    pumpkinDrawBody(p, 0);
  } else {
    const lean = pu.actVis * 0.32 * -pu.side * -1;   // lean into the pumpkin
    const bob = pu.act ? Math.abs(Math.sin(pu.step * 1.3)) * 2 : 0;
    ctx.translate(0, -bob);
    pumpkinDrawBody(p, pu.side < 0 ? pu.actVis * 0.32 : -pu.actVis * 0.32);
    // arms out against the pumpkin when pushing / holding
    if (pu.actVis > 0.3) {
      ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      const s = -pu.side;
      ctx.beginPath(); ctx.moveTo(s * 6, -16); ctx.lineTo(s * 16, -20 + Math.sin(pu.step) * 1.5); ctx.moveTo(s * 6, -10); ctx.lineTo(s * 16, -12 - Math.sin(pu.step) * 1.5); ctx.stroke();
      ctx.lineCap = 'butt';
      void lean;
    }
  }
  ctx.restore();
}
function pumpkinDrawRider(st) {
  const pk = st.pk, rd = st.rd, p = G.players[st.rider];
  if (pk.state === 'swap' || pk.state === 'finish' || ((pk.state === 'splash' || pk.state === 'tumble') && rd.fly) || pumpkinBoarding(st)) {
    ctx.save(); ctx.translate(p.x + PW / 2, p.y + PH);
    if (rd.fly && !rd.fly.landed) ctx.rotate(rd.fly.spin * rd.fly.t * 9);
    pumpkinDrawBody(p, 0, rd.fly && rd.fly.landed ? 1.2 : 1, rd.fly && rd.fly.landed ? 0.8 : 1);
    ctx.restore();
    return;
  }
  const f = pumpkinRiderFeet(st), cam = st.cam;
  const wob = rd.wob > 0 ? Math.sin(rd.wob * 40) * 0.15 : 0, danger = Math.abs(rd.phi) / (pumpkinLim(st));
  ctx.save(); ctx.translate(f.x - cam.x, f.y - cam.y);
  // arms flail when wobbly
  if (danger > 0.65 && rd.hug < 0.5) {
    ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    const a = Math.sin(G.clock * 22) * 0.6;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 8, -18); ctx.lineTo(s * 20, -26 + s * a * 8); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  const rot = rd.phi * 0.55 + rd.lean * 0.22 + wob;
  pumpkinDrawBody(p, rot, 1 + rd.hug * 0.15, 1 - rd.hug * 0.35);
  ctx.restore();
}
function pumpkinDrawPumpkin(st) {
  const P = PUMPKIN, pk = st.pk, cam = st.cam, R = P.R, t = G.clock;
  const x = pk.x - cam.x, y = pk.y - cam.y + (pk.bob > 0 ? -Math.sin(pk.bob / 0.28 * Math.PI) * 7 : 0);
  if (x < -120 || x > W + 120) return;
  ctx.save(); ctx.translate(x, y);
  if (pk.appear > 0) { const u = 1 - pk.appear / 0.5, s = 0.3 + 0.7 * u + 0.15 * Math.sin(u * Math.PI); ctx.scale(s, s); }
  // shadow
  if (pk.state !== 'splash') { ctx.fillStyle = 'rgba(20,10,30,0.3)'; ctx.beginPath(); ctx.ellipse(0, R - 1, R * 0.85, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  const fin = st.fin, carved = fin && fin.carved;
  if (carved) { const fl = 0.8 + 0.2 * Math.sin(t * 9); ctx.fillStyle = 'rgba(255,200,90,' + (0.28 * fl) + ')'; circle(0, 0, R * 1.9); ctx.fill(); }
  ctx.rotate(pk.ang);
  // body: lobes seen from the side, around the stem axis
  ctx.fillStyle = '#f07a1e'; circle(0, 0, R); ctx.fill();
  ctx.fillStyle = '#ff9233'; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.72, R * 0.98, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffa547'; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.36, R * 0.96, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c4581a'; ctx.lineWidth = 2.5;
  for (const k of [0.36, 0.72]) { ctx.beginPath(); ctx.ellipse(0, 0, R * k, R * 0.98, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = '#a8460f'; ctx.lineWidth = 3; circle(0, 0, R - 1); ctx.stroke();
  // a shine
  ctx.fillStyle = 'rgba(255,230,170,0.45)'; ctx.beginPath(); ctx.ellipse(-R * 0.5, -R * 0.35, R * 0.12, R * 0.3, 0.4, 0, Math.PI * 2); ctx.fill();
  // the stem and a curly vine
  ctx.fillStyle = '#6b7a2a'; ctx.beginPath(); ctx.moveTo(-6, -R + 4); ctx.lineTo(-4, -R - 12); ctx.quadraticCurveTo(2, -R - 18, 8, -R - 14); ctx.lineTo(6, -R + 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#5f9a4c'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(6, -R - 8); ctx.quadraticCurveTo(18, -R - 14, 16, -R - 4); ctx.arc(12, -R - 4, 4, 0, Math.PI * 1.5); ctx.stroke();
  ctx.fillStyle = '#5f9a4c'; ctx.beginPath(); ctx.ellipse(-12, -R - 6, 9, 4.5, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (fin && fin.t > 1.0) {
    // the carved face, always facing you: triangle eyes, a nose and a big goofy grin with one tooth
    ctx.save(); ctx.translate(x, y);
    const u = clamp((fin.t - 1.0) / 0.55, 0, 1), fl = 0.8 + 0.2 * Math.sin(t * 9);
    if (!carved) { for (let i = 0; i < 4; i++) { ctx.fillStyle = '#ffffff'; pumpkinStar(Math.cos(t * 20 + i * 1.6) * R * 0.6 * u, Math.sin(t * 17 + i) * R * 0.4, 7, 3, t * 5); ctx.fill(); } }
    else {
      ctx.fillStyle = '#5a2208';
      const face = () => {
        ctx.beginPath(); ctx.moveTo(-26, -6); ctx.lineTo(-15, -24); ctx.lineTo(-5, -6); ctx.closePath();
        ctx.moveTo(5, -6); ctx.lineTo(15, -24); ctx.lineTo(26, -6); ctx.closePath();
        ctx.moveTo(-4, 2); ctx.lineTo(0, -5); ctx.lineTo(4, 2); ctx.closePath();
        ctx.moveTo(-30, 8); ctx.quadraticCurveTo(0, 44, 30, 8); ctx.quadraticCurveTo(14, 18, 6, 16); ctx.lineTo(6, 24); ctx.lineTo(-2, 24); ctx.lineTo(-2, 17); ctx.quadraticCurveTo(-16, 18, -30, 8); ctx.closePath();
      };
      face(); ctx.fill();
      ctx.save(); ctx.translate(0, 2); ctx.scale(0.9, 0.88); ctx.fillStyle = 'rgba(255,226,120,' + fl + ')'; face(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  // the balance arc over the rider: where the rider stands, green middle, gold lean zones, red edges
  if (pk.state === 'roll' && G.introT <= 0) pumpkinDrawArc(st, x, y);
}
function pumpkinDrawArc(st, x, y) {
  const P = PUMPKIN, rd = st.rd, lim = pumpkinLim(st), r = P.R + 6;
  const seg = (a0, a1, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2 + a0, -Math.PI / 2 + a1); ctx.stroke(); };
  ctx.globalAlpha = 0.85;
  seg(-lim, -lim * P.red, '#ff6b6b', 5); seg(lim * P.red, lim, '#ff6b6b', 5);
  seg(-lim * P.red, -P.leanFull, 'rgba(255,197,61,0.9)', 5); seg(P.leanFull, lim * P.red, 'rgba(255,197,61,0.9)', 5);
  seg(-P.leanFull, P.leanFull, 'rgba(143,227,176,0.85)', 5);
  ctx.globalAlpha = 1;
  // the needed lean glows
  const nd = pumpkinNeeds(st);
  if (nd.rider === 'fwd' || nd.rider === 'back') {
    const s = nd.rider === 'fwd' ? 1 : -1;
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(G.clock * 7));
    seg(s > 0 ? P.leanFull : -lim * P.red, s > 0 ? lim * P.red : -P.leanFull, C.gold, 9);
    ctx.globalAlpha = 1;
  }
  // the rider's marker
  const a = -Math.PI / 2 + clamp(rd.phi, -lim, lim);
  ctx.fillStyle = PCOL[st.rider]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  circle(x + Math.cos(a) * r, y + Math.sin(a) * r, 5.5); ctx.fill(); ctx.stroke();
}

/* ---------- HUD: the clock, each job's panel on its player's side, prompts and hints over the heads ---------- */
function pumpkinHud(st) {
  const P = PUMPKIN, pk = st.pk, big = hudBig(), ps = G.players, play = G.mode === 'play' || G.mode === 'paused';
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = String(st.stats.splashes + st.stats.tumbles);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    // a little splash drop: the fails so far
    const ix = x0 + 15 + tw + gap + icon / 2;
    ctx.fillStyle = '#9fe0ff'; ctx.beginPath(); ctx.moveTo(ix, cy - fs * 0.55); ctx.quadraticCurveTo(ix + fs * 0.45, cy, ix + fs * 0.3, cy + fs * 0.3); ctx.arc(ix, cy + fs * 0.18, fs * 0.32, 0.4, Math.PI - 0.4); ctx.quadraticCurveTo(ix - fs * 0.45, cy, ix, cy - fs * 0.55); ctx.fill();
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#d9c2ff', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const nd = pumpkinNeeds(st), z = big ? 1.4 : 1, t = G.clock;
  // the job panels, bottom corners: Pip's on the left, Bo's on the right
  for (const id of [0, 1]) {
    const rider = id === st.rider, pw = Math.round((rider ? 250 : 262) * z), ph = Math.round(56 * z), py = H - ph - 10;
    const px = id === 0 ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const cpuSeat = pumpkinQuiet(id);
    text(NAMES[id] + (rider ? ' rides' : ' pushes') + (cpuSeat ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 15 * z, PCOL[id], 'left');
    if (rider) {
      if (!cpuSeat) text(pumpkinKey(id, 'lr') + ' balance · ' + pumpkinKey(id, 'down') + (st.rd.tired ? ' hug: resting' : ' hug'), px + pw - 12 * z, py + 15 * z, 11 * z, st.rd.tired ? '#ff9a9a' : '#d9d3ef', 'right', 'body');
      // the balance bar: back ... forward
      const lim = pumpkinLim(st), bx = px + 12 * z, bw = pw - 24 * z, by = py + 30 * z, bh = 16 * z;
      const X = a => bx + bw * (0.5 + 0.5 * clamp(a / lim, -1, 1));
      const zones = [[-lim, -lim * P.red, '#ff6b6b', '', null], [-lim * P.red, -P.leanFull, '#ffc53d', 'BRAKE', 'back'], [-P.leanFull, P.leanFull, '#8fe3b0', 'OK', 'center'], [P.leanFull, lim * P.red, '#ffc53d', 'LEAN', 'fwd'], [lim * P.red, lim, '#ff6b6b', '', null]];
      for (const [a, b, col, , key] of zones) {
        const want = key && nd.rider === key && key !== 'center';
        ctx.fillStyle = col; ctx.globalAlpha = want ? 1 : 0.55; rr(X(a) + 1, by, X(b) - X(a) - 2, bh, bh / 2); ctx.fill(); ctx.globalAlpha = 1;
        if (want) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 + 1.5 * Math.abs(Math.sin(t * 8)); rr(X(a) - 1, by - 2, X(b) - X(a) + 2, bh + 4, bh / 2 + 2); ctx.stroke(); }
      }
      const mx = X(st.rd.phi);
      ctx.fillStyle = PCOL[id]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, by + bh + 1); ctx.lineTo(mx - 6 * z, by + bh + 8 * z); ctx.lineTo(mx + 6 * z, by + bh + 8 * z); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillRect(mx - 1.5, by - 2, 3, bh + 4);
      // (the labels go over the marker's line, so OK stays readable when it sits right in the middle)
      for (const [a, b, , lab] of zones) if (lab) text(lab, (X(a) + X(b)) / 2, by + bh / 2 + 0.5, 10 * z, '#3a2a40', 'center', 'body');
    } else {
      const chips = [['right', 'PUSH', nd.pusher === 'push' && (nd.onUp || Math.abs(pk.v) < 40)], ['jump', 'LEAPFROG', nd.pusher === 'front' || nd.pusher === 'behind'], ['left', 'HOLD', nd.pusher === 'hold']];
      // each chip as wide as its words need (LEAPFROG is the long one)
      const kw = chips.map(([k, lab]) => { const kk = cpuSeat ? '' : pumpkinKey(id, k); ctx.font = '700 ' + (lab.length > 6 ? 11 : 12.5) * z + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; return ctx.measureText((kk ? kk + ' ' : '') + lab).width + 16 * z; });
      const room = pw - 24 * z - 16 * z, sum = kw.reduce((a, b) => a + b, 0), cws = kw.map(v => v + (room - sum) / 3);
      chips.forEach(([k, lab, on], i) => {
        const cw = cws[i], cx = px + 12 * z + cws.slice(0, i).reduce((a, b) => a + b, 0) + i * 8 * z, cy = py + 26 * z, chh = 24 * z;
        const doing = (k === 'right' && st.pu.act > 0) || (k === 'left' && st.pu.act < 0) || (k === 'jump' && st.pu.frog);
        ctx.fillStyle = doing ? '#8fe3b0' : on ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : 'rgba(255,255,255,0.12)';
        rr(cx, cy, cw, chh, chh / 2); ctx.fill();
        const kk = cpuSeat ? '' : pumpkinKey(id, k), word = (kk ? kk + ' ' : '') + lab;
        let fs = (lab.length > 6 ? 11 : 12.5) * z;
        ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
        while (fs > 8 && ctx.measureText(word).width > cw - 14 * z) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
        text(word, cx + cw / 2, cy + chh / 2 + 0.5, fs, on || doing ? C.ink : '#d9d3ef', 'center', 'body');
      });
    }
  }
  // the speed gauge over a bridge ahead: SLOW is safe
  // (it sits at the top, under the pills, so it never covers the bridge it warns about)
  let gaugeBot = 0;
  if (nd.bridge && pk.state === 'roll' && (nd.onDown || nd.downD < 420)) {
    const b = nd.bridge, safe = pumpkinSafe(b), gw = 150 * z, gh = 14 * z, gx = W / 2 - gw / 2, gy = (big ? 52 : 44) + 18 * z;
    gaugeBot = gy + gh + 6 * z + 6;
    const X = v => gx + gw * clamp(v / 280, 0, 1);
    ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(gx - 8 * z, gy - 18 * z, gw + 16 * z, gh + 24 * z, 10); ctx.fill();
    text(b.gold === 3 ? 'Hay bridge: any speed!' : b.kind === 'pond' ? 'Bridge: go SLOW' : 'Mud ditch: go SLOW', W / 2, gy - 9 * z, 11 * z, b.gold ? C.gold : '#d9d3ef', 'center', 'body');
    ctx.fillStyle = b.gold ? C.gold : '#8fe3b0'; rr(gx, gy, X(safe) - gx, gh, gh / 2); ctx.fill();
    ctx.fillStyle = '#ff6b6b'; rr(X(safe), gy, gx + gw - X(safe), gh, gh / 2); ctx.fill();
    const mx = X(Math.abs(pk.v));
    ctx.fillStyle = '#ffffff'; ctx.fillRect(mx - 2, gy - 3, 4, gh + 6);
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the room pill
  if (st.msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = Math.max(big ? 96 : 80, gaugeBot);
      while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || pk.state !== 'roll') return;
  // prompts over the heads: the rider's sits right above the rider, the pusher's opens away from the pumpkin (so the
  // two never cover each other or the balance arc). A hint bubble replaces that player's prompt while it shows.
  const Rp = ps[st.rider], Up = ps[st.pusher], fs = 14 * z;
  const yMax = H - Math.round(56 * z) - 18, uSide = st.pu.side > 0 ? 'r' : 'l';
  const place = (p, w, h, at, lift) => {
    const hx = p.x + PW / 2, rider = p.id === st.rider;
    const y = clamp(p.y - (rider ? 26 : 12) * z - lift - h, Math.max(46, gaugeBot), yMax - lift - h);
    const x = at === 'c' ? hx - w / 2 : at === 'l' ? hx + 6 * z - w : hx - 6 * z;
    return { x: clamp(x, 4, W - w - 4), y };
  };
  const say = (p, str, col, lift, pulse) => {
    if (pumpkinQuiet(p.id) || st.hints[p.id]) return 0;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, at = p.id === st.rider ? 'c' : uSide, o = place(p, w, h, at, lift);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
    return h + 6;
  };
  const bubble = (p, str) => {
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 22 * z, h = fs + 14 * z, o = place(p, w, h, p.id === st.rider ? 'c' : uSide, 0);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(str, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  const R = Rp.id, U = Up.id, lim = pumpkinLim(st), phi = st.rd.phi;
  // the rider
  if (Math.abs(phi) > lim * P.red) say(Rp, phi > 0 ? pumpkinKey(R, 'left') + ' Wobbly!' : 'Wobbly! ' + pumpkinKey(R, 'right'), '#ff8a8a', 0, true);
  else if (nd.gust && nd.gust.state === 'warn') say(Rp, nd.gust.dir > 0 ? pumpkinKey(R, 'left') + ' Gust coming!' : 'Gust coming! ' + pumpkinKey(R, 'right'), '#d8f0ff', 0, true);
  else if (nd.rider === 'fwd' && phi < P.leanFull) say(Rp, (nd.onUp ? 'Lean forward! ' : 'Roll it on! ') + pumpkinKey(R, 'right'), nd.onUp ? C.gold : '#ffe7a8', 0, nd.onUp);
  else if (nd.rider === 'back' && phi > -P.leanFull && (nd.onDown || Math.abs(pk.v) > 60)) say(Rp, pumpkinKey(R, 'left') + ' Lean back!', C.gold, 0, true);
  else if (nd.rider === 'nudge' && phi < P.leanDead) say(Rp, 'Tip it over: a little ' + pumpkinKey(R, 'right'), '#ffe7a8', 0, false);
  else if (nd.rider === 'hug' && st.rd.hug < 0.5 && !st.rd.tired) say(Rp, 'Rock! Hug ' + pumpkinKey(R, 'down'), '#ffe7a8', 0, true);
  else if (nd.rider === 'center' && Math.abs(phi) > P.leanFull) say(Rp, phi > 0 ? pumpkinKey(R, 'left') + ' Walk back to the top' : 'Walk back to the top ' + pumpkinKey(R, 'right'), '#ffe7a8', 0, false);
  // the pusher
  if (!st.pu.frog) {
    if ((st.pu.rockT || 0) > 0.25) say(Up, 'Hop the rock! ' + pumpkinKey(U, 'jump'), '#ffe7a8', 0, true);
    else if (nd.pusher === 'front') say(Up, 'Leapfrog in front! ' + pumpkinKey(U, 'jump'), C.gold, 0, true);
    else if (nd.pusher === 'hold' && st.pu.act >= 0 && (nd.onDown || pk.v > 20)) say(Up, pumpkinKey(U, 'left') + ' Hold it back!', C.gold, 0, true);
    else if (nd.pusher === 'behind' && Math.abs(pk.v) < 40) say(Up, 'Leapfrog back! ' + pumpkinKey(U, 'jump'), '#ffe7a8', 0, false);
    else if (nd.pusher === 'push' && st.pu.act <= 0 && (nd.onUp || Math.abs(pk.v) < 20)) say(Up, 'Push! ' + pumpkinKey(U, 'right'), '#ffe7a8', 0, nd.onUp);
  }
  for (const p of ps) if (st.hints[p.id]) bubble(p, st.hints[p.id].text);
}

/* ---------- sounds ---------- */
Sfx.extra.pumpkinPush = function (p) { this.tone(140 * p, 0.12, 'triangle', 0.05, 110 * p); };
Sfx.extra.pumpkinRoll = function () { this.tone(90, 0.07, 'triangle', 0.035, 70); };
Sfx.extra.pumpkinFrog = function (p) { this.tone(300 * p, 0.22, 'sine', 0.07, 900 * p); this.tone(600 * p, 0.1, 'triangle', 0.03, 1200 * p, 0.12); };
Sfx.extra.pumpkinLand = function () { this.tone(150, 0.07, 'triangle', 0.05, 90); };
Sfx.extra.pumpkinHop = function (p) { this.tone(420 * p, 0.1, 'sine', 0.05, 700 * p); };
Sfx.extra.pumpkinBump = function () { this.tone(220, 0.06, 'square', 0.035, 140); this.tone(110, 0.12, 'triangle', 0.06, 70, 0.02); };
Sfx.extra.pumpkinBale = function () { this.tone(180, 0.12, 'triangle', 0.06, 120); this.tone(900, 0.04, 'sawtooth', 0.01, 400); };
Sfx.extra.pumpkinCheck = function () { this.tone(200, 0.18, 'sine', 0.05, 520); [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, 0.08 + i * 0.06)); };
Sfx.extra.pumpkinSploosh = function () { this.tone(1200, 0.35, 'sawtooth', 0.02, 160); this.tone(260, 0.45, 'sine', 0.08, 60); this.tone(700, 0.2, 'sine', 0.04, 1400, 0.25); };
Sfx.extra.pumpkinSquelch = function () { this.tone(180, 0.3, 'sawtooth', 0.04, 60); this.tone(90, 0.35, 'square', 0.03, 50, 0.05); this.tone(500, 0.1, 'sine', 0.03, 260, 0.3); };
Sfx.extra.pumpkinWhoa = function () { this.tone(900, 0.5, 'sine', 0.06, 260); };
Sfx.extra.pumpkinFlop = function () { this.tone(160, 0.12, 'triangle', 0.06, 80); this.tone(520, 0.08, 'sine', 0.03, 380, 0.08); };
Sfx.extra.pumpkinPoof = function () { this.tone(240, 0.3, 'sine', 0.05, 900); this.tone(1200, 0.2, 'triangle', 0.02, 600, 0.05); };
Sfx.extra.pumpkinCreak = function () { this.tone(320 + Math.random() * 80, 0.12, 'sawtooth', 0.012, 240); };
Sfx.extra.pumpkinCaw = function () { this.tone(700, 0.08, 'sawtooth', 0.025, 520); this.tone(680, 0.1, 'sawtooth', 0.02, 480, 0.12); };
Sfx.extra.pumpkinBoo = function () { this.tone(330, 0.4, 'sine', 0.05, 520); [988, 880, 988].forEach((f, i) => this.tone(f, 0.07, 'triangle', 0.025, null, 0.42 + i * 0.08)); };
Sfx.extra.pumpkinRibbit = function () { this.tone(260, 0.07, 'square', 0.025, 200); this.tone(260, 0.07, 'square', 0.025, 190, 0.1); };
Sfx.extra.pumpkinGustWarn = function () { this.tone(500, 0.3, 'sine', 0.02, 800); };
Sfx.extra.pumpkinGust = function () { this.tone(300, 0.6, 'sawtooth', 0.018, 900); this.tone(600, 0.5, 'sine', 0.025, 300, 0.1); };
Sfx.extra.pumpkinSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.pumpkinHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.pumpkinChop = function () { [0, 0.14, 0.28].forEach(d => { this.tone(1400, 0.04, 'square', 0.035, 500, d); this.tone(220, 0.06, 'triangle', 0.05, 120, d + 0.01); }); };
Sfx.extra.pumpkinCarve = function () { [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.08)); this.tone(1568, 0.4, 'sine', 0.04, null, 0.45); };
Sfx.extra.pumpkinToot = function () { this.tone(330, 0.18, 'square', 0.035); this.tone(330, 0.3, 'square', 0.035, null, 0.24); };
/* ===== end of MODES.pumpkin ===== */
