/* Pip & Bo - Level 21-4 Paper Plane Race (versus, World 21 Sky Kingdom). */
'use strict';

/* ===== 21-4 Paper Plane Race (mode 'paperplane', versus, best of 5, scrolls sideways) =====
   Gavyn's pick: "Each player throws and then flies their own paper plane. Glide physics: dive for speed, climb for
   height, warm air lifts you, rings give a burst, birds and kites are in the way. First through the finish cloud arch
   wins the round."
   def.ownStep: the mode runs the whole live tick, the camera and the picture. The platformer bodies are hidden (alive
   false) and the mode draws Pip and Bo riding on their own paper planes (Pip's orange, Bo's blue), side-on.
   All positions are in course coordinates: x runs from the launch posts (x 150) to the finish arch (course.len), y is
   the screen's own y (the cloud ceiling at the top, the ground at the bottom). The camera only scrolls sideways.
   A round (after the framework's Round N card and 3-2-1, while both planes sit in their slingshots):
     throw  hold the action: the slingshot's power meter swings up and down (0.7 s up, 0.7 s down); let go and the
            plane flies off at 170-400 px/s. The top gold zone (88%+) is a "Perfect throw!" (+30 px/s). Nobody
            pressing for 3.5 s (or the other plane already 650 px away) is an auto throw at 45%. The higher slingshot
            swaps every round.
     fly    ▲ (W / ↑ / Space / stick up / A / touch ▲) tilts the nose up, ▼ (S / ↓ / stick down / touch ▼) tilts it
            down; let go and the nose settles to a gentle glide. Diving gains speed, climbing trades speed for height,
            and climbing while slow (under 105 px/s) stalls: a wobble, the nose drops and controls come back after
            0.8 s. The plane always sinks a little, so height is the thing to spend.
            Warm air (shimmering gold columns over flower fields, chimneys, warm sand and sunbeams) lifts you without
            costing speed. Gold rings give +170 px/s that holds for 1 s (each player can take each ring once).
            The action is a flap: +100 px/s and a hop up, 3 per round (paper icons on your panel), 1 s apart.
            Birds, balloons, kites, tree tops, roofs, masts, the lighthouse, towers and the sleepy hanging clouds are
            bumps: you keep half your speed (at least 90 px/s), get pushed away from it (up off things that stand on the
            ground, down from the hanging clouds), the plane crumples and wobbles and floats through for 0.8 s. A bump
            never ends a round. Planes that touch go "Bonk!" and are nudged apart (both lose a little speed).
            The cloud ceiling puffs you back down. Touching the ground is a skid: half your speed and a hop back up.
     finish the first plane through the finish arch (x >= course.len) wins the round ("First through the cloud
            arch!" under the framework's "Pip wins the round!"). Both in the same tick: the one farther past it; level: a tie, replayed.
     time   the round clock is 75 s (def.match.roundTime): the plane farther along wins; within 12 px it's a tie.
   Rounds (each its own course, built fresh from tokens every round with MODES.paperplane.rand):
     1 Meadow Breeze (trees, kites, little yellow birds, balloons), 2 Rooftop Run (roofs, chimney warm air,
     pigeons, a blimp), 3 Seaside Soar (warm sand, boat masts, gulls, the lighthouse), 4 Cloud Castle (towers and
     sleepy hanging clouds make gaps, lots of rings), 5 Rainbow Final (a bit of everything, the longest).
     A replayed round gets a fresh layout of the same course. tiebreak(): more rings this match, else replay.
   The camera follows the leader (at 62% of the screen) but never leaves the trailer behind: the trailer stays at
   least 90 px in from the left edge, and the leader at most 90 px (never under 50 px, even while the camera eases) from
   the right edge. If the gap would put the leader off the right side, the trailer is pulled along at the left edge.
   A trailer within 150 px of the left edge (and 450+ px behind) gets a gold tailwind (+35 px/s), announced over the
   plane and on the panel.
   Catch-up help, gold and announced (round card, panel border, panel line): 1 round behind = 1 gold flap extra;
   2+ behind = 2 gold flaps and gold wings (the plane sinks slower and warm air lifts it 15% more). Off in sudden death.
   Soft fails only: bumps crumple and wobble, skids hop back up, stalls wobble. Nobody gets hurt; birds flutter off
   and balloons bob away.
   Every top-level name is prefixed pp / PP, every sound Sfx.extra.paperplane*. Rule randomness only from
   MODES.paperplane.rand (Math.random, inside the step); looks use their own ppVR. */
const PP = {
  ceil: 98, ground: 472, groundY: 490,       // plane centre limits (cloud ceiling, skid line); where the ground is drawn
  startX: 150, startY: [236, 326],           // the two slingshots (high, low)
  // glide physics
  ga: 360, drag: 0.55, cruise: 230, sink: 24, sinkGold: 15, goldLift: 1.15, maxSp: 560, minSp: 70,
  pitch: 1.15, angMin: -0.6, angMax: 0.7, angRest: 0.05, rest: 1.1,
  stallSp: 105, stallT: 0.6, hopTau: 0.35, liftV: 235, liftRate: 6,
  // the throw
  meterHalf: 0.7, perfect: 0.88, throwMin: 170, throwMax: 400, perfectBonus: 30, autoThrow: 3.5, autoPower: 0.45, autoGap: 650,
  // flaps
  flaps: 3, flapSp: 100, flapHop: -250, flapCd: 1.0,
  // touches
  ringR: 30, ringBoost: 170, ringHold: 1.0, bumpKeep: 0.5, bumpImm: 0.8, wobT: 0.6, skidKeep: 0.5, skidHop: -300, skidMin: 80,
  planeR: 12, pairDX: 36, pairDY: 22, pairCd: 0.7,
  // camera and the gold tailwind
  camLead: 0.62, camTrail: 90, camRight: 90, camHard: 50, windX: 150, windGap: 450, windV: 35,
  roundTime: 75, timeTie: 12,
  drawS: 1.3,                                // planes are drawn this much bigger than their bump size
};
const PP_COURSES = {
  meadow: { name: 'Meadow Breeze', hint: 'Warm air over the flowers lifts you. Dive for speed, fly through rings!',
    plan: '_ U r T B U R T K U r T+r B U L T U R K T B U r T U R L B r' },
  city: { name: 'Rooftop Run', hint: 'Fly over the roofs! Warm chimney air lifts you. Mind the pigeons and the blimp.',
    plan: '_ H C r H P Y H C R H P L H C r Y H P C R H H C r P H C R P r' },
  seaside: { name: 'Seaside Soar', hint: 'Warm sand lifts you. Over the lighthouse, past the masts and the gulls!',
    plan: '_ U G r M M U O R G K U M r G O U R M G U r M G U R O U r G r' },
  castle: { name: 'Cloud Castle', hint: 'Slip through the gaps between the towers and the sleepy clouds. Lots of rings!',
    plan: '_ U W r X R W L U X r W R X U L W X R U r W X U R X U r W r' },
  final: { name: 'Rainbow Final', hint: 'The final! A bit of everything. Save a flap for the sprint!',
    plan: '_ U T B R H C P X U M G r O W U X R K L U B R X U r T C R G U X r' },
};
const PP_ORDER = ['meadow', 'city', 'seaside', 'castle', 'final'];
// looks-only randomness (feathers, dust, sparkles): never MODES.paperplane.rand
let ppVS = 20261121;
const ppVR = () => { ppVS = (Math.imul(ppVS, 1664525) + 1013904223) >>> 0; return ppVS / 4294967296; };
const ppHash = (a, b) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
// 1-player mode: the computer flies this plane (no key reminders for it)
const ppCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const ppBig = () => hudBig();
const ppPing = c => { const u = (c / PP.meterHalf) % 2; return u <= 1 ? u : 2 - u; };

/* ---------- the course ---------- */
// builds one course from its token plan: updrafts (ups), rings and obstacles (obs), all in course coordinates
function ppBuildCourse(key, R) {
  const cs = PP_COURSES[key], c = { key, name: cs.name, hint: cs.hint, ups: [], rings: [], obs: [], len: 0 };
  const rr0 = (a, b) => a + R() * (b - a), q = PP, gy = q.groundY;
  let x = 420, id = 0;
  const ring = (rx, ry) => c.rings.push({ id: id++, x: rx, y: clamp(ry, q.ceil + 24, q.ground - 30), got: [false, false], gotT: [9, 9] });
  const ob = o => { o.id = id++; o.hitT = 9; o.ph = R() * 6.28; c.obs.push(o); return o; };
  const birdKind = key === 'city' ? 'pigeon' : key === 'seaside' ? 'gull' : key === 'castle' ? 'pink' : 'chick';
  const place = (tk, x0) => {
    switch (tk) {
      case '_': return 260;
      case 'U': { const w = rr0(230, 290); c.ups.push({ x0: x0 + 40, x1: x0 + 40 + w, look: key === 'seaside' ? 'sand' : key === 'castle' ? 'sun' : 'flowers' }); return w + 150; }
      case 'C': { // a chimney building with warm air over it
        const w = rr0(120, 150), top = rr0(340, 390);
        ob({ k: 'bldg', x: x0 + 40, w, top, chim: true, col: Math.floor(R() * 4) });
        c.ups.push({ x0: x0 + 10, x1: x0 + 70 + w, look: 'chimney', cx: x0 + 40 + w * 0.7, top });
        return w + 170;
      }
      case 'r': ring(x0 + 120, rr0(150, 400)); return 250;
      case 'R': { let y = rr0(140, 230); for (let i = 0; i < 3; i++) { ring(x0 + 80 + i * 150, y); y += rr0(45, 75); } return 520; }
      case 'T': { const n = R() < 0.5 ? 1 : 2; for (let i = 0; i < n; i++) ob({ k: 'tree', x: x0 + 90 + i * 120, cy: rr0(330, 395), r: 44 }); return 160 + n * 120; }
      case 'B': case 'P': case 'G': {
        const n = 2 + (R() < 0.45 ? 1 : 0), lanes = [rr0(140, 210), rr0(250, 320), rr0(360, 430)];
        const skip = Math.floor(R() * 3);
        let k = 0;
        for (let i = 0; i < 3; i++) { if (n === 2 && i === skip) continue; ob({ k: 'bird', kind: birdKind, x: x0 + 90 + k * 90 + rr0(-20, 20), y: lanes[i], r: 15, amp: rr0(14, 28), drift: rr0(0, 22) }); k++; }
        return 360;
      }
      case 'K': ob({ k: 'kite', x: x0 + 150, y: rr0(150, 290), r: 19, col: Math.floor(R() * 3) }); return 300;
      case 'L': {
        const lanes = [rr0(140, 190), rr0(255, 305), rr0(370, 420)], skip = Math.floor(R() * 3);
        let k = 0;
        for (let i = 0; i < 3; i++) { if (i === skip) continue; ob({ k: 'balloon', x: x0 + 100 + k * 70, y: lanes[i], r: 19, col: Math.floor(R() * 4) }); k++; }
        return 300;
      }
      case 'H': { const w = rr0(120, 170), tall = R() < 0.35; ob({ k: 'bldg', x: x0 + 40, w, top: tall ? rr0(250, 290) : rr0(320, 400), col: Math.floor(R() * 4) }); return w + 110; }
      case 'Y': ob({ k: 'blimp', x: x0 + 170, y: rr0(150, 200), r: 26 }); return 380;
      case 'M': ob({ k: 'mast', x: x0 + 140, top: rr0(260, 330), col: Math.floor(R() * 3) }); return 260;
      case 'O': ob({ k: 'light', x: x0 + 150, top: rr0(205, 235) }); return 340;
      case 'W': ob({ k: 'tower', x: x0 + 140, top: rr0(270, 360), col: Math.floor(R() * 3) }); return 300;
      case 'X': { // a gap: a tower below and a sleepy cloud hanging from the ceiling above
        const hb = rr0(185, 235), top = hb + rr0(150, 175) + 40;
        ob({ k: 'hang', x: x0 + 150, bottom: hb });
        ob({ k: 'tower', x: x0 + 150, top: Math.min(top, 420), col: Math.floor(R() * 3) });
        return 330;
      }
      default: return 0;
    }
  };
  for (const tok of cs.plan.split(/\s+/)) {
    if (!tok) continue;
    let w = 0;
    for (const part of tok.split('+')) w = Math.max(w, place(part, x));
    x += w;
  }
  c.len = Math.round(x + 260);
  return c;
}
// where an obstacle is right now (birds bob and drift, balloons and kites bob): circles and rects to bump into
function ppShapes(o, t) {
  const gy = PP.groundY;
  switch (o.k) {
    case 'bird': { const x = o.x - o.drift * t, y = o.y + Math.sin(t * 1.7 + o.ph) * o.amp; return { c: [[x, y, o.r]], r: [], cx: x, cy: y }; }
    case 'balloon': { const y = o.y + Math.sin(t * 1.2 + o.ph) * 10; return { c: [[o.x, y, o.r]], r: [], cx: o.x, cy: y }; }
    case 'kite': { const x = o.x + Math.cos(t * 0.9 + o.ph) * 10, y = o.y + Math.sin(t * 1.1 + o.ph) * 20; return { c: [[x, y, o.r]], r: [], cx: x, cy: y }; }
    case 'tree': return { c: [[o.x, o.cy, o.r]], r: [[o.x - 9, o.cy, o.x + 9, gy]], cx: o.x, cy: o.cy };
    case 'bldg': return { c: [], r: [[o.x, o.top, o.x + o.w, gy]].concat(o.chim ? [[o.x + o.w * 0.7 - 11, o.top - 30, o.x + o.w * 0.7 + 11, o.top]] : []), cx: o.x + o.w / 2, cy: o.top };
    case 'blimp': return { c: [[o.x - 52, o.y, 22], [o.x, o.y, o.r + 2], [o.x + 52, o.y, 22]], r: [], cx: o.x, cy: o.y };
    case 'mast': return { c: [], r: [[o.x - 5, o.top, o.x + 5, gy], [o.x - 30, o.top + 50, o.x - 5, gy - 30]], cx: o.x, cy: o.top };
    case 'light': return { c: [[o.x, o.top - 14, 20]], r: [[o.x - 24, o.top, o.x + 24, gy]], cx: o.x, cy: o.top };
    case 'tower': return { c: [[o.x, o.top - 12, 24]], r: [[o.x - 34, o.top, o.x + 34, gy]], cx: o.x, cy: o.top };
    case 'hang': return { c: [[o.x, o.bottom - 38, 38]], r: [[o.x - 34, 0, o.x + 34, o.bottom - 38]], cx: o.x, cy: o.bottom };
    default: return { c: [], r: [], cx: o.x, cy: 0 };
  }
}
// the x range an obstacle can cover (for quick culling)
function ppSpan(o) {
  switch (o.k) {
    case 'bird': return [o.x - 30 - o.drift * PP.roundTime, o.x + 30];
    case 'bldg': return [o.x - 4, o.x + o.w + 4];
    case 'blimp': return [o.x - 80, o.x + 80];
    case 'mast': return [o.x - 34, o.x + 8];
    case 'light': case 'tower': return [o.x - 36, o.x + 36];
    case 'hang': return [o.x - 40, o.x + 40];
    default: return [o.x - 50, o.x + 50];
  }
}
function ppHitShapes(s, x, y, r) {
  for (const [cx, cy, cr] of s.c) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy < (cr + r) * (cr + r)) return true; }
  for (const [x0, y0, x1, y1] of s.r) { const nx = clamp(x, x0, x1), ny = clamp(y, y0, y1), dx = x - nx, dy = y - ny; if (dx * dx + dy * dy < r * r) return true; }
  return false;
}
// how much warm air lifts a plane at (x, y) (px/s upward)
function ppLiftAt(c, x, y) {
  let l = 0;
  for (const u of c.ups) {
    if (x <= u.x0 || x >= u.x1) continue;
    const k = Math.sin(Math.PI * (x - u.x0) / (u.x1 - u.x0));
    l = Math.max(l, PP.liftV * Math.sqrt(k) * (y < PP.ceil + 30 ? 0.4 : 1));
  }
  return l;
}

/* ---------- the planes ---------- */
function ppMakePlane(k, slot) {
  return { k, slot, x: PP.startX, y: PP.startY[slot], sp: 0, ang: -0.22, hv: 0, lift: 0, vx: 0, vy: 0,
    phase: 'hold', charge: 0, charging: false, power: 0, flaps: PP.flaps, gold: 0, goldFlaps: 0, wings: false,
    flapCd: 0, stallT: 0, wobT: 0, immT: 0, skidT: 0, boostT: 0, pairCd: 0, flyT: 0, tail: false, tailSaid: false, pulled: 0,
    finishT: null, perfect: false,
    // looks only
    pop: '', popT: 9, popCol: '#fff', popBig: false, flapT: 9, mood: 'happy', cheer: 0, up: false, down: false };
}
function ppPop(P, text, col, big) { P.pop = text; P.popCol = col || '#ffffff'; P.popT = 0; P.popBig = !!big; }
function ppNewRound(st, n, info, R) {
  const key = st.forceCourse || PP_ORDER[Math.min(n, PP_ORDER.length) - 1];
  st.course = ppBuildCourse(key, R);
  st.round = n;
  // the higher slingshot swaps every round (Pip high in odd rounds)
  const hi = (n - 1) % 2;
  st.pl = [0, 1].map(k => ppMakePlane(k, k === hi ? 0 : 1));
  for (const P of st.pl) {
    P.gold = info.suddenDeath || st.noHelp ? 0 : Math.max(0, info.wins[1 - P.k] - info.wins[P.k]);
    P.goldFlaps = P.gold >= 2 ? 2 : P.gold >= 1 ? 1 : 0;
    P.flaps = PP.flaps + P.goldFlaps;
    P.wings = P.gold >= 2;
  }
  st.ph = 'set'; st.rt = 0; st.res = null; st.ended = false;
  st.cam = { x: 0 };
  st.vis.fx = []; st.vis.pops = [];
}

/* ---------- the tick ---------- */
function ppLaunch(st, P, power, auto) {
  const q = PP;
  P.phase = 'fly'; P.power = power; P.charging = false; P.flyT = 0;
  P.perfect = !auto && power >= q.perfect;
  P.sp = q.throwMin + (q.throwMax - q.throwMin) * power + (P.perfect ? q.perfectBonus : 0);
  P.ang = -0.22; P.hv = -40;
  P.x = q.startX; P.y = q.startY[P.slot];
  Sfx.play('paperplaneThrow', P.k);
  if (P.perfect) { ppPop(P, 'Perfect throw!', C.gold, true); Sfx.play('paperplanePerfect', P.k); st.stat.perfect[P.k]++; }
  else if (auto) ppPop(P, 'Whoosh! Off you go!', '#ffffff', false);
  else ppPop(P, power > 0.6 ? 'Good throw!' : 'Wheee!', '#ffffff', false);
  for (let i = 0; i < 8; i++) ppFx(st, P.x - 20, P.y, -60 - ppVR() * 80, (ppVR() - 0.5) * 80, 0.5, 'rgba(255,255,255,0.85)', 4, 0, 'dot');
}
function ppFlap(st, P) {
  const q = PP;
  if (P.flaps <= 0) { ppPop(P, 'No flaps left!', '#ffd2c4', false); Sfx.play('paperplaneNope', P.k); return; }
  if (P.flapCd > 0) return;
  P.flaps--; P.flapCd = q.flapCd; P.flapT = 0;
  P.sp = Math.min(q.maxSp, P.sp + q.flapSp); P.hv = Math.min(P.hv, q.flapHop);
  if (P.stallT > 0) P.stallT = Math.min(P.stallT, 0.15);
  st.stat.flaps[P.k]++;
  Sfx.play('paperplaneFlap', P.k);
  const gold = P.flaps < P.goldFlaps;
  for (let i = 0; i < 6; i++) ppFx(st, P.x - 26, P.y + 4, -90 - ppVR() * 60, (ppVR() - 0.2) * 90, 0.45, gold ? C.gold : 'rgba(255,255,255,0.9)', 3.5, 0, 'dot');
}
function ppBump(st, P, o, s) {
  const q = PP;
  P.sp = Math.max(90, P.sp * q.bumpKeep);
  const dir = o.k === 'hang' ? 1 : (o.k === 'bird' || o.k === 'balloon' || o.k === 'kite' || o.k === 'blimp') ? (P.y < s.cy ? -1 : 1) : -1;
  P.hv = dir * 170;
  P.wobT = q.wobT; P.immT = q.bumpImm;
  o.hitT = 0; o.hitBy = P.k;
  st.stat.bumps[P.k]++;
  const word = { bird: o.kind === 'pigeon' ? 'Coo!' : o.kind === 'gull' ? 'Squawk!' : 'Tweet!', balloon: 'Boing!', kite: 'Flap!', tree: 'Rustle!', blimp: 'Boing!', hang: 'Puff!' }[o.k] || 'Bonk!';
  ppPop(P, word, '#ffe6a8', false);
  Sfx.play(o.k === 'bird' ? 'paperplaneTweet' : 'paperplaneBump', P.k);
  rumble(P.k, 0.15, 0.4, 120);
  for (let i = 0; i < 7; i++) {
    const feather = o.k === 'bird' || o.k === 'tree';
    ppFx(st, P.x + 10, P.y, (ppVR() - 0.5) * 160, (ppVR() - 0.7) * 160, 0.8, feather ? (o.k === 'tree' ? '#6fc25a' : '#ffffff') : '#fff3a0', feather ? 4 : 3, feather ? 60 : 160, feather ? 'leaf' : 'spark');
  }
}
function ppSkid(st, P) {
  const q = PP;
  P.y = q.ground;
  P.sp = Math.max(q.skidMin, P.sp * q.skidKeep); P.hv = q.skidHop; P.ang = clamp(P.ang, -0.12, 0); P.skidT = 0.4;
  st.stat.skids[P.k]++;
  ppPop(P, 'Skid! Hop!', '#ffffff', false);
  Sfx.play('paperplaneSkid', P.k);
  const water = st.course.key === 'seaside' && P.x > st.course.len * 0.35, cloud = st.course.key === 'castle';
  for (let i = 0; i < 9; i++) ppFx(st, P.x + (ppVR() - 0.5) * 30, q.groundY - 4, (ppVR() - 0.5) * 120, -40 - ppVR() * 120, 0.6,
    water ? 'rgba(200,240,255,0.9)' : cloud ? 'rgba(255,255,255,0.9)' : 'rgba(200,170,120,0.7)', 4 + ppVR() * 4, 300, 'dot');
}
// one plane's flight for one tick; inp = { up, down } or null (no steering: banners, after the finish)
function ppFly(st, P, inp, dt, live) {
  const q = PP, c = st.course;
  P.flyT += dt;
  P.up = !!(inp && inp.up); P.down = !!(inp && inp.down);
  if (P.stallT > 0) { P.stallT -= dt; P.ang = approach(P.ang, 0.5, 3.2 * dt); }
  else if (P.phase === 'done') P.ang = approach(P.ang, -0.18, 1.5 * dt);
  else {
    const pit = (P.up ? -1 : 0) + (P.down ? 1 : 0);
    if (pit) P.ang += pit * q.pitch * dt; else P.ang = approach(P.ang, q.angRest, q.rest * dt);
  }
  P.ang = clamp(P.ang, q.angMin, q.angMax);
  // (a ring's burst holds for a moment: no drag back toward the cruise speed while it lasts)
  P.sp += (q.ga * Math.sin(P.ang) - (P.boostT > 0 && P.sp > q.cruise ? 0 : q.drag * (P.sp - q.cruise))) * dt;
  if (P.phase === 'done') P.sp = Math.max(P.sp, 240);
  P.sp = clamp(P.sp, q.minSp, q.maxSp);
  if (live && P.stallT <= 0 && P.phase === 'fly' && P.sp < q.stallSp && P.ang < -0.05) {
    P.stallT = q.stallT; st.stat.stalls[P.k]++;
    ppPop(P, 'Stall! Nose down!', '#ffe6a8', false); Sfx.play('paperplaneStall', P.k);
  }
  const lift = ppLiftAt(c, P.x, P.y) * (P.wings ? q.goldLift : 1);
  P.lift = approach(P.lift, lift, q.liftV * q.liftRate * dt);
  P.hv *= Math.exp(-dt / q.hopTau);
  P.vx = P.sp * Math.cos(P.ang) + (P.tail ? q.windV : 0);
  P.vy = P.sp * Math.sin(P.ang) + (P.wings ? q.sinkGold : q.sink) - P.lift + P.hv;
  const px = P.x;
  P.x += P.vx * dt; P.y += P.vy * dt;
  // the cloud ceiling puffs you back down; the ground is a skid and a hop
  if (P.y < q.ceil) {
    P.y = q.ceil;
    if (P.vy < 0) { P.hv = Math.max(P.hv, 30); if (P.ang < -0.05) P.ang = approach(P.ang, -0.05, 2 * dt); if (ppVR() < dt * 8) ppFx(st, P.x, q.ceil - 14, (ppVR() - 0.5) * 60, -20, 0.6, 'rgba(255,255,255,0.95)', 6, 0, 'dot'); }
  }
  if (P.y > q.ground) { if (live && P.phase === 'fly') ppSkid(st, P); else { P.y = q.ground; P.hv = -200; } }
  P.flapCd = Math.max(0, P.flapCd - dt); P.wobT = Math.max(0, P.wobT - dt); P.immT = Math.max(0, P.immT - dt);
  P.skidT = Math.max(0, P.skidT - dt); P.boostT = Math.max(0, P.boostT - dt); P.pairCd = Math.max(0, P.pairCd - dt);
  if (!live || P.phase !== 'fly') return;
  // gold rings
  for (const g of c.rings) {
    if (g.got[P.k] || px >= g.x || P.x < g.x) continue;
    if (Math.abs(P.y - g.y) <= q.ringR + 2) {
      g.got[P.k] = true; g.gotT[P.k] = 0;
      P.sp = Math.min(q.maxSp, P.sp + q.ringBoost); P.boostT = q.ringHold;
      st.stat.rings[P.k]++;
      ppPop(P, 'Zoom!', C.gold, false); Sfx.play('paperplaneRing', P.k);
      for (let i = 0; i < 10; i++) ppFx(st, g.x, g.y + (ppVR() - 0.5) * 50, (ppVR() - 0.3) * 160, (ppVR() - 0.5) * 160, 0.6, i % 2 ? C.gold : '#ffffff', 3, 0, 'spark');
    }
  }
  // bumps
  if (P.immT <= 0) {
    for (const o of c.obs) {
      const sp = ppSpan(o);
      if (P.x < sp[0] - 20 || P.x > sp[1] + 20) continue;
      const s = ppShapes(o, st.rt);
      if (ppHitShapes(s, P.x, P.y, q.planeR)) { ppBump(st, P, o, s); break; }
    }
  }
}
function ppEnd(st, winner, reason) {
  if (st.ended) return;
  st.ended = true; st.ph = 'done';
  st.res = { winner, reason };
  if (winner >= 0) { st.stat.wins[winner]++; st.pl[winner].cheer = 1; st.pl[winner].mood = 'joy'; }
  matchRoundEnd(winner, reason);
}
function ppTick(dt, live) {
  const st = G.mst, q = PP, c = st.course;
  st.t += dt;
  if (live) st.rt += dt;
  if (live && st.ph === 'set') st.ph = 'race';
  for (const P of st.pl) {
    const p = G.players[P.k];
    const inp = live ? { up: !!(p.input.jump || p.input.up) && !p.input.down, down: !!p.input.down && !(p.input.jump || p.input.up) } : null;
    if (P.phase === 'hold') {
      if (!live) continue;
      const other = st.pl[1 - P.k];
      if (p.input.act) { P.charging = true; P.charge += dt; P.power = ppPing(P.charge); }
      else if (P.charging) ppLaunch(st, P, P.power, false);
      if (P.phase === 'hold' && (st.rt >= q.autoThrow || (other.phase !== 'hold' && other.x - P.x > q.autoGap))) ppLaunch(st, P, P.charging ? Math.max(P.power, q.autoPower) : q.autoPower, true);
      p.pendingAct = false;
      continue;
    }
    if (live && P.phase === 'fly') {
      if (p.pendingAct) { p.pendingAct = false; if (P.flyT > 0.25) ppFlap(st, P); }
      if (P.flyT < 0.25 && p.input.act) { /* still holding the throw: not a flap */ }
    }
    ppFly(st, P, P.phase === 'fly' ? inp : null, dt, live);
    if (live && P.phase === 'fly') {
      st.stat.dist[P.k] = Math.max(st.stat.dist[P.k], P.x);
      if (P.tail) st.stat.tail[P.k] += dt;
    }
  }
  // planes that touch: bonk, nudged apart
  const [A, B] = st.pl;
  if (live && A.phase === 'fly' && B.phase === 'fly' && A.pairCd <= 0 && B.pairCd <= 0 &&
      Math.abs(A.x - B.x) < q.pairDX && Math.abs(A.y - B.y) < q.pairDY) {
    const top = A.y <= B.y ? A : B, bot = top === A ? B : A;
    top.hv = Math.min(top.hv, -150); bot.hv = Math.max(bot.hv, 150);
    A.sp *= 0.94; B.sp *= 0.94; A.pairCd = B.pairCd = q.pairCd; A.wobT = B.wobT = 0.3;
    st.stat.bonks++;
    ppWorldPop(st, 'Bonk!', (A.x + B.x) / 2, (A.y + B.y) / 2 - 30, '#ffffff');
    Sfx.play('paperplaneBonk');
  }
  // the finish arch
  if (live && !st.ended) {
    const done = st.pl.filter(P => P.phase === 'fly' && P.x >= c.len);
    if (done.length) {
      for (const P of done) { P.phase = 'done'; P.finishT = st.rt; }
      let w = done[0].k;
      if (done.length === 2) w = Math.abs(A.x - B.x) < 0.5 ? -1 : (A.x > B.x ? 0 : 1);
      if (w >= 0) {
        const t = st.rt;
        if (!(st.stat.best[w] <= t)) { st.stat.best[w] = t; st.stat.bestCourse[w] = c.name; }
        Sfx.play('paperplaneFinish', w);
        ppEnd(st, w, 'First through the cloud arch!');
      } else ppEnd(st, -1, 'A photo finish! Exactly level!');
    }
  }
  ppCamera(st, dt, false, live);
  ppVisTick(st, dt);
  ppMirror(st);
}

/* ---------- camera ---------- */
// follows the leader, never leaves the trailer behind (it is pulled along at the left edge), gold tailwind there
function ppCamera(st, dt, snap, live) {
  const q = PP, cam = st.cam, c = st.course;
  if (!st.pl || !c) return;
  const fly = st.pl.filter(P => P.phase !== 'hold');
  const xs = st.pl.map(P => P.x), lead = Math.max(xs[0], xs[1]), trail = Math.min(xs[0], xs[1]);
  let want = lead - W * q.camLead;
  want = Math.min(want, trail - q.camTrail);
  want = Math.max(want, lead - (W - q.camRight));
  const maxX = c.len + 120 - W * 0.62;
  want = clamp(want, 0, Math.max(0, maxX));
  const a = snap ? 1 : 1 - Math.exp(-7 * dt);
  cam.x += (want - cam.x) * a;
  if (snap) cam.x = want;
  // (the easing lags a fast leader: never let the leader's plane slip past the right edge)
  cam.x = clamp(Math.max(cam.x, lead - (W - q.camHard)), 0, Math.max(0, maxX));
  // the trailer: pulled along at the left edge, a gold tailwind near it
  for (const P of st.pl) {
    if (P.phase !== 'fly') { P.tail = false; continue; }
    const O = st.pl[1 - P.k];
    const edge = cam.x + q.camTrail - 30;
    if (live && P.x < edge && O.x - P.x > q.windGap) { P.pulled += edge - P.x; P.x = edge; }
    const wasTail = P.tail;
    P.tail = live && !st.noHelp && O.x - P.x > q.windGap && P.x - cam.x < q.windX;
    if (P.tail && !wasTail && !P.tailSaid) { P.tailSaid = true; ppPop(P, 'Gold tailwind!', C.gold, true); Sfx.play('paperplaneGold', P.k); }
  }
  void fly;
}
// the platformer bodies stay hidden, but p.x / p.y follow the picture (bubbles, confetti fall-backs)
function ppMirror(st) {
  if (!st.pl || !st.cam) return;
  for (const p of G.players) {
    const P = st.pl[p.id];
    p.x = P.x - st.cam.x - p.w / 2; p.y = P.y - 30 - p.h;
  }
}

/* ---------- looks: effects that never touch the rules ---------- */
function ppFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot', rot: ppVR() * 6.28 });
  if (v.fx.length > 320) v.fx.splice(0, v.fx.length - 320);
}
function ppWorldPop(st, text, x, y, col) { st.vis.pops.push({ text, x, y, t: 0, col: col || '#ffffff' }); }
function ppVisNew() { return { fx: [], pops: [], t: 0, trailT: 0 }; }
function ppVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  v.t += dt;
  let n = 0;
  for (const f of v.fx) { f.life -= dt; f.vx *= Math.exp(-1.6 * dt); f.vy += f.grav * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt * 5; if (f.life > 0) v.fx[n++] = f; }
  v.fx.length = n;
  v.pops = v.pops.filter(p => (p.t += dt) < 1.1);
  for (const g of st.course ? st.course.rings : []) { g.gotT[0] += dt; g.gotT[1] += dt; }
  for (const o of st.course ? st.course.obs : []) o.hitT += dt;
  for (const P of st.pl || []) {
    P.popT += dt; P.flapT += dt; P.cheer = Math.max(0, P.cheer - dt * 0.4);
    // a paper streak behind fast planes, sparkles on a tailwind
    if (P.phase !== 'hold' && (P.sp > 400 || P.boostT > 0) && ppVR() < dt * 30) ppFx(st, P.x - 34, P.y + (ppVR() - 0.5) * 14, -120, 0, 0.3, P.boostT > 0 ? 'rgba(255,224,130,0.9)' : 'rgba(255,255,255,0.8)', 2.5, 0, 'streak');
    if (P.tail && ppVR() < dt * 24) ppFx(st, P.x - 60 - ppVR() * 40, P.y + (ppVR() - 0.5) * 50, 260, 0, 0.35, 'rgba(255,214,90,0.9)', 2.5, 0, 'streak');
    if (P.skidT > 0 && ppVR() < dt * 30) ppFx(st, P.x, PP.groundY - 3, -60 - ppVR() * 60, -30 - ppVR() * 50, 0.4, 'rgba(255,255,255,0.8)', 3.5, 200, 'dot');
    if (P.phase === 'done' && P.cheer > 0 && ppVR() < dt * 10) ppFx(st, P.x + (ppVR() - 0.5) * 60, P.y - 20, (ppVR() - 0.5) * 100, -80 - ppVR() * 80, 0.9, ['#ffc53d', '#ff8fc7', '#8fe3b0', '#ffffff'][Math.floor(ppVR() * 4)], 3.5, 160, 'spark');
  }
}

/* ---------- the mode ---------- */
MODES.paperplane = {
  rand() { return Math.random(); },
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { wins: [0, 0], rings: [0, 0], flaps: [0, 0], bumps: [0, 0], skids: [0, 0], stalls: [0, 0], perfect: [0, 0], best: [Infinity, Infinity], bestCourse: ['', ''], dist: [0, 0], tail: [0, 0], bonks: 0 };
    st.forceCourse = this.testCourse || null;
    st.noHelp = !!this.testNoHelp;   // bot tests: no gold help at all (to measure raw skill)
    st.vis = ppVisNew();
    st.t = 0; st.rt = 0;
  },
  resetRound(n, info) {
    const st = G.mst;
    st.vis = ppVisNew();
    ppNewRound(st, n, info, () => this.rand());
    ppCamera(st, 0, true, false);
    // the planes are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
    G.particles.length = 0;
    ppMirror(st);
    ppActLabel('throw');
  },
  go() {
    const st = G.mst;
    if (G.match) G.match.goT = 0.45;
    st.ph = 'race'; st.rt = 0;
    for (const P of st.pl) if (P.gold) ppPop(P, P.wings ? 'Gold wings + 2 gold flaps!' : 'A gold flap!', C.gold, true);
  },
  step(dt) {
    ppTick(dt, true);
    const st = G.mst;
    if (st.pl.every(P => P.phase !== 'hold')) ppActLabel('flap');
  },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.pl) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (m && (m.phase === 'end' || m.phase === 'over')) { ppTick(dt, false); return; }
    st.t += dt;
    ppVisTick(st, dt);
    ppCamera(st, dt, false, false);
    ppMirror(st);
    if (m && m.phase === 'count' && !st.goldSaid) { st.goldSaid = true; if (st.pl.some(P => P.gold)) Sfx.play('paperplaneGold'); }
    if (m && m.phase === 'ready') st.goldSaid = false;
  },
  timeUp() {
    const st = G.mst, [A, B] = st.pl, d = A.x - B.x;
    st.ended = true; st.ph = 'done';
    if (Math.abs(d) < PP.timeTie) { st.res = { winner: -1 }; return { winner: -1, reason: 'Time! Neck and neck!' }; }
    const w = d > 0 ? 0 : 1;
    st.res = { winner: w }; st.stat.wins[w]++; st.pl[w].cheer = 1;
    return { winner: w, reason: 'Time! Flew the farthest!' };
  },
  tiebreak() {
    const r = G.mst.stat.rings;
    if (r[0] !== r[1]) return { winner: r[0] > r[1] ? 0 : 1, reason: 'More rings this match!' };
    return -1;
  },
  draw() { ppDrawWorld(); },
  drawTop() { ppDrawTop(); },
  hud() { ppHud(); },
  stats() {
    const st = G.mst, s = st.stat;
    const out = [
      // (the match's own count: a round won on the tiebreak counts too)
      { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
      { label: 'Gold rings', values: s.rings.slice() },
      { label: 'Perfect throws', values: s.perfect.slice() },
      { label: 'Bumps & skids', values: [0, 1].map(k => s.bumps[k] + s.skids[k]) },
    ];
    const b = s.best;
    if (isFinite(b[0]) || isFinite(b[1])) {
      const w = !isFinite(b[1]) || b[0] < b[1] ? 0 : 1;
      out.push('Fastest round: ' + NAMES[w] + ', ' + s.bestCourse[w] + ' in ' + b[w].toFixed(1) + ' s!');
    }
    const r = s.rings;
    if (r[0] + r[1] > 0) out.push(r[0] === r[1] ? '★ Ring stars: Pip and Bo, ' + r[0] + ' each!' : '★ Ring star: ' + NAMES[r[0] > r[1] ? 0 : 1] + ' (' + Math.max(r[0], r[1]) + ' rings)');
    return out;
  },
  // test access for the bot harness and the computer brain (read-only)
  test: { PP, PP_COURSES, shapes: ppShapes, span: ppSpan, liftAt: ppLiftAt, ping: ppPing },
};
// the touch button's word: 'throw' in the slingshot, 'flap' once both planes fly
function ppActLabel(word) {
  const st = G.mst;
  if (st.actWord === word) return;
  st.actWord = word;
  try { document.querySelectorAll('[data-actlabel]').forEach(el => { el.textContent = word; }); if (typeof fitActLabels === 'function') fitActLabels(); } catch (e) { /* no DOM */ }
}

/* ---------- drawing: the sky and the course ---------- */
const PP_SKY = {
  meadow: ['#5ab4f2', '#a9dcff', '#fff4e0'], city: ['#6f9fe8', '#c4d8ff', '#ffe6d2'], seaside: ['#45aef0', '#a6e0ff', '#fff2d2'],
  castle: ['#8b82ee', '#d9c2ff', '#ffe4f1'], final: ['#ff8fae', '#ffc995', '#fff1c4'],
};
const PP_BCOL = ['#ff8fc7', '#8fe3b0', '#b28dff', '#ffd94a'];   // balloon colours (never Pip orange or Bo blue)
const PP_BLDG = [['#f2c6a0', '#d39a72'], ['#c9c4ee', '#9d97d0'], ['#f6e3a6', '#d2b46a'], ['#b8e2cf', '#83b9a2']];
const ppSX = (st, x) => x - st.cam.x;
function ppCloud(x, y, s, col) {
  // a soft blue-grey underside, the puffs, a bright top
  const shape = (dx, dy) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 22 * s, 0, Math.PI * 2); ctx.arc(x + 24 * s + dx, y - 10 * s + dy, 26 * s, 0, Math.PI * 2); ctx.arc(x + 50 * s + dx, y + dy, 20 * s, 0, Math.PI * 2); ctx.roundRect(x - 12 * s + dx, y - 4 * s + dy, 76 * s, 22 * s, 11 * s); };
  ctx.fillStyle = 'rgba(150,170,210,0.22)'; shape(2 * s, 5 * s); ctx.fill();
  ctx.fillStyle = col; shape(0, 0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(x + 18 * s, y - 22 * s, 10 * s); ctx.fill(); circle(x - 6 * s, y - 7 * s, 7 * s); ctx.fill();
}
function ppDrawSky(st) {
  const key = st.course.key, sk = PP_SKY[key] || PP_SKY.meadow, cx = st.cam.x;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, sk[0]); g.addColorStop(0.55, sk[1]); g.addColorStop(1, sk[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // the sun
  const sx = 760 - (cx * 0.02) % 40, sy = 150;
  ctx.fillStyle = 'rgba(255,240,190,0.45)'; circle(sx, sy, 62); ctx.fill();
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(st.t * 0.05); ctx.fillStyle = 'rgba(255,248,210,0.3)';
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(-5, 44); ctx.lineTo(0, 88 + (i % 2) * 16); ctx.lineTo(5, 44); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = key === 'final' ? '#fff3c0' : '#fff7d6'; circle(sx, sy, 38); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(sx - 8, sy - 8, 20); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,130,0.7)'; ctx.lineWidth = 2; circle(sx, sy, 38); ctx.stroke();
  // a rainbow far away (castle and final)
  if (key === 'castle' || key === 'final') {
    const rx = 520 - ((cx * 0.05) % 1400), cols = ['#ff8fa0', '#ffc070', '#ffe680', '#a8e89a', '#8fd0ff', '#b9a0ff'];
    for (const ox of [rx, rx + 1400]) {
      ctx.lineWidth = 9;
      cols.forEach((col, i) => { ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(ox, 470, 300 - i * 9, Math.PI, Math.PI * 2); ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
  }
  // far clouds (slow parallax)
  for (let i = -1; i < 7; i++) {
    const base = Math.floor(cx * 0.15 / 220) + i, x = base * 220 - cx * 0.15, y = 150 + ppHash(base, 3) * 170, s = 0.7 + ppHash(base, 4) * 0.6;
    ppCloud(x, y, s, 'rgba(255,255,255,0.55)');
  }
  // far scenery
  const far = cx * 0.3;
  if (key === 'meadow' || key === 'final') {
    ctx.fillStyle = key === 'final' ? '#e7b6d0' : '#b6e2b0';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, 400 - Math.sin((x + far) / 170) * 26 - Math.sin((x + far) / 63) * 10);
    ctx.lineTo(W, H); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, 401 - Math.sin((x + far) / 170) * 26 - Math.sin((x + far) / 63) * 10);
    ctx.stroke();
    // little far trees and hedges on the back hills
    for (let i = -1; i < W / 90 + 2; i++) {
      const n = Math.floor(far / 90) + i, x = n * 90 - far + ppHash(n, 31) * 50, y = 404 - Math.sin((x + far) / 170) * 26 - Math.sin((x + far) / 63) * 10;
      if (ppHash(n, 32) < 0.5) continue;
      ctx.fillStyle = key === 'final' ? '#cf8fb4' : '#7fbf7a'; circle(x, y - 8, 9); ctx.fill(); circle(x + 9, y - 5, 7); ctx.fill();
    }
    ctx.fillStyle = key === 'final' ? '#d99fc0' : '#93d08e';
    const mid = cx * 0.5;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, 440 - Math.sin((x + mid) / 120 + 1) * 22);
    ctx.lineTo(W, H); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, 441 - Math.sin((x + mid) / 120 + 1) * 22);
    ctx.stroke();
  } else if (key === 'city') {
    for (let layer = 0; layer < 2; layer++) {
      const f = layer ? 0.5 : 0.25, off = cx * f, col = layer ? '#a9a3dc' : '#c8c3ee', bw = layer ? 70 : 54;
      ctx.fillStyle = col;
      for (let i = -1; i < W / bw + 2; i++) {
        const n = Math.floor(off / bw) + i, x = n * bw - off, h = (layer ? 90 : 140) + ppHash(n, layer + 7) * (layer ? 90 : 120);
        ctx.fillRect(x, PP.groundY - h, bw - 6, h);
        if (!layer && ppHash(n, 9) < 0.3) { ctx.fillRect(x + bw / 2 - 6, PP.groundY - h - 26, 4, 26); }
        ctx.fillStyle = 'rgba(60,50,120,0.1)'; ctx.fillRect(x + bw - 16, PP.groundY - h, 10, h);
        ctx.fillStyle = 'rgba(255,255,255,' + (layer ? 0.3 : 0.4) + ')'; for (let wy = PP.groundY - h + 12; wy < PP.groundY - 10; wy += 18) for (let wx = x + 6; wx < x + bw - 16; wx += 12) if (ppHash(wx + n * 7, wy) > 0.35) ctx.fillRect(wx, wy, 5, 8);
        ctx.fillStyle = col;
      }
    }
  } else if (key === 'seaside') {
    ctx.fillStyle = '#5cc6e4'; ctx.fillRect(0, 410, W, H - 410);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 12; i++) { const x = ((i * 97 - cx * 0.35) % (W + 100) + W + 100) % (W + 100) - 50; ctx.fillRect(x, 420 + (i % 4) * 14, 30, 2); }
    // little far sailboats
    for (let i = -1; i < 4; i++) {
      const n = Math.floor(cx * 0.3 / 380) + i, x = n * 380 - cx * 0.3 + 120, y = 418;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x, y - 4); ctx.lineTo(x + 18, y - 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e48fb0'; rr(x - 8, y - 4, 32, 6, 3); ctx.fill();
    }
  } else if (key === 'castle') {
    ctx.fillStyle = '#f2d4f0';
    const off = cx * 0.25;
    for (let i = -1; i < 4; i++) {
      const n = Math.floor(off / 420) + i, x = n * 420 - off + 80;
      // a far floating island castle
      ctx.beginPath(); ctx.moveTo(x - 60, 330); ctx.lineTo(x + 100, 330); ctx.lineTo(x + 20, 372); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 40, 280, 24, 50); ctx.fillRect(x + 10, 260, 30, 70); ctx.fillRect(x + 60, 290, 22, 40);
      ctx.beginPath(); ctx.moveTo(x - 44, 280); ctx.lineTo(x - 28, 256); ctx.lineTo(x - 12, 280); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 6, 260); ctx.lineTo(x + 25, 228); ctx.lineTo(x + 44, 260); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 56, 290); ctx.lineTo(x + 71, 268); ctx.lineTo(x + 86, 290); ctx.fill();
    }
  }
}
// the ground strip: grass, a street, sand then sea, or a fluffy cloud floor
function ppDrawGround(st) {
  const key = st.course.key, cx = st.cam.x, gy = PP.groundY;
  if (key === 'meadow') {
    ctx.fillStyle = '#7fd35f'; ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = '#5aae4c'; ctx.fillRect(0, gy, W, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, gy, W, 1.5);
    ctx.strokeStyle = '#5aae4c'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = -1; i < W / 14 + 2; i++) { const n = Math.floor(cx / 14) + i, x = n * 14 - cx, h = ppHash(n, 17); if (h < 0.5) continue; ctx.moveTo(x, gy); ctx.lineTo(x - 2, gy - 4 - h * 4); ctx.moveTo(x + 3, gy); ctx.lineTo(x + 4, gy - 3 - h * 3); }
    ctx.stroke();
    for (let i = -1; i < W / 34 + 2; i++) {
      const n = Math.floor(cx / 34) + i, x = n * 34 - cx, h = ppHash(n, 11);
      ctx.fillStyle = ['#ffffff', '#ffd94a', '#ff8fc7', '#b28dff'][Math.floor(h * 4)];
      circle(x + 10, gy + 14 + h * 20, 3.2); ctx.fill();
      ctx.fillStyle = '#ffe7a0'; circle(x + 10, gy + 14 + h * 20, 1.2); ctx.fill();
    }
  } else if (key === 'city') {
    ctx.fillStyle = '#d9d4ea'; ctx.fillRect(0, gy, W, 10);
    ctx.fillStyle = '#8f8aa8'; ctx.fillRect(0, gy + 10, W, H - gy - 10);
    ctx.fillStyle = '#fff3c4';
    for (let i = -1; i < W / 80 + 2; i++) { const x = Math.floor(cx / 80) * 80 + i * 80 - cx; ctx.fillRect(x, gy + 28, 36, 4); }
  } else if (key === 'seaside') {
    const sandEnd = st.course.len * 0.35 - cx;
    ctx.fillStyle = '#4bbad8'; ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = -1; i < W / 60 + 2; i++) { const x = Math.floor(cx / 60) * 60 + i * 60 - cx; ctx.fillRect(x + Math.sin(st.t * 2 + i) * 6, gy + 8 + (i % 3) * 12, 26, 3); }
    if (sandEnd > 0) {
      ctx.fillStyle = '#f4dc9a'; ctx.fillRect(0, gy, Math.min(W, sandEnd), H - gy);
      ctx.fillStyle = '#e6c67a'; ctx.fillRect(0, gy, Math.min(W, sandEnd), 4);
      // beach umbrellas
      for (let i = -1; i < W / 260 + 2; i++) {
        const n = Math.floor(cx / 260) + i, x = n * 260 - cx + 90;
        if (x > sandEnd - 30) continue;
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, gy + 26); ctx.lineTo(x, gy - 10); ctx.stroke();
        ctx.fillStyle = n % 2 ? '#ff8fc7' : '#8fe3b0'; ctx.beginPath(); ctx.arc(x, gy - 8, 20, Math.PI, Math.PI * 2); ctx.fill();
      }
    }
  } else {
    // a fluffy cloud floor (castle, final)
    ctx.fillStyle = key === 'final' ? '#ffe9f2' : '#ffffff'; ctx.fillRect(0, gy + 8, W, H - gy - 8);
    for (let i = -1; i < W / 46 + 2; i++) { const n = Math.floor(cx / 46) + i, x = n * 46 - cx; circle(x, gy + 10 + ppHash(n, 13) * 6, 24 + ppHash(n, 14) * 6); ctx.fill(); }
    ctx.fillStyle = 'rgba(178,160,230,0.35)'; ctx.fillRect(0, H - 14, W, 14);
  }
}
// the cloud ceiling along the top
function ppDrawCeiling(st) {
  const cx = st.cam.x;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, 54);
  for (let i = -1; i < W / 52 + 2; i++) {
    const n = Math.floor(cx / 52) + i, x = n * 52 - cx, h = ppHash(n, 21);
    ctx.fillStyle = '#ffffff'; circle(x, 58 + h * 12, 28 + h * 10); ctx.fill();
  }
  ctx.fillStyle = 'rgba(190,180,240,0.25)';
  for (let i = -1; i < W / 52 + 2; i++) { const n = Math.floor(cx / 52) + i, x = n * 52 - cx, h = ppHash(n, 21); ctx.beginPath(); ctx.arc(x, 58 + h * 12, 28 + h * 10, 0.2, Math.PI - 0.2); ctx.fill(); }
}
function ppDrawUpdraft(st, u) {
  const x0 = ppSX(st, u.x0), x1 = ppSX(st, u.x1), w = x1 - x0, t = st.t;
  if (x1 < -10 || x0 > W + 10) return;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(255,210,110,0)'); g.addColorStop(0.5, 'rgba(255,210,110,0.34)'); g.addColorStop(1, 'rgba(255,210,110,0)');
  ctx.fillStyle = g; ctx.fillRect(x0, PP.ceil - 30, w, PP.groundY - PP.ceil + 30);
  // shimmering wavy lines rising
  ctx.strokeStyle = 'rgba(255,246,214,0.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const lx = x0 + w * (i + 0.5) / 5;
    for (let j = 0; j < 3; j++) {
      const ph = ((t * 0.55 + i * 0.37 + j / 3) % 1), y = PP.groundY - 20 - ph * (PP.groundY - PP.ceil - 20);
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) { const yy = y - k * 8; ctx.lineTo(lx + Math.sin(yy / 14 + t * 3 + i) * 5, yy); }
      ctx.stroke();
    }
  }
  // little up arrows near the bottom
  ctx.fillStyle = '#fff6d0';
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    const ph = (t * 0.45 + j / 3 + i * 0.17) % 1, ax = x0 + w * (0.33 + i * 0.34), ay = PP.groundY - 40 - ph * 320;
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.85;
    ctx.beginPath(); ctx.moveTo(ax, ay - 14); ctx.lineTo(ax + 12, ay); ctx.lineTo(ax + 5, ay); ctx.lineTo(ax + 5, ay + 8); ctx.lineTo(ax - 5, ay + 8); ctx.lineTo(ax - 5, ay); ctx.lineTo(ax - 12, ay); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  // where the warm air comes from
  const gy = PP.groundY;
  if (u.look === 'flowers') {
    for (let i = 0; i < Math.floor(w / 26); i++) {
      const fx = x0 + 13 + i * 26, h = 18 + (i % 3) * 6;
      ctx.strokeStyle = '#4f9a3f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, gy + 6); ctx.lineTo(fx, gy - h); ctx.stroke();
      ctx.fillStyle = '#ffc53d'; for (let a = 0; a < 6; a++) { circle(fx + Math.cos(a) * 6, gy - h + Math.sin(a) * 6, 4); ctx.fill(); }
      ctx.fillStyle = '#9a5a2e'; circle(fx, gy - h, 3.5); ctx.fill();
    }
  } else if (u.look === 'sand') {
    ctx.fillStyle = 'rgba(255,200,90,0.5)'; rr(x0 + 10, gy - 4, w - 20, 10, 5); ctx.fill();
  } else if (u.look === 'sun') {
    ctx.fillStyle = 'rgba(255,236,150,0.7)'; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, gy + 4, w * 0.4, 9, 0, 0, Math.PI * 2); ctx.fill();
  } else if (u.look === 'chimney') {
    // warm puffs from the chimney
    const cxs = ppSX(st, u.cx);
    for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - ph)).toFixed(2) + ')'; circle(cxs + Math.sin(ph * 6 + i) * 6, u.top - 34 - ph * 90, 8 + ph * 12); ctx.fill(); }
  }
}
function ppDrawRingHalf(st, g, front) {
  const x = ppSX(st, g.x); if (x < -40 || x > W + 40) return;
  const r = PP.ringR, any = g.got[0] || g.got[1];
  const pulse = 1 + 0.06 * Math.sin(st.t * 5 + g.id);
  ctx.save(); ctx.translate(x, g.y); ctx.scale(1, pulse);
  ctx.lineWidth = 7; ctx.strokeStyle = any ? 'rgba(255,214,90,0.5)' : C.gold;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, r + 4, 0, front ? -Math.PI / 2 : Math.PI / 2, front ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = any ? 'rgba(255,255,255,0.5)' : '#fff7d0';
  ctx.beginPath(); ctx.ellipse(0, 0, 11, r + 4, 0, front ? -Math.PI / 2 : Math.PI / 2, front ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke();
  ctx.restore();
  // who took it: little dots on top
  if (front) for (const k of [0, 1]) if (g.got[k]) { ctx.fillStyle = PCOL[k]; circle(x - 5 + k * 10, g.y - r - 12, 4); ctx.fill(); }
}
function ppDrawBird(st, o, s) {
  const x = ppSX(st, s.cx), y = s.cy, t = st.t, hit = o.hitT < 1.2;
  const col = { chick: '#ffd94a', pigeon: '#b9b5d8', gull: '#ffffff', pink: '#ff9ccf' }[o.kind] || '#ffd94a';
  const wing = { chick: '#f2b63a', pigeon: '#8f8ab8', gull: '#c9cfe0', pink: '#e27ab2' }[o.kind] || '#f2b63a';
  ctx.save(); ctx.translate(x, y + (hit ? -o.hitT * 30 : 0)); if (hit) ctx.rotate(Math.sin(o.hitT * 14) * 0.4);
  ctx.fillStyle = col; ctx.strokeStyle = 'rgba(60,50,90,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const flap = Math.sin(t * (hit ? 30 : 12) + o.ph);
  ctx.fillStyle = wing; ctx.beginPath(); ctx.moveTo(2, -2); ctx.quadraticCurveTo(10, -14 * flap - 6, 18, -10 * flap - 2); ctx.quadraticCurveTo(10, 2, 2, 4); ctx.fill();
  ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-23, 1); ctx.lineTo(-15, 4); ctx.fill();
  ctx.fillStyle = C.ink; circle(-8, -4, 2.2); ctx.fill(); ctx.fillStyle = '#fff'; circle(-7.3, -4.7, 0.8); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(-6, 3, 2.2); ctx.fill();
  ctx.restore();
}
function ppDrawObstacle(st, o) {
  const s = ppShapes(o, st.rt), sp = ppSpan(o), gy = PP.groundY;
  if (ppSX(st, sp[1]) < -60 || ppSX(st, sp[0]) > W + 60) { if (o.k !== 'kite' && o.k !== 'bird') return; }
  const t = st.t, hit = o.hitT < 0.6 ? Math.sin(o.hitT * 20) * (0.6 - o.hitT) : 0;
  switch (o.k) {
    case 'bird': { if (ppSX(st, s.cx) < -40 || ppSX(st, s.cx) > W + 40) return; ppDrawBird(st, o, s); break; }
    case 'balloon': {
      const x = ppSX(st, o.x) + hit * 10, y = s.cy;
      ctx.strokeStyle = 'rgba(80,70,110,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y + 20);
      for (let k = 1; k <= 6; k++) ctx.lineTo(x + Math.sin(t * 2 + k + o.ph) * 3, y + 20 + k * 11); ctx.stroke();
      ctx.fillStyle = PP_BCOL[o.col]; ctx.beginPath(); ctx.ellipse(x, y, 18, 21, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 4, y + 22); ctx.lineTo(x + 4, y + 22); ctx.lineTo(x, y + 18); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(x - 6, y - 8, 4, 7, -0.4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'kite': {
      const x = ppSX(st, s.cx), y = s.cy, ax = x - 160, cols = [['#ff8fc7', '#ffe680'], ['#8fe3b0', '#b28dff'], ['#ffd94a', '#ff8fa0']][o.col];
      if (x < -200 || ax > W + 40) return;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y + 22); ctx.quadraticCurveTo(x - 60, y + 160, ax, gy); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.3 + o.ph) * 0.15 + hit);
      ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(18, 0); ctx.lineTo(0, 24); ctx.lineTo(-18, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(18, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(-18, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.ink; circle(-5, -4, 1.8); ctx.fill(); circle(5, -4, 1.8); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 1, 4, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 24);
      for (let k = 1; k <= 4; k++) ctx.lineTo(Math.sin(t * 3 + k) * 6 - k * 3, 24 + k * 12); ctx.stroke();
      for (let k = 1; k <= 3; k++) { ctx.fillStyle = cols[k % 2]; const bx = Math.sin(t * 3 + k) * 6 - k * 3, by = 24 + k * 12; ctx.beginPath(); ctx.moveTo(bx - 5, by - 3); ctx.lineTo(bx + 5, by + 3); ctx.lineTo(bx + 5, by - 3); ctx.lineTo(bx - 5, by + 3); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'tree': {
      const x = ppSX(st, o.x) + hit * 6, y = o.cy;
      ctx.fillStyle = '#9a6a3e'; rr(x - 9, y, 18, gy - y + 4, 4); ctx.fill();
      ctx.fillStyle = '#4fae4a'; circle(x - 26, y + 10, 30); ctx.fill(); circle(x + 26, y + 10, 30); ctx.fill();
      ctx.fillStyle = '#5fc25a'; circle(x, y - 6, 42); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; circle(x - 12, y - 20, 14); ctx.fill();
      ctx.fillStyle = '#ff6f7f'; for (let k = 0; k < 4; k++) { circle(x - 22 + k * 15, y + 4 + (k % 2) * 12, 4); ctx.fill(); }
      break;
    }
    case 'bldg': {
      const x = ppSX(st, o.x), cs = PP_BLDG[o.col];
      ctx.fillStyle = cs[0]; ctx.fillRect(x, o.top, o.w, gy - o.top);
      ctx.fillStyle = cs[1]; ctx.fillRect(x - 4, o.top - 6, o.w + 8, 8);
      ctx.fillStyle = 'rgba(80,90,150,0.55)';
      for (let wy = o.top + 18; wy < gy - 22; wy += 34) for (let wx = x + 14; wx < x + o.w - 20; wx += 30) { rr(wx, wy, 16, 20, 3); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,240,180,0.7)';
      for (let wy = o.top + 18, r = 0; wy < gy - 22; wy += 34, r++) for (let wx = x + 14, c = 0; wx < x + o.w - 20; wx += 30, c++) if (ppHash(o.id * 7 + r, c) < 0.35) { rr(wx, wy, 16, 20, 3); ctx.fill(); }
      if (o.chim) { const chx = x + o.w * 0.7; ctx.fillStyle = '#c9785a'; ctx.fillRect(chx - 11, o.top - 30, 22, 30); ctx.fillStyle = '#9a5a40'; ctx.fillRect(chx - 13, o.top - 34, 26, 6); }
      break;
    }
    case 'blimp': {
      const x = ppSX(st, o.x) + hit * 8, y = o.y + Math.sin(t * 0.8 + o.ph) * 3;
      ctx.fillStyle = '#c3b6f2'; ctx.beginPath(); ctx.ellipse(x, y, 78, 28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a796e0'; ctx.beginPath(); ctx.moveTo(x + 60, y - 6); ctx.lineTo(x + 92, y - 28); ctx.lineTo(x + 86, y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 60, y + 6); ctx.lineTo(x + 92, y + 28); ctx.lineTo(x + 86, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - 14, y - 12, 44, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8f7fd0'; rr(x - 20, y + 24, 40, 12, 5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '15px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SKY ★ FAIR', x - 6, y + 1);
      break;
    }
    case 'mast': {
      const x = ppSX(st, o.x) + hit * 4, cols = ['#ff8fc7', '#ffd94a', '#8fe3b0'];
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 4, o.top + 10); ctx.lineTo(x - 4, gy - 28); ctx.lineTo(x - 52, gy - 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cols[o.col]; ctx.beginPath(); ctx.moveTo(x - 4, gy - 80); ctx.lineTo(x - 4, gy - 28); ctx.lineTo(x - 52, gy - 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 3, o.top, 6, gy - o.top - 16);
      ctx.fillStyle = cols[(o.col + 1) % 3]; ctx.beginPath(); ctx.moveTo(x + 3, o.top); ctx.lineTo(x + 24, o.top + 6); ctx.lineTo(x + 3, o.top + 12); ctx.fill();
      ctx.fillStyle = '#e8eef8'; ctx.beginPath(); ctx.moveTo(x - 62, gy - 24); ctx.lineTo(x + 40, gy - 24); ctx.lineTo(x + 26, gy - 2); ctx.lineTo(x - 52, gy - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cols[o.col]; ctx.fillRect(x - 58, gy - 14, 92, 4);
      break;
    }
    case 'light': {
      const x = ppSX(st, o.x);
      ctx.fillStyle = '#d6cfc0'; ctx.beginPath(); ctx.moveTo(x - 40, gy + 4); ctx.lineTo(x + 40, gy + 4); ctx.lineTo(x + 30, gy - 16); ctx.lineTo(x - 30, gy - 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 24, o.top, 48, gy - o.top - 10);
      ctx.fillStyle = '#ff7a8a'; for (let y = o.top + 20; y < gy - 20; y += 56) ctx.fillRect(x - 24, y, 48, 26);
      ctx.fillStyle = '#5a4a8a'; ctx.fillRect(x - 28, o.top - 6, 56, 8);
      ctx.fillStyle = '#fff3a0'; rr(x - 16, o.top - 30, 32, 24, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,160,' + (0.25 + 0.15 * Math.sin(t * 3)).toFixed(2) + ')'; ctx.beginPath(); ctx.moveTo(x, o.top - 18); ctx.lineTo(x - 160, o.top - 50); ctx.lineTo(x - 160, o.top + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.moveTo(x - 22, o.top - 30); ctx.lineTo(x, o.top - 50); ctx.lineTo(x + 22, o.top - 30); ctx.closePath(); ctx.fill();
      break;
    }
    case 'tower': {
      const x = ppSX(st, o.x), cols = [['#c9bdf0', '#a99be0'], ['#f2c9e4', '#d9a3c8'], ['#cfe6fb', '#a9c8ea']][o.col];
      ctx.fillStyle = cols[0]; ctx.fillRect(x - 34, o.top, 68, gy - o.top + 8);
      ctx.fillStyle = cols[1]; for (let y = o.top + 14; y < gy; y += 22) for (let k = 0; k < 3; k++) ctx.fillRect(x - 30 + k * 22 + ((y / 22) % 2) * 8, y, 14, 3);
      ctx.fillStyle = '#5a4a8a'; rr(x - 8, o.top + 20, 16, 22, 8); ctx.fill();
      ctx.fillStyle = '#ff8fc7'; ctx.beginPath(); ctx.moveTo(x - 40, o.top + 2); ctx.lineTo(x, o.top - 44); ctx.lineTo(x + 40, o.top + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, o.top - 44); ctx.lineTo(x, o.top - 62); ctx.stroke();
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x, o.top - 62); ctx.lineTo(x + 18 + Math.sin(t * 6 + o.ph) * 3, o.top - 57); ctx.lineTo(x, o.top - 52); ctx.fill();
      break;
    }
    case 'hang': {
      // a big sleepy cloud hanging down from the ceiling
      const x = ppSX(st, o.x) + hit * 8, b = o.bottom + Math.sin(t * 1.1 + o.ph) * 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 34, 0, 68, b - 40);
      circle(x - 22, b - 36, 26); ctx.fill(); circle(x + 22, b - 36, 26); ctx.fill(); circle(x, b - 30, 30); ctx.fill();
      circle(x - 34, b - 70, 20); ctx.fill(); circle(x + 34, b - 74, 20); ctx.fill();
      ctx.fillStyle = 'rgba(180,165,235,0.35)'; ctx.beginPath(); ctx.arc(x, b - 30, 30, 0.3, Math.PI - 0.3); ctx.fill();
      ctx.strokeStyle = '#7a6ab0'; ctx.lineWidth = 2;
      for (const ex of [-11, 11]) { ctx.beginPath(); ctx.arc(x + ex, b - 40, 5, 0.2, Math.PI - 0.2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,140,170,0.5)'; circle(x - 19, b - 30, 4); ctx.fill(); circle(x + 19, b - 30, 4); ctx.fill();
      ctx.fillStyle = '#7a6ab0'; ctx.font = '14px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const z = (t * 0.6 + o.ph) % 1; ctx.globalAlpha = 1 - z; ctx.fillText('z', x + 34 + z * 16, b - 50 - z * 24); ctx.globalAlpha = 1;
      break;
    }
  }
}
function ppDrawSlingshot(st, slot) {
  const x = ppSX(st, PP.startX), y = PP.startY[slot], gy = PP.groundY;
  if (x < -80) return;
  // a cloud pillar with a wooden Y fork on top
  ctx.fillStyle = '#ffffff'; rr(x - 70, y + 34, 60, gy - y - 30, 14); ctx.fill();
  circle(x - 40, y + 36, 24); ctx.fill();
  ctx.fillStyle = 'rgba(178,160,230,0.3)'; ctx.fillRect(x - 70, gy - 10, 60, 14);
  ctx.strokeStyle = '#a06a3a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 40, y + 40); ctx.lineTo(x - 40, y + 14); ctx.lineTo(x - 26, y - 12); ctx.moveTo(x - 40, y + 14); ctx.lineTo(x - 54, y - 12); ctx.stroke();
  ctx.lineCap = 'butt';
}
function ppDrawFinish(st) {
  const c = st.course, x = ppSX(st, c.len);
  if (x < -200 || x > W + 200) return;
  // a big cloud arch with a rainbow banner, the finish line through it
  const cols = ['#ff8fa0', '#ffc070', '#ffe680', '#a8e89a', '#8fd0ff', '#b9a0ff'];
  ctx.lineWidth = 12;
  cols.forEach((col, i) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, PP.groundY + 40, 330 - i * 12, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); });
  // the checkered line
  for (let y = 70, k = 0; y < PP.groundY; y += 16, k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#5a4a8a'; ctx.fillRect(x - 6, y, 6, 16); ctx.fillStyle = k % 2 ? '#5a4a8a' : '#ffffff'; ctx.fillRect(x, y, 6, 16); }
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, r] of [[-30, PP.groundY - 4, 30], [20, PP.groundY - 10, 36], [60, PP.groundY - 2, 26], [-20, 78, 30], [26, 84, 34]]) { circle(x + dx, dy, r); ctx.fill(); }
  ctx.save(); ctx.translate(x + 2, 128);
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-52, -16, 104, 32, 16); ctx.fill();
  text('FINISH', 0, 1, 20, C.gold, 'center');
  ctx.restore();
}
function ppDrawWorld() {
  const st = G.mst; if (!st.course || !st.cam) return;
  ppDrawSky(st);
  for (const u of st.course.ups) ppDrawUpdraft(st, u);
  ppDrawFinish(st);
  for (const o of st.course.obs) if (o.k !== 'hang') ppDrawObstacle(st, o);
  ppDrawGround(st);
  ppDrawSlingshot(st, 0); ppDrawSlingshot(st, 1);
  for (const g of st.course.rings) ppDrawRingHalf(st, g, false);
  ppDrawCeiling(st);
  for (const o of st.course.obs) if (o.k === 'hang') ppDrawObstacle(st, o);
}

/* ---------- drawing: Pip and Bo on their paper planes ---------- */
// a little Pip or Bo sitting on the plane (their game look: Pip orange with her sprout, Bo blue with round ears)
function ppDrawRider(k, mood, s, scarfT) {
  const col = PCOL[k], dk = PDARK[k];
  ctx.save(); ctx.scale(s, s);
  // the scarf flapping out behind
  ctx.fillStyle = k ? '#ffd36b' : '#ffffff';
  ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-18, -10 + Math.sin(scarfT * 14) * 3, -28, -6 + Math.sin(scarfT * 14 + 1) * 5);
  ctx.lineTo(-27, -1 + Math.sin(scarfT * 14 + 1.5) * 5); ctx.quadraticCurveTo(-16, -4, -6, -3); ctx.closePath(); ctx.fill();
  if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; for (const ex of [-7, 7]) { circle(ex, -22, 4.4); ctx.fill(); ctx.stroke(); } }
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2.2;
  rr(-10, -22, 20, 22, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-7, -19, 7, 8, 3); ctx.fill();
  if (k === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(1, -28); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, -29, 5.5, 2.6, -0.5, 0, Math.PI * 2); ctx.fill(); }
  const ey = -13;
  if (mood === 'joy') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
    for (const ex of [-3, 6]) { ctx.beginPath(); ctx.arc(ex, ey + 1, 2.4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.fillStyle = 'rgba(90,30,40,0.85)'; ctx.beginPath(); ctx.arc(1.5, ey + 5, 3.4, 0, Math.PI); ctx.fill();
  } else if (mood === 'dizzy') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
    for (const ex of [-3, 6]) { ctx.beginPath(); ctx.moveTo(ex - 2.2, ey - 2.2); ctx.lineTo(ex + 2.2, ey + 2.2); ctx.moveTo(ex + 2.2, ey - 2.2); ctx.lineTo(ex - 2.2, ey + 2.2); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(1.5, ey + 6, 2, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    for (const ex of [-3, 6]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 2.8, mood === 'grit' ? 2 : 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex + 1, ey + 0.4, 1.5); ctx.fill();
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath();
    if (mood === 'wow') { ctx.ellipse(1.5, ey + 6, 2, 2.6, 0, 0, Math.PI * 2); } else ctx.arc(1.5, ey + 4, 2.6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-6, ey + 5, 1.8); ctx.fill(); circle(9, ey + 5, 1.8); ctx.fill();
  // a hand holding on to the fold
  ctx.strokeStyle = dk; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(7, -8); ctx.lineTo(13, -1); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.restore();
}
// the paper plane side-on, nose to the right, at the origin; o: wob (crumple), flap (0..1 just flapped), gold, ghost
function ppDrawPaper(k, o) {
  const main = k ? '#6fa3ff' : '#ff7d5a', light = k ? '#a9c8ff' : '#ffb39a', dark = k ? '#3f6fd0' : '#c9533a';
  const sq = o.wob > 0 ? 1 - 0.25 * Math.abs(Math.sin(o.wob * 22)) : 1, flap = o.flap;
  ctx.save(); ctx.scale(1, sq);
  // the keel (the folded part under the wing)
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(34, 1); ctx.lineTo(-28, 0); ctx.lineTo(-22, 11); ctx.closePath(); ctx.fill();
  ctx.fillStyle = main; ctx.beginPath(); ctx.moveTo(34, 1); ctx.lineTo(-22, 1); ctx.lineTo(-24, 9); ctx.closePath(); ctx.fill();
  // the wing (flaps up a little on a flap)
  const wy = -11 - flap * 9;
  ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(-30, wy); ctx.lineTo(-22, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(-30, wy); ctx.lineTo(-22, 0); ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-24, wy * 0.45); ctx.stroke();
  if (o.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(-30, wy); ctx.stroke(); }
  ctx.restore();
}
function ppDrawPlane(st, P) {
  const x = ppSX(st, P.x), y = P.y;
  if (x < -80 || x > W + 80) return;
  let ang = P.ang;
  if (P.phase === 'hold') ang = -0.22;
  if (P.stallT > 0) ang += Math.sin(st.t * 18) * 0.18;
  if (P.wobT > 0) ang += Math.sin(P.wobT * 26) * 0.25 * (P.wobT / PP.wobT);
  const back = P.phase === 'hold' ? -26 * P.power : 0;
  ctx.save(); ctx.translate(x + back, y);
  // a soft gold glow round a plane with gold wings or a tailwind
  if (P.wings || P.tail) {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 56);
    g.addColorStop(0, 'rgba(255,214,90,0.55)'); g.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = g; circle(0, 0, 56); ctx.fill();
  }
  if (P.immT > 0) ctx.globalAlpha = 0.55 + 0.3 * Math.sin(st.t * 30);
  ctx.scale(PP.drawS, PP.drawS);
  ctx.rotate(ang);
  const flap = P.flapT < 0.35 ? Math.sin(P.flapT / 0.35 * Math.PI) : 0;
  let mood = 'happy';
  if (P.stallT > 0 || P.wobT > 0) mood = 'dizzy';
  else if (P.cheer > 0 || P.phase === 'done') mood = 'joy';
  else if (P.boostT > 0 || P.sp > 420) mood = 'wow';
  else if (P.phase === 'hold' && P.charging) mood = 'grit';
  ctx.save(); ctx.translate(-2, -4); ppDrawRider(P.k, mood, 0.78, st.t + P.k); ctx.restore();
  ppDrawPaper(P.k, { wob: P.wobT, flap, gold: P.wings });
  ctx.restore();
  ctx.globalAlpha = 1;
  // the slingshot's rubber band
  if (P.phase === 'hold') {
    const fx = ppSX(st, PP.startX);
    ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(fx - 26, y - 12); ctx.lineTo(x + back - 24 * PP.drawS, y + 2); ctx.lineTo(fx - 54, y - 12); ctx.stroke();
  }
}
function ppDrawMeter(st, P) {
  if (P.phase !== 'hold') return;
  const big = ppBig(), x = ppSX(st, P.x) + 66, y = P.y - 6, h = big ? 56 : 70, w = 14;
  const s = big ? 1.25 : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(-w / 2, -h / 2, w, h, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,197,61,0.45)'; rr(-w / 2, -h / 2, w, h * (1 - PP.perfect), 4); ctx.fill();
  const f = P.power, col = f >= PP.perfect ? C.gold : PCOL[P.k];
  if (f > 0) { ctx.fillStyle = col; rr(-w / 2, h / 2 - h * f, w, h * f, 4); ctx.fill(); }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w / 2 - 4, -h / 2 + h * (1 - PP.perfect)); ctx.lineTo(w / 2 + 4, -h / 2 + h * (1 - PP.perfect)); ctx.stroke();
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(w / 2 + 6, -h / 2 + 4); ctx.lineTo(w / 2 + 13, -h / 2 - 1); ctx.lineTo(w / 2 + 13, -h / 2 + 9); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function ppDrawTop() {
  const st = G.mst, m = G.match; if (!st.course || !st.cam || !st.pl) return;
  const big = ppBig();
  // the trailing plane first, so the leader is on top
  const order = st.pl[0].x < st.pl[1].x ? [st.pl[0], st.pl[1]] : [st.pl[1], st.pl[0]];
  for (const P of order) ppDrawPlane(st, P);
  for (const g of st.course.rings) ppDrawRingHalf(st, g, true);
  for (const P of st.pl) ppDrawMeter(st, P);
  for (const f of st.vis.fx) {
    const a = clamp(f.life / f.max, 0, 1), x = ppSX(st, f.x);
    if (x < -20 || x > W + 20) continue;
    ctx.globalAlpha = a; ctx.fillStyle = f.col;
    if (f.kind === 'spark') ppStar(x, f.y, f.size * (0.8 + 0.6 * a));
    else if (f.kind === 'streak') ctx.fillRect(x - 12, f.y - 1, 24 * a + 4, 2.5);
    else if (f.kind === 'leaf') { ctx.save(); ctx.translate(x, f.y); ctx.rotate(f.rot); ctx.beginPath(); ctx.ellipse(0, 0, f.size, f.size * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else { circle(x, f.y, f.size * (0.6 + 0.6 * (1 - a))); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // world pops (Bonk!)
  for (const p of st.vis.pops) { const k = p.t / 1.1; ctx.globalAlpha = 1 - k * k; bigText(p.text, clamp(ppSX(st, p.x), 50, W - 50), p.y - 20 * k, big ? 26 : 20, p.col, 1 + 0.3 * Math.max(0, 1 - p.t * 6)); ctx.globalAlpha = 1; }
  // pops over each plane
  for (const P of st.pl) if (P.popT < 1.3 && P.pop) {
    const k = P.popT / 1.3, fs = P.popBig ? (big ? 26 : 20) : (big ? 22 : 16);
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(P.pop).width * 1.1 + 8;
    let y = P.y - 56 - 18 * k;
    const other = st.pl[1 - P.k];
    if (other.popT < 1.3 && other.pop && Math.abs(other.x - P.x) < 200 && Math.abs(other.y - P.y) < 40) y += P.y <= other.y ? -24 : 24;
    const x = clamp(ppSX(st, P.x), w / 2 + 8, W - w / 2 - 8);
    ctx.globalAlpha = 1 - k * k;
    bigText(P.pop, x, clamp(y, (G.matchHudBox ? G.matchHudBox.y1 : 44) + 40, H - 70), fs, P.popCol, 1 + 0.25 * Math.max(0, 1 - k * 5));
    ctx.globalAlpha = 1;
  }
  // name tags through the intro card, "Round N" and 3-2-1 (and while each plane sits in its slingshot)
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
  for (const P of st.pl) {
    const a = P.phase === 'hold' && m && m.phase === 'live' ? 1 : tagA;
    if (a <= 0) continue;
    const cpu = ppCpu(P.k), hw = cpu ? 32 : 20, x = Math.max(ppSX(st, P.x) - 80, hw * 2 + 18), y = P.y - 6;
    ctx.globalAlpha = a; ctx.fillStyle = PCOL[P.k]; rr(x - hw * 2 - 10, y - 11, hw * 2, 20, 10); ctx.fill();
    text(cpu ? NAMES[P.k] + ' · CPU' : NAMES[P.k], x - hw - 10, y - 0.5, 13, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
}
function ppStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr0 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr0, y + Math.sin(a) * rr0); }
  ctx.closePath(); ctx.fill();
}

/* ---------- HUD ---------- */
// each player's own keys (none for the computer)
function ppKeys(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (k === 'pad') return { act: glyph('act'), tilt: 'stick ▲ ▼' };
  if (k === 'touch') return { act: 'throw', tilt: '▲ ▼', touch: true };   // (the round button's own word)
  if (typeof cpuSolo === 'function' && cpuSolo()) return { act: 'F or /', tilt: 'W S or ↑ ↓' };
  return id === 0 ? { act: 'F', tilt: 'W S' } : { act: '/', tilt: '↑ ↓' };
}
function ppChip(label, x, y, big, col, gold) {
  const fs = big ? 21 : 13, h = big ? 36 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), cx = clamp(x, w / 2 + 6, W - w / 2 - 6), cy = clamp(y, h / 2 + 4, H - h / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, cy + 0.5, fs, gold ? C.gold : C.paper, 'center', 'body');
}
// a tiny paper plane icon (a flap left)
function ppFlapIcon(x, y, s, k, on, gold) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = !on ? 'rgba(255,255,255,0.18)' : gold ? C.gold : (k ? '#a9c8ff' : '#ffb39a');
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-8, -6); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = !on ? 'rgba(255,255,255,0.12)' : gold ? C.goldDark : PCOL[k];
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, 0); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function ppHud() {
  const st = G.mst, m = G.match; if (!st.pl || !st.course || !m) return;
  const big = ppBig(), sz = big ? 1.45 : 1, c = st.course;
  // bottom corners: each pilot's panel: name, speed bar, flaps left, what is happening
  for (const P of st.pl) {
    const left = P.k === 0, pw = 222 * sz, ph = 40 * sz, y = H - 6 - ph, x = left ? 10 : W - 10 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (P.gold || P.tail) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    const nx = left ? x + 16 * sz : x + pw - 16 * sz;
    text(NAMES[P.k], nx, y + ph / 2 + 0.5, 18 * sz, PCOL[P.k], left ? 'left' : 'right');
    // the speed bar
    const bx = left ? x + 56 * sz : x + pw - 56 * sz - 70 * sz, by = y + ph * 0.3, bw = 70 * sz, bh = 7 * sz;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
    const f = P.phase === 'hold' ? P.power : clamp((P.sp - PP.minSp) / (PP.maxSp - PP.minSp), 0, 1);
    if (f > 0.02) { ctx.fillStyle = P.boostT > 0 || P.tail ? C.gold : PCOL[P.k]; rr(bx, by, Math.max(bh, bw * f), bh, bh / 2); ctx.fill(); }
    // flaps left
    const total = PP.flaps + P.goldFlaps;
    const gap = total > 3 ? 16 : 21, is = total > 3 ? 0.95 : 1.15;   // (gold flaps: closer, so they clear the speed bar)
    for (let i = 0; i < total; i++) {
      const ix = left ? x + pw - (20 + i * gap) * sz : x + (20 + i * gap) * sz;
      ppFlapIcon(ix, y + ph * 0.5, is * sz, P.k, i < P.flaps, i >= PP.flaps);
    }
    // the status line under the speed bar
    let lab = '', col = 'rgba(246,239,223,0.8)';
    if (P.phase === 'hold') { lab = m.phase === 'live' ? (P.charging ? 'Let go at the top!' : 'Hold to throw') : 'Ready...'; col = m.phase === 'live' ? C.gold : col; }
    else if (P.phase === 'done' || st.res && st.res.winner === P.k) lab = st.res && st.res.winner === P.k ? 'Winner!' : 'Finished';
    else if (P.tail) { lab = 'Gold tailwind!'; col = C.gold; }
    else if (P.stallT > 0) lab = 'Stall!';
    else if (P.skidT > 0) lab = 'Skid!';
    else if (P.boostT > 0) { lab = 'Zoom!'; col = C.gold; }
    else if (P.wings) { lab = 'Gold wings'; col = C.gold; }
    else lab = Math.round(P.sp) + ' speed';
    text(lab, bx + bw / 2, y + ph * 0.7, 11 * sz, col, 'center', 'body');
  }
  // the course progress bar at the bottom middle: start, finish arch, the two planes
  {
    const x0 = W / 2 - (big ? 118 : 210), x1 = W / 2 + (big ? 118 : 210), y = H - (big ? 36 : 24);
    if (!big || true) {
      ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(x0 - 12, y - 11, x1 - x0 + 24, 22, 11); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(x0, y - 2, x1 - x0, 4, 2); ctx.fill();
      for (const u of c.ups) { const a = x0 + (x1 - x0) * clamp(u.x0 / c.len, 0, 1), b = x0 + (x1 - x0) * clamp(u.x1 / c.len, 0, 1); ctx.fillStyle = 'rgba(255,214,120,0.6)'; ctx.fillRect(a, y - 3, Math.max(2, b - a), 6); }
      ctx.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#5a4a8a' : '#fff'; ctx.fillRect(x1 - 2, y - 8 + k * 5, 4, 5); }
      for (const P of [st.pl[1], st.pl[0]]) {
        const px = x0 + (x1 - x0) * clamp((P.x - PP.startX) / (c.len - PP.startX), 0, 1);
        ppFlapIcon(px, y + (P.k ? 4 : -4), 1.3 * (big ? 1.2 : 1), P.k, true, false);
      }
    }
  }
  // the course name, top left under the level pill
  {
    const fs = big ? 17 : 13, h = big ? 32 : 26, y0 = 46;
    const lab = c.name + (st.round >= 5 ? '  ·  the final!' : '');
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + (big ? 34 : 28); pill(14, y0, w, h); text(lab, 14 + (big ? 17 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  const box = G.matchHudBox;
  if (m.phase === 'live') {
    // each person's keys: the throw while in the slingshot; the flying keys early in rounds 1-2 (never the computer's)
    for (const P of st.pl) {
      if (ppCpu(P.k)) continue;
      const kk = ppKeys(P.k), left = P.k === 0, ph = 40 * sz, cxp = left ? 10 + 222 * sz / 2 : W - 10 - 222 * sz / 2, y = H - 6 - ph - (big ? 28 : 18);
      if (P.phase === 'hold') ppChip(NAMES[P.k] + ': hold ' + kk.act + ', let go at the top!', cxp, y, big, PCOL[P.k], true);
      else if (P.phase === 'fly' && st.round <= 2 && P.flyT < 7) ppChip(kk.tilt + ' tilt  ·  ' + (kk.touch ? 'tap flap' : kk.act + ' to flap') + ' (' + P.flaps + ' left)', cxp, y, big, PCOL[P.k], false);
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the round card, between the match pill and the framework's Round banner and 3-2-1 pill
    const nf = big ? 32 : 22, hf = big ? 21 : 14;
    ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';   // (as text() draws it)
    const w = Math.min(W - 20, Math.max(big ? 380 : 320, ctx.measureText(c.hint).width + 44));
    // (below the framework's 3-2-1 circle, which ends at y 274; the round clock sits under the match pill)
    const ch = big ? 74 : 50, gold = st.pl.some(P => P.gold), yy = big ? 286 : 290;
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1, cx = W / 2;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(cx - w / 2, yy, w, ch, 14); ctx.fill();
    ctx.strokeStyle = gold ? C.gold : 'rgba(246,239,223,0.25)'; ctx.lineWidth = 2; rr(cx - w / 2, yy, w, ch, 14); ctx.stroke();
    text(c.name, cx, yy + ch * 0.33, nf, C.gold, 'center'); text(c.hint, cx, yy + ch * 0.74, hf, C.paper, 'center', 'body');
    ctx.globalAlpha = a;
    for (const P of st.pl) {
      const left = P.k === 0, ph = 40 * sz, cxp = left ? 10 + 222 * sz / 2 : W - 10 - 222 * sz / 2;
      let y = H - 6 - ph - (big ? 28 : 18);
      if (!ppCpu(P.k) && m.round <= 2) {
        const kk = ppKeys(P.k);
        ppChip(kk.touch ? NAMES[P.k] + ': hold throw, let go at the top!' : big ? NAMES[P.k] + ': hold ' + kk.act + ' to throw' : NAMES[P.k] + ': hold ' + kk.act + ' to throw · ' + kk.tilt + ' tilt', cxp, y, big, PCOL[P.k], false);
        y -= big ? 44 : 28;
      }
      if (P.gold) ppChip(P.wings ? 'Gold for ' + NAMES[P.k] + ': gold wings + 2 gold flaps!' : 'Gold for ' + NAMES[P.k] + ': a gold flap!', cxp, y, big, C.gold, true);
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- sounds ---------- */
Sfx.extra.paperplaneThrow = function (p) { this.tone(300 * p, 0.25, 'sawtooth', 0.02, 900 * p); this.tone(600 * p, 0.2, 'triangle', 0.03, 1200 * p, 0.05); };
Sfx.extra.paperplanePerfect = function (p) { [784, 988, 1319].forEach((f, i) => this.tone(f * p, 0.1, 'triangle', 0.045, null, 0.08 + i * 0.06)); };
Sfx.extra.paperplaneFlap = function (p) { this.tone(500 * p, 0.08, 'triangle', 0.04, 800 * p); this.tone(260 * p, 0.1, 'sine', 0.03, 420 * p, 0.03); };
Sfx.extra.paperplaneNope = function (p) { this.tone(300 * p, 0.08, 'triangle', 0.03, 240 * p); };
Sfx.extra.paperplaneRing = function (p) { [988, 1319, 1760].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.045, null, i * 0.04)); };
Sfx.extra.paperplaneBump = function (p) { this.tone(240 * p, 0.12, 'triangle', 0.05, 140 * p); this.tone(520 * p, 0.06, 'square', 0.015, 300 * p, 0.03); };
Sfx.extra.paperplaneTweet = function (p) { this.tone(1800, 0.06, 'sine', 0.04, 2400); this.tone(2000, 0.07, 'sine', 0.035, 2600, 0.09); this.tone(220 * p, 0.1, 'triangle', 0.04, 150 * p); };
Sfx.extra.paperplaneSkid = function (p) { this.tone(160 * p, 0.2, 'sawtooth', 0.02, 90 * p); this.tone(420 * p, 0.15, 'triangle', 0.035, 700 * p, 0.12); };
Sfx.extra.paperplaneStall = function (p) { this.tone(500 * p, 0.3, 'triangle', 0.035, 220 * p); };
Sfx.extra.paperplaneBonk = function () { this.tone(330, 0.08, 'square', 0.03, 220); this.tone(280, 0.1, 'triangle', 0.04, 200, 0.04); };
Sfx.extra.paperplaneGold = function () { this.tone(784, 0.1, 'triangle', 0.05); this.tone(1046, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318, 0.16, 'triangle', 0.04, null, 0.16); };
Sfx.extra.paperplaneFinish = function (p) { [523, 659, 784, 1047].forEach((f, i) => this.tone(f * p, 0.14, 'triangle', 0.05, null, i * 0.07)); };
