/* Pip & Bo - Level 22-4 Dolphin Race (versus, World 22 Coral Deep). */
'use strict';

/* ===== 22-4 Dolphin Race (mode 'dolphinrace', versus, best of 5, scrolls sideways) =====
   Gavyn's pick: "Race riding dolphins, leap through hoops for speed boosts; bumping into seaweed slows you down. First
   to the finish wins the round."
   def.ownStep: the mode runs the whole live tick, the camera and the picture. The platformer bodies are hidden (alive
   false) and the mode draws Pip and Bo riding their own dolphins side-on (Pip on a lilac dolphin with an orange saddle,
   Bo on a teal one with a blue saddle; each rider wears a bubble helmet underwater).
   All positions are in course coordinates: x runs from the start rope (x 150) to the finish arch (course.len), y is the
   screen's own y: sky above the water surface (DLR.surf), the sea below it down to the sandy seabed (DLR.bed). The
   camera only scrolls sideways.
   A round (after the framework's Round N card and 3-2-1, while both dolphins bob at the start rope, one lane near the
   surface and one deeper; the lanes swap every round):
     swim   the dolphins swim right by themselves (cruise 255 px/s). ▲ (W / ↑ / Space / stick up / A / touch ▲) swims up,
            ▼ (S / ↓ / stick down / touch ▼) dives; let go and the dolphin drifts back to its own lane (the start lane: one just under
            the surface, one a little deeper; they swap every round). Coming up fast (holding ▲ from below) pops out of the water in a little hop.
     leap   the action (F or E / / . , Enter / X Y RB RT / the round touch button "leap") is a big tail flick: the dolphin
            rushes up (from 450 px/s, faster the longer it rushes, up to 640) and leaps out of the water, so a leap
            from deeper down goes higher: about 80 px from just under the surface, up to about 160 px from 100+ px
            down. It refills in 1.6 s (a ring on your panel). Pressed in the air it's a flip: just for show (and the results card counts them). The first leap
            within 0.6 s of "GO!" is a "Great start!" (+120 px/s for a moment).
            A big leap (over 100 px) lands with a splash that costs a little speed (4%), so leaping all the time isn't the fastest.
     hoops  gold hoops float above the water (low ones just over the surface: any hop goes through; high ones need a
            leap from a little deeper, at the right moment). Through a hoop: +145 px/s that holds for 0.85 s ("Splash boost!"). Each player
            can take each hoop once.
            Fast currents (rows of bubbles and arrows, usually deep down) add +90 px/s while you swim in them.
     bumps  seaweed (tall green strands from the seabed: "Tangled!"), kelp gates (kelp from the seabed and a floating
            kelp mat at the top, slip through the gap or leap over the mat), buoys, rocks, sleepy turtles, little
            sailboats (dive under them) and gulls (in the air) are bumps: you keep half your speed (at least 90 px/s), get
            nudged away, wobble and swim through for 0.9 s. A bump never ends a round; nobody gets hurt (turtles yawn,
            gulls flap off, buoys bob). Dolphins that touch go "Bonk!" and are nudged apart (3% speed, once
            every 1.6 s at most).
     finish the first dolphin through the finish arch (x >= course.len) wins the round ("First through the coral arch!"
            under the framework's "Pip wins the round!"). Both in the same tick: the one farther past it; level: a tie.
     time   the round clock is 70 s (def.match.roundTime): the dolphin farther along wins; within 12 px it's a tie.
   Rounds (each its own course, built fresh from tokens every round with MODES.dolphinrace.rand):
     1 Lagoon Splash (buoys, seaweed, lots of low hoops), 2 Reef Run (rocks, sleepy turtles, deep currents between the
     rocks), 3 Kelp Maze (kelp gates: find the gap), 4 Sunset Bay (sailboats to dive under, buoys, gulls over the
     water), 5 Grand Final (a bit of everything, the longest). A replayed round gets a fresh layout of the same course.
     tiebreak(): more hoops this match, else replay.
   The camera follows the leader (at 60% of the screen) but never leaves the trailer behind: the trailer stays at least
   90 px in from the left edge, and the leader at most 110 px (never under 60 px) from the right edge. If the gap would
   put the leader off the right side, the trailer is pulled along at the left edge. A trailer within 150 px of the left
   edge (and 450+ px behind) gets a gold current (+40 px/s), announced over the dolphin and on the panel.
   Catch-up help, gold and announced (round card, panel border, panel line): 1 round behind = gold fins (the leap
   refills in 1.0 s and hoops give 25% more); 2+ behind = gold fins and a gold head start (+150 px/s for 1.5 s at GO).
   Off in sudden death.
   Soft fails only. Every top-level name is prefixed dlr / DLR, every sound Sfx.extra.dolphinrace*. Rule randomness
   only from MODES.dolphinrace.rand (Math.random, inside the step); looks use their own dlrVR. */
const DLR = {
  surf: 226, bed: 478, top: 66,               // the water surface, the seabed, the highest a leap can go (centre)
  startX: 150,
  // swimming
  cruise: 255, drag: 0.7, maxSp: 560, minSp: 80, finsCruise: 1.0,
  swimUp: 340, swimDown: 300, swimAcc: 1500, restD: [42, 92], restK: 1.2, restMax: 90,
  surfD: 10, bedD: 18, breach: 220,
  // leaping
  g: 1300, kickV: 450, kickAcc: 1000, kickMax: 640, kickT: 0.55, leapCd: 1.6, leapCdGold: 1.0, splashKeep: 0.96, bigLeap: 100,
  startWin: 0.6, startBoost: 120, startHold: 0.8, goldStart: 150, goldStartT: 1.5,
  // hoops and currents
  hoopR: 30, hoopBoost: 145, hoopHold: 0.85, goldHoop: 1.25, curV: 90,
  // bumps
  bumpKeep: 0.5, bumpMin: 90, bumpImm: 0.9, wobT: 0.6, bodyR: 15, pairDX: 40, pairDY: 24, pairCd: 1.6,
  // camera and the gold current
  camLead: 0.6, camTrail: 90, camRight: 110, camHard: 60, windX: 150, windGap: 450, windV: 40,
  roundTime: 70, timeTie: 12,
};
DLR.startY = [DLR.surf + 26, DLR.surf + 86];   // the two start lanes (near the surface, deeper)
const DLR_COURSES = {
  lagoon: { name: 'Lagoon Splash', hint: 'Hold ▲ to hop through the low hoops. Leap over the buoys!',
    plan: '_ L h _ B L W c h B L H W h B L C W h B L J B h W L c h B L' },
  reef: { name: 'Reef Run', hint: 'Over or under the rocks! Fast currents swirl deep down. Don\'t wake the turtles!',
    plan: '_ L R h T C R L W T h R C L T R h W J R T L C h R T B L R h' },
  kelp: { name: 'Kelp Maze', hint: 'Find the gap in each kelp gate, or leap over the floating kelp!',
    plan: '_ L K h K W L K c K h L K W K h C K L J K h B K L W K h L' },
  sunset: { name: 'Sunset Bay', hint: 'Dive under the sailboats! Mind the gulls when you leap.',
    plan: '_ L B h S B G L W S h G B L S J G B h S L C B G h S L' },
  final: { name: 'Grand Final', hint: 'The final! A bit of everything. Save your leap for the big hoops!',
    plan: '_ L h B R T K S G C W J R K B S h T G L K R C h B S J L' },
};
const DLR_ORDER = ['lagoon', 'reef', 'kelp', 'sunset', 'final'];
// looks-only randomness (bubbles, splashes, sparkles): never MODES.dolphinrace.rand
let dlrVS = 20261122;
const dlrVR = () => { dlrVS = (Math.imul(dlrVS, 1664525) + 1013904223) >>> 0; return dlrVS / 4294967296; };
const dlrHash = (a, b) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
// 1-player mode: the computer rides this dolphin (no key reminders for it)
const dlrCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const dlrBig = () => hudBig();

/* ---------- the course ---------- */
// builds one course from its token plan: hoops, currents (curs) and obstacles (obs), all in course coordinates
function dlrBuildCourse(key, R) {
  const cs = DLR_COURSES[key], c = { key, name: cs.name, hint: cs.hint, hoops: [], curs: [], obs: [], len: 0 };
  const rr0 = (a, b) => a + R() * (b - a), q = DLR, s = q.surf, b = q.bed;
  let id = 0;
  const hoop = (hx, hy, low) => c.hoops.push({ id: id++, x: hx, y: hy, low: !!low, got: [false, false], gotT: [9, 9] });
  const ob = o => { o.id = id++; o.hitT = 9; o.ph = R() * 6.28; c.obs.push(o); return o; };
  const place = (tk, x0) => {
    switch (tk) {
      case '_': return 220;
      case 'L': hoop(x0 + 120, s - 24, true); return 260;
      case 'h': hoop(x0 + 150, s - rr0(62, 118), false); return 310;
      case 'H': for (let i = 0; i < 3; i++) hoop(x0 + 120 + i * 300, s - 24, true); return 1000;
      case 'J': hoop(x0 + 120, s - 24, true); hoop(x0 + 520, s - rr0(85, 115), false); hoop(x0 + 900, s - 24, true); return 1140;
      case 'B': { const n = R() < 0.5 ? 1 : 2; for (let i = 0; i < n; i++) ob({ k: 'buoy', x: x0 + 130 + i * 150, col: Math.floor(R() * 3) }); return 210 + n * 150; }
      case 'W': {
        const n = 2 + (R() < 0.5 ? 1 : 0);
        for (let i = 0; i < n; i++) ob({ k: 'weed', x: x0 + 110 + i * 110, top: rr0(s + 44, b - 110) });
        return 190 + n * 110;
      }
      case 'R': { const r = rr0(72, 118); ob({ k: 'rock', x: x0 + 60 + r, r, col: Math.floor(R() * 3) }); return 2 * r + 160; }
      case 'T': ob({ k: 'turtle', x: x0 + 170, y: rr0(s + 70, b - 70), drift: rr0(6, 18) }); return 320;
      case 'C': { const w = rr0(560, 760); c.curs.push({ x0: x0 + 30, x1: x0 + 30 + w, y0: b - 84, y1: b - 22 }); return 140; }
      case 'c': { const w = rr0(480, 640), y0 = rr0(s + 70, s + 110); c.curs.push({ x0: x0 + 30, x1: x0 + 30 + w, y0, y1: y0 + 58 }); return 140; }
      case 'K': {
        const gc = rr0(s + 85, b - 70), gap = 104;
        ob({ k: 'gate', x: x0 + 150, gt: gc - gap / 2, gb: gc + gap / 2 });
        return 330;
      }
      case 'S': ob({ k: 'boat', x: x0 + 170, col: Math.floor(R() * 3) }); return 380;
      case 'G': {
        const n = R() < 0.5 ? 1 : 2;
        for (let i = 0; i < n; i++) ob({ k: 'gull', x: x0 + 150 + i * 130, y: s - rr0(48, 122), drift: rr0(10, 30), amp: rr0(8, 16) });
        return 200 + n * 130;
      }
      default: return 0;
    }
  };
  let x = 420;
  for (const tok of cs.plan.split(/\s+/)) {
    if (!tok) continue;
    let w = 0;
    for (const part of tok.split('+')) w = Math.max(w, place(part, x));
    x += w;
  }
  c.len = Math.round(x + 300);
  return c;
}
// where an obstacle is right now (turtles and gulls drift and bob, buoys bob): circles and rects to bump into
function dlrShapes(o, t) {
  const q = DLR, s = q.surf, b = q.bed;
  switch (o.k) {
    case 'buoy': { const y = s - 6 + Math.sin(t * 2.2 + o.ph) * 4; return { c: [[o.x, y, 20]], r: [], cx: o.x, cy: y }; }
    case 'weed': return { c: [], r: [[o.x - 16, o.top, o.x + 16, b + 20]], cx: o.x, cy: o.top };
    case 'gate': return { c: [], r: [[o.x - 22, s - 8, o.x + 22, o.gt], [o.x - 22, o.gb, o.x + 22, b + 20]], cx: o.x, cy: (o.gt + o.gb) / 2 };
    case 'rock': return { c: [[o.x, b + 34, o.r]], r: [], cx: o.x, cy: b + 34 - o.r };
    case 'turtle': { const x = o.x - o.drift * t, y = o.y + Math.sin(t * 0.9 + o.ph) * 10; return { c: [[x, y, 24]], r: [], cx: x, cy: y }; }
    case 'boat': return { c: [], r: [[o.x - 62, s - 16, o.x + 62, s + 24], [o.x - 4, s - 150, o.x + 4, s - 16], [o.x - 52, s - 130, o.x - 4, s - 34]], cx: o.x, cy: s };
    case 'gull': { const x = o.x - o.drift * t, y = o.y + Math.sin(t * 1.8 + o.ph) * o.amp; return { c: [[x, y, 15]], r: [], cx: x, cy: y }; }
    default: return { c: [], r: [], cx: o.x, cy: 0 };
  }
}
// the x range an obstacle can cover (for quick culling)
function dlrSpan(o) {
  switch (o.k) {
    case 'turtle': return [o.x - 30 - o.drift * DLR.roundTime, o.x + 30];
    case 'gull': return [o.x - 24 - o.drift * DLR.roundTime, o.x + 24];
    case 'rock': return [o.x - o.r - 4, o.x + o.r + 4];
    case 'boat': return [o.x - 66, o.x + 66];
    case 'gate': case 'weed': return [o.x - 26, o.x + 26];
    default: return [o.x - 26, o.x + 26];
  }
}
function dlrHitShapes(sh, x, y, r) {
  for (const [cx, cy, cr] of sh.c) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy < (cr + r) * (cr + r)) return true; }
  for (const [x0, y0, x1, y1] of sh.r) { const nx = clamp(x, x0, x1), ny = clamp(y, y0, y1), dx = x - nx, dy = y - ny; if (dx * dx + dy * dy < r * r) return true; }
  return false;
}
// the first obstacle a dolphin at (x, y) touches at round time t (or null)
function dlrHitAt(c, x, y, t) {
  for (const o of c.obs) {
    const sp = dlrSpan(o);
    if (x < sp[0] - 20 || x > sp[1] + 20) continue;
    const sh = dlrShapes(o, t);
    if (dlrHitShapes(sh, x, y, DLR.bodyR)) return { o, sh };
  }
  return null;
}
// is (x, y) in a fast current?
function dlrInCurrent(c, x, y) {
  for (const u of c.curs) if (x > u.x0 && x < u.x1 && y > u.y0 && y < u.y1) return true;
  return false;
}

/* ---------- the dolphins ---------- */
function dlrMakeDolphin(k, slot) {
  return { k, slot, x: DLR.startX, y: DLR.startY[slot], vy: 0, sp: 0, air: false, kickT: 0, leapCd: 0, airY: 0,
    gold: 0, fins: false, boostT: 0, wobT: 0, immT: 0, pairCd: 0, swimT: 0, tail: false, tailSaid: false, pulled: 0,
    started: false, inCur: false, finishT: null, flipT: 9, flips: 0, done: false,
    // looks only
    pop: '', popT: 9, popCol: '#fff', popBig: false, mood: 'happy', cheer: 0, fluke: 0, splashT: 9, up: false, down: false };
}
function dlrPop(D, text, col, big) { D.pop = text; D.popCol = col || '#ffffff'; D.popT = 0; D.popBig = !!big; }
function dlrNewRound(st, n, info, R) {
  const key = st.forceCourse || DLR_ORDER[Math.min(n, DLR_ORDER.length) - 1];
  st.course = dlrBuildCourse(key, R);
  st.round = n;
  // the lane near the surface swaps every round (Pip near the top in odd rounds)
  const hi = (n - 1) % 2;
  st.pl = [0, 1].map(k => dlrMakeDolphin(k, k === hi ? 0 : 1));
  for (const D of st.pl) {
    D.gold = info.suddenDeath || st.noHelp ? 0 : Math.max(0, info.wins[1 - D.k] - info.wins[D.k]);
    D.fins = D.gold >= 1;
  }
  st.ph = 'set'; st.rt = 0; st.res = null; st.ended = false;
  st.cam = { x: 0 };
  st.vis.fx = []; st.vis.pops = [];
}

/* ---------- the tick ---------- */
// pure movement of a dolphin body for one tick (also used by the computer brain to look ahead):
// D = { x, y, vy, sp, air, kickT, tail? }, inp = { up, down } or null. Returns 'breach', 'splash' or ''.
function dlrMoveBody(D, inp, dt) {
  const q = DLR, surfMin = q.surf + q.surfD, bedMax = q.bed - q.bedD;
  let ev = '';
  if (!D.air) {
    if (D.kickT > 0) { D.vy = -Math.min(q.kickMax, q.kickV + q.kickAcc * (q.kickT - D.kickT)); D.kickT -= dt; }
    else {
      const up = inp && inp.up, dn = inp && inp.down;
      const tv = up ? -q.swimUp : dn ? q.swimDown : clamp((q.surf + q.restD[D.slot || 0] - D.y) * q.restK, -q.restMax, q.restMax);
      D.vy = approach(D.vy, tv, q.swimAcc * dt);
    }
    D.y += D.vy * dt;
    if (D.y < surfMin) {
      if (D.vy < -q.breach) { D.air = true; D.kickT = 0; ev = 'breach'; }
      else { D.y = surfMin; if (D.vy < 0) D.vy = 0; }
    }
    if (D.y > bedMax) { D.y = bedMax; if (D.vy > 0) D.vy = 0; }
  } else {
    D.vy += q.g * dt; D.y += D.vy * dt;
    if (D.y < q.top) { D.y = q.top; if (D.vy < 0) D.vy = 0; }
    if (D.vy > 0 && D.y >= surfMin) { D.air = false; D.vy *= 0.5; ev = 'splash'; }
  }
  D.x += (D.sp + (D.tail ? q.windV : 0)) * dt;
  return ev;
}
function dlrLeap(st, D) {
  const q = DLR;
  if (D.air) {
    // in the air the action is a flip: just for show
    if (D.flipT > 0.55) { D.flipT = 0; D.flips++; st.stat.flips[D.k]++; Sfx.play('dolphinraceFlip', D.k); }
    return;
  }
  if (D.leapCd > 0) return;
  D.kickT = q.kickT; D.leapCd = D.fins ? q.leapCdGold : q.leapCd;
  Sfx.play('dolphinraceKick', D.k);
  for (let i = 0; i < 6; i++) dlrFx(st, D.x - 30, D.y + 4, -60 - dlrVR() * 50, (dlrVR() - 0.5) * 60, 0.7, 'rgba(255,255,255,0.8)', 2.5 + dlrVR() * 2, -60, 'bubble');
  if (!D.started && st.rt < q.startWin) {
    D.started = true; st.stat.starts[D.k]++;
    D.sp = Math.max(D.sp, q.cruise) + q.startBoost; D.boostT = Math.max(D.boostT, q.startHold);
    dlrPop(D, 'Great start!', C.gold, true); Sfx.play('dolphinraceGold', D.k);
  }
  D.started = true;
}
function dlrBump(st, D, o, sh) {
  const q = DLR;
  D.sp = Math.max(q.bumpMin, D.sp * q.bumpKeep);
  D.kickT = 0;
  if (D.air) D.vy = Math.max(D.vy, 160);
  else {
    const dir = o.k === 'gate' ? (D.y < (o.gt + o.gb) / 2 ? -1 : 1) : o.k === 'boat' ? 1 : o.k === 'rock' || o.k === 'weed' ? -1 : (D.y < sh.cy ? -1 : 1);
    D.vy = dir * 200;
  }
  D.wobT = q.wobT; D.immT = q.bumpImm; D.boostT = 0;
  o.hitT = 0; o.hitBy = D.k;
  st.stat.bumps[D.k]++;
  const word = { buoy: 'Boing!', weed: 'Tangled!', gate: 'Tangled!', rock: 'Bonk!', turtle: 'Yawn! Sorry, turtle!', boat: 'Thunk!', gull: 'Squawk!' }[o.k] || 'Bonk!';
  dlrPop(D, word, '#ffe6a8', false);
  Sfx.play(o.k === 'weed' || o.k === 'gate' ? 'dolphinraceWeed' : o.k === 'gull' ? 'dolphinraceGull' : 'dolphinraceBump', D.k);
  rumble(D.k, 0.15, 0.4, 120);
  const leafy = o.k === 'weed' || o.k === 'gate', feath = o.k === 'gull';
  for (let i = 0; i < 8; i++) dlrFx(st, D.x + 14, D.y, (dlrVR() - 0.5) * 170, (dlrVR() - 0.7) * 150, 0.8,
    leafy ? (i % 2 ? '#5fc25a' : '#3f9a4c') : feath ? '#ffffff' : 'rgba(255,255,255,0.85)', leafy ? 4.5 : feath ? 4 : 3, leafy || feath ? 40 : -40, leafy || feath ? 'leaf' : 'bubble');
}
function dlrSplashFx(st, D, big) {
  const n = big ? 16 : 8;
  for (let i = 0; i < n; i++) dlrFx(st, D.x + (dlrVR() - 0.5) * 40, DLR.surf - 2, (dlrVR() - 0.5) * 200, -90 - dlrVR() * (big ? 260 : 150), 0.7, i % 3 ? 'rgba(255,255,255,0.95)' : 'rgba(180,240,255,0.95)', 3 + dlrVR() * 3, 700, 'drop');
  D.splashT = 0;
}
// one dolphin's swim for one tick; inp = { up, down } or null (no steering: banners, after the finish)
function dlrSwim(st, D, inp, dt, live) {
  const q = DLR, c = st.course;
  D.swimT += dt;
  D.up = !!(inp && inp.up); D.down = !!(inp && inp.down);
  // speed: drifts to the cruise speed (+ a current), a hoop or start boost holds for a moment; in the air it keeps
  if (!D.air) {
    D.inCur = dlrInCurrent(c, D.x, D.y);
    const target = (D.done ? 300 : q.cruise) + (D.inCur ? q.curV : 0);
    if (!(D.boostT > 0 && D.sp > target)) D.sp += (target - D.sp) * q.drag * dt;
  } else D.inCur = false;
  if (st.ph === 'set') D.sp = 0;
  D.sp = clamp(D.sp, st.ph === 'set' ? 0 : q.minSp, q.maxSp);
  const px = D.x, py = D.y, airY0 = D.y;
  const ev = dlrMoveBody(D, D.done ? null : inp, dt);
  if (D.air) D.airY = Math.min(D.airY, D.y);
  if (ev === 'breach') {
    D.airY = airY0;
    Sfx.play('dolphinraceLeap', D.k); dlrSplashFx(st, D, D.vy < -400);
  } else if (ev === 'splash') {
    const h = q.surf + q.surfD - D.airY;
    if (live && !D.done) {
      if (h > st.stat.best[D.k]) st.stat.best[D.k] = h;
      if (h > q.bigLeap) D.sp *= q.splashKeep;
    }
    Sfx.play('dolphinraceSplash', D.k); dlrSplashFx(st, D, h > q.bigLeap);
  }
  D.leapCd = Math.max(0, D.leapCd - dt); D.wobT = Math.max(0, D.wobT - dt); D.immT = Math.max(0, D.immT - dt);
  D.boostT = Math.max(0, D.boostT - dt); D.pairCd = Math.max(0, D.pairCd - dt); D.flipT += dt;
  if (!live || D.done) return;
  // gold hoops
  for (const g of c.hoops) {
    if (g.got[D.k] || px >= g.x || D.x < g.x) continue;
    const yy = py + (D.y - py) * clamp((g.x - px) / Math.max(0.001, D.x - px), 0, 1);
    if (Math.abs(yy - g.y) <= q.hoopR) {
      g.got[D.k] = true; g.gotT[D.k] = 0;
      D.sp = Math.min(q.maxSp, D.sp + q.hoopBoost * (D.fins ? q.goldHoop : 1)); D.boostT = q.hoopHold;
      st.stat.hoops[D.k]++;
      dlrPop(D, g.low ? 'Hoop!' : 'Splash boost!', C.gold, !g.low); Sfx.play('dolphinraceHoop', D.k);
      for (let i = 0; i < 10; i++) dlrFx(st, g.x, g.y + (dlrVR() - 0.5) * 50, (dlrVR() - 0.3) * 160, (dlrVR() - 0.5) * 160, 0.6, i % 2 ? C.gold : '#ffffff', 3, 0, 'spark');
    }
  }
  // bumps
  if (D.immT <= 0) {
    const h = dlrHitAt(c, D.x, D.y, st.rt);
    if (h) dlrBump(st, D, h.o, h.sh);
  }
}
function dlrEnd(st, winner, reason) {
  if (st.ended) return;
  st.ended = true; st.ph = 'done';
  st.res = { winner, reason };
  if (winner >= 0) { st.stat.wins[winner]++; st.pl[winner].cheer = 1; }
  matchRoundEnd(winner, reason);
}
function dlrTick(dt, live) {
  const st = G.mst, q = DLR, c = st.course;
  st.t += dt;
  if (live) st.rt += dt;
  if (live && st.ph === 'set') st.ph = 'race';
  for (const D of st.pl) {
    const p = G.players[D.k];
    const inp = live ? { up: !!(p.input.jump || p.input.up) && !p.input.down, down: !!p.input.down && !(p.input.jump || p.input.up) } : null;
    if (live && !D.done && p.pendingAct) { p.pendingAct = false; dlrLeap(st, D); }
    dlrSwim(st, D, inp, dt, live);
    if (live && !D.done) {
      st.stat.dist[D.k] = Math.max(st.stat.dist[D.k], D.x);
      if (D.tail) st.stat.tail[D.k] += dt;
    }
  }
  // dolphins that touch: bonk, nudged apart
  const [A, B] = st.pl;
  if (live && !A.done && !B.done && A.pairCd <= 0 && B.pairCd <= 0 &&
      Math.abs(A.x - B.x) < q.pairDX && Math.abs(A.y - B.y) < q.pairDY) {
    const top = A.y <= B.y ? A : B, bot = top === A ? B : A;
    if (!top.air) top.vy = Math.min(top.vy, -180);
    if (!bot.air) bot.vy = Math.max(bot.vy, 180);
    A.sp *= 0.97; B.sp *= 0.97; A.pairCd = B.pairCd = q.pairCd; A.wobT = B.wobT = 0.3;
    st.stat.bonks++;
    dlrWorldPop(st, 'Bonk!', (A.x + B.x) / 2, (A.y + B.y) / 2 - 34, '#ffffff');
    Sfx.play('dolphinraceBonk');
  }
  // the finish arch
  if (live && !st.ended) {
    const done = st.pl.filter(D => !D.done && D.x >= c.len);
    if (done.length) {
      for (const D of done) { D.done = true; D.finishT = st.rt; }
      let w = done[0].k;
      if (done.length === 2) w = Math.abs(A.x - B.x) < 0.5 ? -1 : (A.x > B.x ? 0 : 1);
      if (w >= 0) {
        const t = st.rt;
        if (!(st.stat.fast[w] <= t)) { st.stat.fast[w] = t; st.stat.fastCourse[w] = c.name; }
        Sfx.play('dolphinraceFinish', w);
        dlrEnd(st, w, 'First through the coral arch!');
      } else dlrEnd(st, -1, 'A photo finish! Exactly level!');
    }
  }
  dlrCamera(st, dt, false, live);
  dlrVisTick(st, dt);
  dlrMirror(st);
}

/* ---------- camera ---------- */
// follows the leader, never leaves the trailer behind (it is pulled along at the left edge), a gold current there
function dlrCamera(st, dt, snap, live) {
  const q = DLR, cam = st.cam, c = st.course;
  if (!st.pl || !c) return;
  const xs = st.pl.map(D => D.x), lead = Math.max(xs[0], xs[1]), trail = Math.min(xs[0], xs[1]);
  let want = lead - W * q.camLead;
  want = Math.min(want, trail - q.camTrail);
  want = Math.max(want, lead - (W - q.camRight));
  const maxX = c.len + 160 - W * 0.62;
  want = clamp(want, 0, Math.max(0, maxX));
  const a = snap ? 1 : 1 - Math.exp(-7 * dt);
  cam.x += (want - cam.x) * a;
  if (snap) cam.x = want;
  // (the easing lags a fast leader: never let the leader slip past the right edge)
  cam.x = clamp(Math.max(cam.x, lead - (W - q.camHard)), 0, Math.max(0, maxX));
  for (const D of st.pl) {
    if (D.done || st.ph === 'set') { D.tail = false; continue; }
    const O = st.pl[1 - D.k];
    const edge = cam.x + q.camTrail - 30;
    if (live && D.x < edge && O.x - D.x > q.windGap) { D.pulled += edge - D.x; D.x = edge; }
    const was = D.tail;
    D.tail = live && !st.noHelp && O.x - D.x > q.windGap && D.x - cam.x < q.windX;
    if (D.tail && !was && !D.tailSaid) { D.tailSaid = true; dlrPop(D, 'Gold current!', C.gold, true); Sfx.play('dolphinraceGold', D.k); }
  }
}
// the platformer bodies stay hidden, but p.x / p.y follow the picture (bubbles, confetti fall-backs)
function dlrMirror(st) {
  if (!st.pl || !st.cam) return;
  for (const p of G.players) {
    const D = st.pl[p.id];
    p.x = D.x - st.cam.x - p.w / 2; p.y = D.y - 34 - p.h;
  }
}

/* ---------- looks: effects that never touch the rules ---------- */
function dlrFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot', rot: dlrVR() * 6.28 });
  if (v.fx.length > 360) v.fx.splice(0, v.fx.length - 360);
}
function dlrWorldPop(st, text, x, y, col) { st.vis.pops.push({ text, x, y, t: 0, col: col || '#ffffff' }); }
function dlrVisNew() { return { fx: [], pops: [], t: 0 }; }
function dlrVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  v.t += dt;
  let n = 0;
  for (const f of v.fx) {
    f.life -= dt; f.vx *= Math.exp(-1.6 * dt); f.vy += f.grav * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt * 5;
    if (f.kind === 'bubble' && f.y < DLR.surf + 2) f.life = Math.min(f.life, 0.05);   // bubbles pop at the surface
    if (f.kind === 'drop' && f.y > DLR.surf + 4 && f.vy > 0) f.life = 0;               // drops fall back in
    if (f.life > 0) v.fx[n++] = f;
  }
  v.fx.length = n;
  v.pops = v.pops.filter(p => (p.t += dt) < 1.1);
  for (const g of st.course ? st.course.hoops : []) { g.gotT[0] += dt; g.gotT[1] += dt; }
  for (const o of st.course ? st.course.obs : []) o.hitT += dt;
  for (const D of st.pl || []) {
    D.popT += dt; D.splashT += dt; D.cheer = Math.max(0, D.cheer - dt * 0.4);
    D.fluke += dt * (D.boostT > 0 || D.kickT > 0 ? 18 : D.air ? 4 : 10);
    // bubbles behind a swimming dolphin, gold streaks on a boost or a gold current
    if (!D.air && st.ph !== 'set' && dlrVR() < dt * (D.boostT > 0 ? 26 : 9)) dlrFx(st, D.x - 38, D.y + (dlrVR() - 0.5) * 10, -40 - dlrVR() * 40, -20, 0.9, 'rgba(255,255,255,0.75)', 1.8 + dlrVR() * 2.4, -50, 'bubble');
    if ((D.boostT > 0 || D.tail) && dlrVR() < dt * 24) dlrFx(st, D.x - 50 - dlrVR() * 40, D.y + (dlrVR() - 0.5) * 30, D.tail ? 260 : -120, 0, 0.35, 'rgba(255,214,90,0.9)', 2.5, 0, 'streak');
    if (D.done && D.cheer > 0 && dlrVR() < dt * 10) dlrFx(st, D.x + (dlrVR() - 0.5) * 60, D.y - 30, (dlrVR() - 0.5) * 100, -80 - dlrVR() * 80, 0.9, ['#ffc53d', '#ff8fc7', '#8fe3b0', '#ffffff'][Math.floor(dlrVR() * 4)], 3.5, 160, 'spark');
  }
}

/* ---------- the mode ---------- */
MODES.dolphinrace = {
  rand() { return Math.random(); },
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { wins: [0, 0], hoops: [0, 0], bumps: [0, 0], flips: [0, 0], starts: [0, 0], best: [0, 0], fast: [Infinity, Infinity], fastCourse: ['', ''], dist: [0, 0], tail: [0, 0], bonks: 0 };
    st.forceCourse = this.testCourse || null;
    st.noHelp = !!this.testNoHelp;   // bot tests: no gold help at all (to measure raw skill)
    st.vis = dlrVisNew();
    st.t = 0; st.rt = 0;
  },
  resetRound(n, info) {
    const st = G.mst;
    st.vis = dlrVisNew();
    dlrNewRound(st, n, info, () => this.rand());
    dlrCamera(st, 0, true, false);
    // the dolphins are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
    G.particles.length = 0;
    dlrMirror(st);
  },
  go() {
    const st = G.mst;
    if (G.match) G.match.goT = 0.45;
    st.ph = 'race'; st.rt = 0;
    for (const D of st.pl) {
      D.sp = DLR.cruise * 0.7;
      if (D.gold >= 2) { D.sp = DLR.cruise + DLR.goldStart; D.boostT = DLR.goldStartT; }
      if (D.gold) dlrPop(D, D.gold >= 2 ? 'Gold fins + a gold head start!' : 'Gold fins!', C.gold, true);
    }
  },
  step(dt) { dlrTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.pl) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (m && (m.phase === 'end' || m.phase === 'over')) { dlrTick(dt, false); return; }
    st.t += dt;
    // waiting at the start rope: a gentle bob
    for (const D of st.pl) D.fluke += dt * 4;
    dlrVisTick(st, dt);
    dlrCamera(st, dt, false, false);
    dlrMirror(st);
    if (m && m.phase === 'count' && !st.goldSaid) { st.goldSaid = true; if (st.pl.some(D => D.gold)) Sfx.play('dolphinraceGold'); }
    if (m && m.phase === 'ready') st.goldSaid = false;
  },
  timeUp() {
    const st = G.mst, [A, B] = st.pl, d = A.x - B.x;
    st.ended = true; st.ph = 'done';
    if (Math.abs(d) < DLR.timeTie) { st.res = { winner: -1 }; return { winner: -1, reason: 'Time! Fin and fin!' }; }
    const w = d > 0 ? 0 : 1;
    st.res = { winner: w }; st.stat.wins[w]++; st.pl[w].cheer = 1;
    return { winner: w, reason: 'Time! Swam the farthest!' };
  },
  tiebreak() {
    const r = G.mst.stat.hoops;
    if (r[0] !== r[1]) return { winner: r[0] > r[1] ? 0 : 1, reason: 'More hoops this match!' };
    return -1;
  },
  draw() { dlrDrawWorld(); },
  drawTop() { dlrDrawTop(); },
  hud() { dlrHud(); },
  stats() {
    const st = G.mst, s = st.stat;
    const out = [
      // (the match's own count: a round won on the tiebreak counts too)
      { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
      { label: 'Gold hoops', values: s.hoops.slice() },
      { label: 'Best jump (m)', values: s.best.map(v => (v > 0 ? (v / 30).toFixed(1) : '–')) },
      { label: 'Bumps', values: s.bumps.slice() },
    ];
    const f = s.fast;
    if (isFinite(f[0]) || isFinite(f[1])) {
      const w = !isFinite(f[1]) || f[0] < f[1] ? 0 : 1;
      out.push('Fastest round: ' + NAMES[w] + ', ' + s.fastCourse[w] + ' in ' + f[w].toFixed(1) + ' s!');
    }
    const r = s.hoops, fl = s.flips;
    if (r[0] + r[1] > 0) out.push(r[0] === r[1] ? '★ Hoop stars: Pip and Bo, ' + r[0] + ' each!' : '★ Hoop star: ' + NAMES[r[0] > r[1] ? 0 : 1] + ' (' + Math.max(r[0], r[1]) + ' hoops)');
    else if (fl[0] + fl[1] > 0) out.push('★ Flip star: ' + NAMES[fl[0] >= fl[1] ? 0 : 1] + ' (' + Math.max(fl[0], fl[1]) + ' flips)');
    return out;
  },
  // test access for the bot harness and the computer brain (read-only)
  test: { DLR, DLR_COURSES, shapes: dlrShapes, span: dlrSpan, hitAt: dlrHitAt, inCurrent: dlrInCurrent, move: dlrMoveBody },
};

/* ---------- drawing: sky, sea and the course ---------- */
const DLR_LOOK = {
  lagoon: { sky: ['#4fc3f0', '#c6f0ff'], sea: ['#52d9d6', '#2a9fc4', '#17699a'], sand: ['#f6e2a6', '#e6c77e'] },
  reef: { sky: ['#5ab8f0', '#d4f2ff'], sea: ['#45cde0', '#2386bd', '#14558f'], sand: ['#f2dca0', '#dcbf7a'] },
  kelp: { sky: ['#73c9e0', '#e4f7ef'], sea: ['#45c7b0', '#1f8f96', '#125f72'], sand: ['#e8d49a', '#c9ad6a'] },
  sunset: { sky: ['#ff8f86', '#ffd59a'], sea: ['#6fb8d0', '#3a78ab', '#243f7e'], sand: ['#efcf98', '#cfa66c'] },
  final: { sky: ['#78b4ff', '#ffe2f2'], sea: ['#50cfe8', '#2a7fc0', '#1d4c96'], sand: ['#f6e0b0', '#e2c086'] },
};
const DLR_CORAL = ['#ff7f9f', '#ffa25a', '#c88dff', '#ffd25a', '#ff6fb8'];
const dlrSX = (st, x) => x - st.cam.x;
function dlrCloud(x, y, s, col) {
  ctx.fillStyle = col;
  circle(x, y, 18 * s); ctx.fill(); circle(x + 20 * s, y - 8 * s, 22 * s); ctx.fill(); circle(x + 42 * s, y, 16 * s); ctx.fill();
  rr(x - 10 * s, y - 2 * s, 62 * s, 18 * s, 9 * s); ctx.fill();
}
function dlrPalm(x, y, s, lean) {
  ctx.strokeStyle = '#9a6a3e'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.5, y - 30 * s, x + lean, y - 56 * s); ctx.stroke();
  ctx.fillStyle = '#3fae5a';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.62;
    ctx.save(); ctx.translate(x + lean, y - 56 * s); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(16 * s, 0, 18 * s, 5 * s, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.lineCap = 'butt';
}
function dlrDrawSkyAndSea(st) {
  const key = st.course.key, lk = DLR_LOOK[key] || DLR_LOOK.lagoon, cx = st.cam.x, s = DLR.surf, t = st.t;
  // the sky
  let g = ctx.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, lk.sky[0]); g.addColorStop(1, lk.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, s + 2);
  // the sun (low and big at sunset)
  const sunset = key === 'sunset', sx = (sunset ? 640 : 780) - (cx * 0.02) % 40, sy = sunset ? s - 34 : 96;
  ctx.fillStyle = sunset ? 'rgba(255,220,150,0.5)' : 'rgba(255,248,205,0.5)'; circle(sx, sy, sunset ? 74 : 54); ctx.fill();
  ctx.fillStyle = sunset ? '#ffe08a' : '#fff7d6'; circle(sx, sy, sunset ? 46 : 32); ctx.fill();
  // a rainbow in the final
  if (key === 'final') {
    const rx = 420 - ((cx * 0.05) % 1400), cols = ['#ff8fa0', '#ffc070', '#ffe680', '#a8e89a', '#8fd0ff', '#b9a0ff'];
    for (const ox of [rx, rx + 1400]) {
      ctx.lineWidth = 8;
      cols.forEach((col, i) => { ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(ox, s + 10, 230 - i * 8, Math.PI, Math.PI * 2); ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
  }
  // clouds (slow parallax)
  for (let i = -1; i < 7; i++) {
    const base = Math.floor(cx * 0.12 / 230) + i, x = base * 230 - cx * 0.12, y = 70 + dlrHash(base, 3) * 80, sc = 0.6 + dlrHash(base, 4) * 0.5;
    dlrCloud(x, y, sc, sunset ? 'rgba(255,236,220,0.65)' : 'rgba(255,255,255,0.7)');
  }
  // far land on the horizon
  const far = cx * 0.2;
  for (let i = -1; i < 4; i++) {
    const n = Math.floor(far / 520) + i, x = n * 520 - far + 120 + dlrHash(n, 5) * 160, w = 120 + dlrHash(n, 6) * 140;
    ctx.fillStyle = sunset ? '#c97a8a' : key === 'kelp' ? '#7fae9a' : '#8fd0a0';
    ctx.beginPath(); ctx.moveTo(x - w / 2, s); ctx.quadraticCurveTo(x, s - 36 - dlrHash(n, 7) * 26, x + w / 2, s); ctx.closePath(); ctx.fill();
    if (key === 'lagoon' || key === 'final') { dlrPalm(x - 10, s - 18, 0.55, 8); dlrPalm(x + 18, s - 14, 0.45, -6); }
    else if (key === 'kelp') { ctx.fillStyle = '#6f8f8a'; rr(x + w * 0.2, s - 42, 14, 30, 4); ctx.fill(); }
    else if (sunset && dlrHash(n, 8) < 0.6) { // a far little lighthouse
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 14, s - 58, 10, 34); ctx.fillStyle = '#ff7a8a'; ctx.fillRect(x + 14, s - 46, 10, 7); ctx.fillStyle = '#fff3a0'; ctx.fillRect(x + 13, s - 64, 12, 7);
    }
  }
  // far sailboats at sunset and in the final
  if (sunset || key === 'final') for (let i = -1; i < 4; i++) {
    const n = Math.floor(cx * 0.3 / 380) + i, x = n * 380 - cx * 0.3 + 160, y = s - 2;
    ctx.fillStyle = '#fff6ee'; ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x, y - 4); ctx.lineTo(x + 15, y - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e48fb0'; rr(x - 7, y - 4, 26, 5, 2.5); ctx.fill();
  }
  // the sea
  g = ctx.createLinearGradient(0, s, 0, H);
  g.addColorStop(0, lk.sea[0]); g.addColorStop(0.45, lk.sea[1]); g.addColorStop(1, lk.sea[2]);
  ctx.fillStyle = g; ctx.fillRect(0, s, W, H - s);
  // sunbeams slanting down through the water
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const n = Math.floor(cx * 0.4 / 210) + i - 1, x = n * 210 - cx * 0.4 + dlrHash(n, 9) * 60;
    const a = 0.07 + 0.05 * Math.sin(t * 0.8 + n);
    ctx.fillStyle = 'rgba(255,255,240,' + a.toFixed(3) + ')';
    ctx.beginPath(); ctx.moveTo(x, s); ctx.lineTo(x + 46, s); ctx.lineTo(x + 140, DLR.bed); ctx.lineTo(x + 60, DLR.bed); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // a far reef silhouette (slow parallax)
  ctx.fillStyle = key === 'kelp' ? 'rgba(20,90,90,0.35)' : 'rgba(20,70,130,0.3)';
  const fr = cx * 0.35;
  ctx.beginPath(); ctx.moveTo(0, DLR.bed);
  for (let x = 0; x <= W + 40; x += 30) ctx.lineTo(x, DLR.bed - 60 - Math.sin((x + fr) / 90) * 22 - Math.sin((x + fr) / 37) * 10 - (key === 'reef' ? 20 : 0));
  ctx.lineTo(W, DLR.bed); ctx.closePath(); ctx.fill();
  if (key === 'kelp') { // far kelp forest
    ctx.strokeStyle = 'rgba(30,110,90,0.45)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let i = -1; i < W / 46 + 2; i++) {
      const n = Math.floor(fr / 46) + i, x = n * 46 - fr, h = 120 + dlrHash(n, 10) * 120;
      ctx.beginPath(); ctx.moveTo(x, DLR.bed - 30);
      for (let k = 1; k <= 6; k++) ctx.lineTo(x + Math.sin(t * 1.2 + n + k * 0.7) * 6, DLR.bed - 30 - h * k / 6);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // little schools of fish swimming past (looks only)
  for (let i = 0; i < 3; i++) {
    const n = Math.floor(cx * 0.5 / 600) + i, base = n * 600 - cx * 0.5 + 200 - ((t * (18 + i * 6)) % 600) * 0, fy = s + 70 + dlrHash(n, 11) * 140;
    const col = ['#ffd25a', '#ff9fb2', '#9fe8ff'][Math.floor(dlrHash(n, 12) * 3)];
    const fx0 = base - (t * 22) % 1200 + 600;
    for (let k = 0; k < 6; k++) {
      const fx = fx0 + (k % 3) * 18 + Math.sin(t * 2 + k) * 3, yy = fy + Math.floor(k / 3) * 14 + (k % 3) * 4;
      if (fx < -20 || fx > W + 20) continue;
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(fx, yy, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx + 6, yy); ctx.lineTo(fx + 12, yy - 4); ctx.lineTo(fx + 12, yy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.ink; circle(fx - 3.5, yy - 1, 1.1); ctx.fill();
    }
  }
}
// the sandy seabed with shells, starfish and coral clumps
function dlrDrawSeabed(st) {
  const key = st.course.key, lk = DLR_LOOK[key] || DLR_LOOK.lagoon, cx = st.cam.x, b = DLR.bed, t = st.t;
  ctx.fillStyle = lk.sand[0];
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 30; x += 30) ctx.lineTo(x, b + 4 + Math.sin((x + cx) / 70) * 4);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  // a soft blend into the deeper sand, a lit lip along the top, ripples and grains
  ctx.save(); ctx.fillStyle = lk.sand[1]; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.rect(0, b + 20, W, 14); ctx.fill(); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.rect(0, b + 28, W, 6); ctx.fill(); ctx.restore();
  ctx.fillStyle = lk.sand[1]; ctx.beginPath(); ctx.rect(0, b + 34, W, H - b - 34); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = 0; x <= W + 30; x += 30) ctx.lineTo(x, b + 5 + Math.sin((x + cx) / 70) * 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,100,50,0.22)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = -1; i < W / 52 + 2; i++) { const n = Math.floor(cx / 52) + i, x = n * 52 - cx + dlrHash(n, 21) * 20, y = b + 30 + dlrHash(n, 22) * (H - b - 40); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 9, y - 4, x + 18, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(120,90,50,0.25)';
  for (let i = -1; i < W / 17 + 2; i++) { const n = Math.floor(cx / 17) + i, x = n * 17 - cx, y = b + 22 + dlrHash(n, 23) * (H - b - 26); ctx.fillRect(x, y, 2, 2); }
  ctx.lineCap = 'butt';
  // the dolphins' soft shadows on the sand (smaller and fainter the higher they swim)
  for (const D of st.pl || []) {
    const x = dlrSX(st, D.x); if (x < -80 || x > W + 80) continue;
    const k = clamp((D.y - DLR.surf + 60) / (b - DLR.surf + 60), 0, 1);
    ctx.fillStyle = 'rgba(20,40,70,' + (0.06 + 0.14 * k).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x, b + 12, 30 + 20 * k, 5 + 2 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = -1; i < W / 70 + 2; i++) {
    const n = Math.floor(cx / 70) + i, x = n * 70 - cx, h = dlrHash(n, 13), y = b + 14 + h * 14;
    if (h < 0.3) { // a coral clump
      const col = DLR_CORAL[Math.floor(dlrHash(n, 14) * DLR_CORAL.length)];
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
      // a little candelabra coral: a stem, arms that curve out and up, round tips
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 8); ctx.stroke();
      ctx.fillStyle = col;
      for (let k = -1; k <= 1; k++) {
        const tx = x + k * 13 + Math.sin(t + n + k) * 1.2, ty = y - 24 - (k === 0 ? 7 : 0);
        ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.quadraticCurveTo(x + k * 15, y - 7, tx, ty); ctx.stroke();
        circle(tx, ty, 3.6); ctx.fill();
      }
      ctx.lineCap = 'butt';
    } else if (h < 0.45) { // a starfish
      ctx.fillStyle = '#ff8f6a'; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r0 = k % 2 ? 3 : 8; ctx.lineTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); }
      ctx.closePath(); ctx.fill();
    } else if (h < 0.6) { // a shell
      ctx.fillStyle = '#fff1e6'; ctx.beginPath(); ctx.arc(x, y + 3, 7, Math.PI, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8b9a6'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x + k * 5, y - 3); ctx.stroke(); }
    } else if (h < 0.7) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(x, y, 2); ctx.fill(); circle(x + 6, y + 3, 1.5); ctx.fill(); }
  }
}
// the bright wavy water surface (drawn twice: behind the dolphins, and a see-through front edge over them)
function dlrDrawSurface(st, front) {
  const cx = st.cam.x, s = DLR.surf, t = st.t;
  if (!front) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, s, W, 10);
    return;
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -10; x <= W + 10; x += 12) ctx.lineTo(x, s + Math.sin((x + cx) / 38 + t * 2.4) * 2.5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = -1; i < W / 90 + 2; i++) {
    const n = Math.floor(cx / 90) + i, x = n * 90 - cx + dlrHash(n, 15) * 40, k = (t * 0.7 + dlrHash(n, 16)) % 1;
    ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8; ctx.fillRect(x, s + 6 + dlrHash(n, 17) * 8, 18, 2); ctx.globalAlpha = 1;
  }
}
function dlrDrawCurrent(st, u) {
  const x0 = dlrSX(st, u.x0), x1 = dlrSX(st, u.x1), w = x1 - x0, t = st.t, h = u.y1 - u.y0;
  if (x1 < -10 || x0 > W + 10) return;
  const g = ctx.createLinearGradient(0, u.y0, 0, u.y1);
  g.addColorStop(0, 'rgba(190,255,250,0)'); g.addColorStop(0.5, 'rgba(190,255,250,0.24)'); g.addColorStop(1, 'rgba(190,255,250,0)');
  ctx.fillStyle = g; rr(x0, u.y0, w, h, h / 2); ctx.fill();
  // streaks and arrows flowing right
  ctx.strokeStyle = 'rgba(235,255,255,0.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < Math.max(3, Math.floor(w / 70)); i++) {
    const ph = (t * 0.9 + i * 0.37) % 1, lx = x0 + ((i * 97 + t * 180) % Math.max(1, w)), ly = u.y0 + h * (0.2 + 0.6 * dlrHash(i, 18));
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8 * clamp(Math.min(lx - x0, x1 - lx) / 40, 0, 1);
    ctx.beginPath(); ctx.moveTo(lx - 22, ly); ctx.lineTo(lx, ly); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(235,255,255,0.55)';
  for (let ax = x0 + 40 + ((t * 60) % 120); ax < x1 - 30; ax += 120) {
    const ay = u.y0 + h / 2;
    ctx.beginPath(); ctx.moveTo(ax + 10, ay); ctx.lineTo(ax - 2, ay - 8); ctx.lineTo(ax - 2, ay + 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ax + 22, ay); ctx.lineTo(ax + 10, ay - 8); ctx.lineTo(ax + 10, ay + 8); ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'butt';
}
function dlrDrawHoopHalf(st, g, front) {
  const x = dlrSX(st, g.x); if (x < -40 || x > W + 40) return;
  const r = DLR.hoopR, any = g.got[0] || g.got[1];
  const pulse = 1 + 0.05 * Math.sin(st.t * 5 + g.id);
  // a little float pole holds it up from the water (behind)
  if (!front) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, g.y + r + 4); ctx.lineTo(x, DLR.surf); ctx.stroke();
    ctx.fillStyle = '#ff7f9f'; ctx.beginPath(); ctx.ellipse(x, DLR.surf + 1, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 9, DLR.surf - 1, 18, 2);
  }
  ctx.save(); ctx.translate(x, g.y); ctx.scale(1, pulse);
  ctx.lineWidth = 7; ctx.strokeStyle = any ? 'rgba(255,214,90,0.5)' : C.gold;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, r + 4, 0, front ? -Math.PI / 2 : Math.PI / 2, front ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = any ? 'rgba(255,255,255,0.5)' : '#fff7d0';
  ctx.beginPath(); ctx.ellipse(0, 0, 11, r + 4, 0, front ? -Math.PI / 2 : Math.PI / 2, front ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke();
  ctx.restore();
  if (front && !any && Math.sin(st.t * 3 + g.id) > 0.6) { ctx.fillStyle = '#fff'; dlrStar(x + 8, g.y - r + 4, 3.5); }
  if (front) for (const k of [0, 1]) if (g.got[k]) { ctx.fillStyle = PCOL[k]; circle(x - 5 + k * 10, g.y - r - 12, 4); ctx.fill(); }
}
function dlrWeedPath(x, top, bot, t, ph, lean) {
  ctx.beginPath(); ctx.moveTo(x, bot);
  const n = 7;
  for (let k = 1; k <= n; k++) { const yy = bot - (bot - top) * k / n; ctx.lineTo(x + Math.sin(t * 1.6 + ph + k * 0.8) * (3 + k * 1.2) + lean * k, yy); }
}
function dlrDrawObstacle(st, o) {
  const sh = dlrShapes(o, st.rt), sp = dlrSpan(o), q = DLR, s = q.surf, b = q.bed;
  if (o.k !== 'turtle' && o.k !== 'gull' && (dlrSX(st, sp[1]) < -80 || dlrSX(st, sp[0]) > W + 80)) return;
  const t = st.t, hit = o.hitT < 0.6 ? Math.sin(o.hitT * 20) * (0.6 - o.hitT) : 0;
  switch (o.k) {
    case 'weed': {
      const x = dlrSX(st, o.x) + hit * 10;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [dx, col, lw, ph] of [[-9, '#2f8f4a', 9, 0], [9, '#3fa85a', 9, 1.7], [0, '#5fc86a', 11, 0.8]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        dlrWeedPath(x + dx, o.top + (dx ? 10 : 0), b + 10, t, ph + o.ph, 0); ctx.stroke();
      }
      // leaves
      ctx.fillStyle = '#7fe08a';
      for (let k = 1; k < 6; k++) {
        const yy = b - (b - o.top) * k / 6, lx = x + Math.sin(t * 1.6 + o.ph + k) * 5;
        ctx.beginPath(); ctx.ellipse(lx + (k % 2 ? 9 : -9), yy, 9, 4, k % 2 ? -0.5 : 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      break;
    }
    case 'gate': {
      const x = dlrSX(st, o.x) + hit * 8;
      ctx.lineCap = 'round';
      // kelp from the seabed up to the gap
      for (const [dx, col, ph] of [[-12, '#3a9f50', 0], [0, '#5fcf6a', 1.1], [12, '#4fbf60', 2.2]]) {
        ctx.strokeStyle = col; ctx.lineWidth = 11;
        dlrWeedPath(x + dx, o.gb + 6, b + 10, t, ph + o.ph, 0); ctx.stroke();
      }
      ctx.fillStyle = '#c9a64a'; for (const dx of [-12, 0, 12]) { circle(x + dx + Math.sin(t * 1.6 + o.ph + dx) * 3, o.gb + 8, 5); ctx.fill(); }
      // the floating kelp mat hanging down from the surface to the gap
      for (const [dx, col, ph] of [[-14, '#3a9f50', 0.5], [-2, '#5fcf6a', 1.5], [12, '#4fbf60', 2.5]]) {
        ctx.strokeStyle = col; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(x + dx, s);
        for (let k = 1; k <= 6; k++) ctx.lineTo(x + dx + Math.sin(t * 1.4 + ph + o.ph + k * 0.9) * (2 + k), s + (o.gt - 4 - s) * k / 6);
        ctx.stroke();
      }
      // leaves on both parts, so the gate stands out from the far kelp
      ctx.fillStyle = '#8fe89a';
      for (let k = 0; k < 5; k++) {
        const y1 = o.gb + 14 + (b - o.gb - 20) * k / 5, y2 = s + 10 + (o.gt - s - 20) * k / 5, sw = Math.sin(t * 1.6 + o.ph + k) * 4;
        for (const [yy, side] of [[y1, k % 2 ? 1 : -1], [y2, k % 2 ? -1 : 1]]) { ctx.beginPath(); ctx.ellipse(x + sw + side * 13, yy, 10, 4, side * -0.5, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = '#5fc86a'; rr(x - 30, s - 9, 60, 14, 7); ctx.fill();
      ctx.fillStyle = '#c9a64a'; for (const dx of [-18, 0, 18]) { circle(x + dx, s - 6, 5); ctx.fill(); }
      // a gold arrow at the gap, so it is easy to find
      const gy = (o.gt + o.gb) / 2, ax = x - 52 - Math.sin(t * 5) * 4;
      ctx.fillStyle = 'rgba(255,214,90,0.85)'; ctx.beginPath(); ctx.moveTo(ax + 16, gy); ctx.lineTo(ax, gy - 10); ctx.lineTo(ax, gy + 10); ctx.closePath(); ctx.fill();
      ctx.lineCap = 'butt';
      break;
    }
    case 'buoy': {
      const x = dlrSX(st, o.x) + hit * 8, y = sh.cy, cols = ['#ff6f6f', '#ffb13d', '#ff7fc8'][o.col];
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2.2 + o.ph) * 0.12 + hit * 0.5);
      ctx.strokeStyle = 'rgba(80,70,110,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(0, 46); ctx.stroke();
      ctx.fillStyle = cols; circle(0, 0, 20); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.save(); circle(0, 0, 20); ctx.clip(); ctx.fillRect(-21, -6, 42, 10); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-7, -10, 5, 3, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, -38); ctx.stroke();
      ctx.fillStyle = cols; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(14 + Math.sin(t * 6 + o.ph) * 2, -33); ctx.lineTo(0, -28); ctx.fill();
      ctx.restore();
      break;
    }
    case 'rock': {
      const x = dlrSX(st, o.x) + hit * 5, cy = b + 34, r = o.r, cols = [['#9c8fc0', '#7d70a6'], ['#a8a0b8', '#857c98'], ['#8fa6b8', '#6f879a']][o.col];
      ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.arc(x, cy, r, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(x - 4, cy, r - 8, Math.PI, Math.PI * 2); ctx.fill();
      // pits, cracks and barnacles, then an outline in its own dark shade
      ctx.save(); ctx.beginPath(); ctx.arc(x, cy, r, Math.PI, Math.PI * 2); ctx.clip();
      for (let k = 0; k < 9; k++) { const hh = hash(o.id + 7, k), px = x - r + 16 + (hh % Math.max(1, r * 2 - 32)), py = cy - 10 - ((hh >> 7) % Math.max(1, Math.round(r * 0.8))); ctx.fillStyle = k % 3 ? 'rgba(40,30,70,0.16)' : 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(px, py, 4 + hh % 6, 3 + hh % 3, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(40,30,70,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + r * 0.1, cy - r * 0.9); ctx.lineTo(x + r * 0.2, cy - r * 0.6); ctx.lineTo(x + r * 0.05, cy - r * 0.4); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = shade(cols[1], 0.35); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, cy, r, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, cy - r * 0.6, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
      // coral and sea anemones on top
      for (let k = 0; k < 4; k++) {
        const a = Math.PI * (1.2 + k * 0.2), px = x + Math.cos(a) * (r - 6), py = cy + Math.sin(a) * (r - 6), col = DLR_CORAL[(o.id + k) % DLR_CORAL.length];
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + j * 7 + Math.sin(t * 2 + k + j) * 2, py - 12 - (j ? 0 : 5)); ctx.stroke(); }
      }
      ctx.lineCap = 'butt';
      // a tiny friendly crab
      if (o.id % 2 === 0) { const kx = x + r * 0.45, ky = cy - Math.sqrt(Math.max(0, r * r - (r * 0.45) ** 2)) + 4; ctx.fillStyle = '#ff7a5a'; ctx.beginPath(); ctx.ellipse(kx, ky - 4, 8, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; circle(kx - 3, ky - 11, 2); ctx.fill(); circle(kx + 3, ky - 11, 2); ctx.fill(); ctx.fillStyle = C.ink; circle(kx - 3, ky - 11, 1); ctx.fill(); circle(kx + 3, ky - 11, 1); ctx.fill(); }
      break;
    }
    case 'turtle': {
      const x = dlrSX(st, sh.cx), y = sh.cy;
      if (x < -60 || x > W + 60) return;
      const woke = o.hitT < 1.6;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.9 + o.ph) * 0.08 + hit * 0.6); ctx.scale(-1, 1);
      // flippers
      const fl = Math.sin(t * 2 + o.ph) * 0.4;
      ctx.fillStyle = '#8fd07a';
      ctx.save(); ctx.translate(10, 10); ctx.rotate(0.5 + fl); ctx.beginPath(); ctx.ellipse(8, 0, 12, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(-12, 10); ctx.rotate(2.6 - fl); ctx.beginPath(); ctx.ellipse(6, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // head
      ctx.fillStyle = '#8fd07a'; circle(28, -2, 9); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      if (woke) { ctx.fillStyle = '#fff'; circle(31, -5, 3); ctx.fill(); ctx.fillStyle = C.ink; circle(31.5, -5, 1.5); ctx.fill(); ctx.beginPath(); ctx.ellipse(32, 2, 2.5, 2, 0, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(31, -5, 2.6, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.arc(31, 1, 2.5, 0.3, Math.PI - 0.3); ctx.stroke(); }
      // shell
      ctx.fillStyle = '#4f9a5a'; ctx.beginPath(); ctx.ellipse(0, 0, 25, 17, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(-25, -1, 50, 6);
      ctx.fillStyle = '#7cc46a'; for (const [dx, dy] of [[-10, -8], [3, -11], [14, -6], [-2, -3]]) { circle(dx, dy, 4.5); ctx.fill(); }
      ctx.fillStyle = '#f2e3a0'; rr(-24, 3, 48, 5, 2.5); ctx.fill();
      ctx.restore();
      // z z z (or a yawn when bumped)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '14px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (!woke) { const z = (t * 0.5 + o.ph) % 1; ctx.globalAlpha = 1 - z; ctx.fillText('z', x - 24 - z * 12, y - 22 - z * 22); ctx.globalAlpha = 1; }
      break;
    }
    case 'boat': {
      const x = dlrSX(st, o.x) + hit * 4, bob = Math.sin(t * 1.6 + o.ph) * 2, cols = ['#ff8fa0', '#ffd25a', '#8fe3b0'][o.col];
      ctx.save(); ctx.translate(0, bob);
      // the sail
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(x - 6, s - 146); ctx.lineTo(x - 6, s - 34); ctx.lineTo(x - 58, s - 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cols; ctx.beginPath(); ctx.moveTo(x - 6, s - 80); ctx.lineTo(x - 6, s - 34); ctx.lineTo(x - 52, s - 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 3, s - 152, 6, 136);
      ctx.fillStyle = cols; ctx.beginPath(); ctx.moveTo(x + 3, s - 152); ctx.lineTo(x + 24 + Math.sin(t * 5) * 2, s - 146); ctx.lineTo(x + 3, s - 140); ctx.fill();
      // the hull (half under the water)
      ctx.fillStyle = '#b77a45'; ctx.beginPath(); ctx.moveTo(x - 66, s - 16); ctx.lineTo(x + 70, s - 16); ctx.lineTo(x + 52, s + 24); ctx.lineTo(x - 50, s + 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 66, s - 18, 136, 6);
      ctx.fillStyle = cols; ctx.fillRect(x - 60, s - 4, 124, 5);
      ctx.fillStyle = '#ffffff'; for (const dx of [-30, 0, 30]) { circle(x + dx, s - 7, 3.5); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'gull': {
      const x = dlrSX(st, sh.cx), y = sh.cy, hitG = o.hitT < 1.2;
      if (x < -40 || x > W + 40) return;
      ctx.save(); ctx.translate(x, y + (hitG ? -o.hitT * 40 : 0)); if (hitG) ctx.rotate(Math.sin(o.hitT * 14) * 0.4);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(60,50,90,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const flap = Math.sin(t * (hitG ? 30 : 10) + o.ph);
      ctx.fillStyle = '#c9cfe0'; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(6, -18 * flap - 4, 18, -14 * flap - 2); ctx.quadraticCurveTo(8, 2, -2, 4); ctx.fill();
      ctx.fillStyle = '#ffb13d'; ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-24, 1); ctx.lineTo(-15, 4); ctx.fill();
      ctx.fillStyle = C.ink; circle(-8, -4, 2); ctx.fill(); ctx.fillStyle = '#fff'; circle(-7.4, -4.6, 0.7); ctx.fill();
      ctx.restore();
      break;
    }
  }
}
function dlrDrawStart(st) {
  const x = dlrSX(st, DLR.startX) + 46, s = DLR.surf;
  if (x < -40) return;
  // a rope of little floats across the start
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, s - 2); ctx.lineTo(x, DLR.bed); ctx.stroke();
  for (let y = s + 18, k = 0; y < DLR.bed; y += 26, k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#ff8f6a'; circle(x, y, 5); ctx.fill(); }
  // a little start buoy with a flag
  ctx.fillStyle = '#ff8f6a'; circle(x, s - 4, 12); ctx.fill();
  ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, s - 14); ctx.lineTo(x, s - 54); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x, s - 54, 26, 16);
  ctx.fillStyle = '#5a4a8a'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) ctx.fillRect(x + i * 6.5, s - 54 + j * 8, 6.5, 8);
}
function dlrDrawFinish(st) {
  const c = st.course, x = dlrSX(st, c.len), s = DLR.surf, b = DLR.bed;
  if (x < -220 || x > W + 220) return;
  // a big coral arch over the finish line, a rainbow of shells on top
  ctx.lineWidth = 22; ctx.lineCap = 'round';
  ctx.strokeStyle = '#ff8fa8'; ctx.beginPath(); ctx.moveTo(x - 70, b + 10); ctx.quadraticCurveTo(x - 90, s - 40, x, s - 150); ctx.quadraticCurveTo(x + 90, s - 40, x + 70, b + 10); ctx.stroke();
  ctx.lineWidth = 8; ctx.strokeStyle = '#ffc0cf'; ctx.beginPath(); ctx.moveTo(x - 72, b + 10); ctx.quadraticCurveTo(x - 92, s - 40, x - 2, s - 150); ctx.stroke();
  ctx.lineCap = 'butt';
  const shells = ['#ff8fa0', '#ffc070', '#ffe680', '#a8e89a', '#8fd0ff', '#b9a0ff'];
  for (let i = 0; i < 9; i++) {
    const k = i / 8, px = x - 66 + 132 * k, py = s - 150 + Math.abs(k - 0.5) * 2 * 120 * Math.abs(k - 0.5) * 1.2;
    ctx.fillStyle = shells[i % shells.length]; circle(px, py + 6, 7); ctx.fill();
  }
  // the checkered line through the water and up the air
  for (let y = s - 120, k = 0; y < b; y += 16, k++) { ctx.fillStyle = k % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(90,74,138,0.85)'; ctx.fillRect(x - 5, y, 5, 16); ctx.fillStyle = k % 2 ? 'rgba(90,74,138,0.85)' : 'rgba(255,255,255,0.85)'; ctx.fillRect(x, y, 5, 16); }
  ctx.save(); ctx.translate(x + 2, s + 48);
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-52, -16, 104, 32, 16); ctx.fill();
  text('FINISH', 0, 1, 20, C.gold, 'center');
  ctx.restore();
}
function dlrDrawWorld() {
  const st = G.mst; if (!st.course || !st.cam) return;
  dlrDrawSkyAndSea(st);
  for (const u of st.course.curs) dlrDrawCurrent(st, u);
  dlrDrawSeabed(st);
  dlrDrawFinish(st);
  dlrDrawStart(st);
  for (const o of st.course.obs) if (o.k !== 'gull') dlrDrawObstacle(st, o);
  for (const g of st.course.hoops) dlrDrawHoopHalf(st, g, false);
  dlrDrawSurface(st, false);
}

/* ---------- drawing: Pip and Bo on their dolphins ---------- */
// a little Pip or Bo sitting on the dolphin (their game look: Pip orange with her sprout, Bo blue with round ears)
function dlrDrawRider(k, mood, s, scarfT, wet) {
  const col = PCOL[k], dk = PDARK[k];
  ctx.save(); ctx.scale(s, s);
  // the scarf flapping out behind
  ctx.fillStyle = k ? '#ffd36b' : '#ffffff';
  ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-18, -10 + Math.sin(scarfT * 12) * 3, -28, -6 + Math.sin(scarfT * 12 + 1) * 5);
  ctx.lineTo(-27, -1 + Math.sin(scarfT * 12 + 1.5) * 5); ctx.quadraticCurveTo(-16, -4, -6, -3); ctx.closePath(); ctx.fill();
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
  // hands holding the saddle handle
  ctx.strokeStyle = dk; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(7, -8); ctx.lineTo(13, -1); ctx.stroke(); ctx.lineCap = 'butt';
  // a bubble helmet underwater
  if (wet > 0) {
    ctx.globalAlpha *= wet;
    ctx.fillStyle = 'rgba(220,248,255,0.22)'; circle(1, -14, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.6; circle(1, -14, 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(1, -14, 12, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
  }
  ctx.restore();
}
// the dolphin side-on, nose to the right, at the origin; o: fluke (tail beat phase), gold, sq (squash on a bump)
function dlrDrawDolphinBody(k, o) {
  const main = k ? '#6fb3c8' : '#a9a8dc', dark = k ? '#4f8fa8' : '#8584be', belly = k ? '#e6f7ff' : '#f7ecff';
  ctx.save(); ctx.scale(1, o.sq || 1);
  // the tail flukes beating up and down
  const fa = Math.sin(o.fluke) * 0.35;
  ctx.save(); ctx.translate(-34, -2); ctx.rotate(fa);
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(-8, -4, -18, -14); ctx.quadraticCurveTo(-12, 0, -18, 13); ctx.quadraticCurveTo(-8, 4, 4, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  // the body
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.moveTo(-36, -2);
  ctx.bezierCurveTo(-20, -18, 12, -20, 28, -8);     // back
  ctx.quadraticCurveTo(38, -4, 46, -1);              // the beak (top)
  ctx.quadraticCurveTo(48, 2, 44, 4);
  ctx.quadraticCurveTo(36, 6, 28, 8);                // the beak (bottom)
  ctx.bezierCurveTo(10, 16, -18, 12, -36, 2);        // belly
  ctx.closePath(); ctx.fill();
  // the pale belly
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.moveTo(-26, 4); ctx.bezierCurveTo(-8, 12, 16, 12, 32, 6); ctx.quadraticCurveTo(14, 6, -26, 4); ctx.closePath(); ctx.fill();
  // the dorsal fin
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-14, -13); ctx.quadraticCurveTo(-18, -26, -26, -30); ctx.quadraticCurveTo(-12, -26, -2, -15); ctx.closePath(); ctx.fill();
  if (o.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.stroke(); }
  // a flipper
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(8, 6); ctx.quadraticCurveTo(2, 18 + Math.sin(o.fluke * 0.5) * 2, -6, 20); ctx.quadraticCurveTo(0, 12, 0, 6); ctx.closePath(); ctx.fill();
  if (o.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke(); }
  // a shine on the back
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(4, -12, 14, 3, -0.08, 0, Math.PI * 2); ctx.fill();
  // the saddle in the rider's colour
  ctx.fillStyle = PCOL[k]; rr(-12, -17, 20, 7, 3.5); ctx.fill();
  ctx.fillStyle = PDARK[k]; ctx.fillRect(-4, -11, 4, 10);
  // a happy eye and smile
  ctx.fillStyle = C.ink; circle(30, -5, 2.4); ctx.fill(); ctx.fillStyle = '#fff'; circle(30.8, -5.8, 0.9); ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,70,0.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(32, 3); ctx.quadraticCurveTo(38, 5, 44, 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,130,160,0.45)'; circle(27, 1, 2.2); ctx.fill();
  ctx.restore();
}
function dlrDrawDolphin(st, D) {
  const x = dlrSX(st, D.x), y = D.y, s = DLR.surf;
  if (x < -90 || x > W + 90) return;
  let ang = 0;
  if (st.ph !== 'set' || D.sp > 0) ang = clamp(Math.atan2(D.vy, Math.max(120, D.sp)), -0.75, 0.75);
  if (D.wobT > 0) ang += Math.sin(D.wobT * 26) * 0.25 * (D.wobT / DLR.wobT);
  const bob = st.ph === 'set' ? Math.sin(st.t * 2.4 + D.k) * 3 : 0;
  let flip = D.flipT < 0.55 ? D.flipT / 0.55 * Math.PI * 2 : 0;
  ctx.save(); ctx.translate(x, y + bob);
  // a soft gold glow round a dolphin with gold fins or on a gold current
  if (D.fins || D.tail) {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 62);
    g.addColorStop(0, 'rgba(255,214,90,0.5)'); g.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = g; circle(0, 0, 62); ctx.fill();
  }
  if (D.immT > 0) ctx.globalAlpha = 0.6 + 0.3 * Math.sin(st.t * 30);
  ctx.rotate(ang - flip);
  let mood = 'happy';
  if (D.wobT > 0) mood = 'dizzy';
  else if (D.cheer > 0 || D.done) mood = 'joy';
  else if (D.boostT > 0 || D.air || D.flipT < 0.55) mood = 'wow';
  else if (D.kickT > 0) mood = 'grit';
  const wet = clamp((y - (s - 4)) / 14, 0, 1);
  const sq = D.wobT > 0 ? 1 - 0.18 * Math.abs(Math.sin(D.wobT * 22)) : 1;
  ctx.save(); ctx.translate(-4, -14); dlrDrawRider(D.k, mood, 0.78, st.t + D.k, wet); ctx.restore();
  dlrDrawDolphinBody(D.k, { fluke: D.fluke, gold: D.fins, sq });
  ctx.restore();
  ctx.globalAlpha = 1;
}
function dlrStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r0 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); }
  ctx.closePath(); ctx.fill();
}
function dlrDrawTop() {
  const st = G.mst, m = G.match; if (!st.course || !st.cam || !st.pl) return;
  const big = dlrBig();
  // gulls fly over everything in the water
  for (const o of st.course.obs) if (o.k === 'gull') dlrDrawObstacle(st, o);
  // the trailing dolphin first, so the leader is on top
  const order = st.pl[0].x < st.pl[1].x ? [st.pl[0], st.pl[1]] : [st.pl[1], st.pl[0]];
  for (const D of order) dlrDrawDolphin(st, D);
  for (const g of st.course.hoops) dlrDrawHoopHalf(st, g, true);
  dlrDrawSurface(st, true);
  for (const f of st.vis.fx) {
    const a = clamp(f.life / f.max, 0, 1), x = dlrSX(st, f.x);
    if (x < -20 || x > W + 20) continue;
    ctx.globalAlpha = a;
    if (f.kind === 'bubble') { ctx.strokeStyle = f.col; ctx.lineWidth = 1.2; circle(x, f.y, f.size); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(x - f.size * 0.3, f.y - f.size * 0.3, f.size * 0.3); ctx.fill(); }
    else if (f.kind === 'spark') { ctx.fillStyle = f.col; dlrStar(x, f.y, f.size * (0.8 + 0.6 * a)); }
    else if (f.kind === 'streak') { ctx.fillStyle = f.col; ctx.fillRect(x - 12, f.y - 1, 24 * a + 4, 2.5); }
    else if (f.kind === 'leaf') { ctx.fillStyle = f.col; ctx.save(); ctx.translate(x, f.y); ctx.rotate(f.rot); ctx.beginPath(); ctx.ellipse(0, 0, f.size, f.size * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else { ctx.fillStyle = f.col; circle(x, f.y, f.size * (0.6 + 0.4 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // world pops (Bonk!)
  for (const p of st.vis.pops) { const k = p.t / 1.1; ctx.globalAlpha = 1 - k * k; bigText(p.text, clamp(dlrSX(st, p.x), 50, W - 50), p.y - 20 * k, big ? 26 : 20, p.col, 1 + 0.3 * Math.max(0, 1 - p.t * 6)); ctx.globalAlpha = 1; }
  // pops over each dolphin
  for (const D of st.pl) if (D.popT < 1.3 && D.pop) {
    const k = D.popT / 1.3, fs = D.popBig ? (big ? 26 : 20) : (big ? 22 : 16);
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(D.pop).width * 1.1 + 8;
    let y = D.y - 60 - 18 * k;
    const other = st.pl[1 - D.k];
    if (other.popT < 1.3 && other.pop && Math.abs(other.x - D.x) < 220 && Math.abs(other.y - D.y) < 44) y += D.y <= other.y ? -26 : 26;
    const x = clamp(dlrSX(st, D.x), w / 2 + 8, W - w / 2 - 8);
    ctx.globalAlpha = 1 - k * k;
    bigText(D.pop, x, clamp(y, (G.matchHudBox ? G.matchHudBox.y1 : 44) + 40, H - 80), fs, D.popCol, 1 + 0.25 * Math.max(0, 1 - k * 5));
    ctx.globalAlpha = 1;
  }
  // name tags through the intro card, "Round N" and 3-2-1
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : m && m.phase === 'live' && st.rt < 1.2 ? 1 - st.rt / 1.2 : 0;
  if (tagA > 0) for (const D of st.pl) {
    const cpu = dlrCpu(D.k), hw = cpu ? 32 : 20, x = Math.max(dlrSX(st, D.x) - 62, hw * 2 + 18), y = D.y - 4;
    ctx.globalAlpha = tagA; ctx.fillStyle = PCOL[D.k]; rr(x - hw * 2 - 10, y - 11, hw * 2, 20, 10); ctx.fill();
    text(cpu ? NAMES[D.k] + ' · CPU' : NAMES[D.k], x - hw - 10, y - 0.5, 13, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
}

/* ---------- HUD ---------- */
// each player's own keys (none for the computer)
function dlrKeys(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (k === 'pad') return { act: glyph('act'), move: 'stick ▲ ▼' };
  if (k === 'touch') return { act: 'leap', move: '▲ ▼', touch: true };
  if (typeof cpuSolo === 'function' && cpuSolo()) return { act: 'F or /', move: 'W S or ↑ ↓' };
  return id === 0 ? { act: 'F', move: 'W S' } : { act: '/', move: '↑ ↓' };
}
function dlrChip(label, x, y, big, col, gold) {
  const fs = big ? 21 : 13, h = big ? 36 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), cx = clamp(x, w / 2 + 6, W - w / 2 - 6), cy = clamp(y, h / 2 + 4, H - h / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, cy + 0.5, fs, gold ? C.gold : C.paper, 'center', 'body');
}
// a tiny dolphin icon (progress bar, leap ring)
function dlrIcon(x, y, s, k) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = k ? '#6fb3c8' : '#a9a8dc';
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-12, -4); ctx.lineTo(-12, 4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-5, -8); ctx.lineTo(1, -3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PCOL[k]; circle(1, -4.5, 2.8); ctx.fill();
  ctx.restore();
}
// the leap ring: fills as the leap refills, glows gold when ready
function dlrLeapRing(x, y, r, D) {
  const cd = D.fins ? DLR.leapCdGold : DLR.leapCd, f = 1 - clamp(D.leapCd / cd, 0, 1), ready = f >= 1 && !D.air;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = r * 0.32; circle(x, y, r); ctx.stroke();
  ctx.strokeStyle = ready ? C.gold : PCOL[D.k]; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
  // a little leaping arc inside
  ctx.strokeStyle = ready ? '#fff' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = r * 0.18; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y + r * 0.35, r * 0.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.lineCap = 'butt';
}
function dlrHud() {
  const st = G.mst, m = G.match; if (!st.pl || !st.course || !m) return;
  const big = dlrBig(), sz = big ? 1.45 : 1, c = st.course;
  // bottom corners: each rider's panel: name, speed bar, the leap ring, what is happening
  for (const D of st.pl) {
    const left = D.k === 0, pw = 222 * sz, ph = 40 * sz, y = H - 6 - ph, x = left ? 10 : W - 10 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (D.gold || D.tail) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    const nx = left ? x + 16 * sz : x + pw - 16 * sz;
    text(NAMES[D.k], nx, y + ph / 2 + 0.5, 18 * sz, PCOL[D.k], left ? 'left' : 'right');
    // the speed bar
    const bx = left ? x + 56 * sz : x + pw - 56 * sz - 104 * sz, by = y + ph * 0.3, bw = 104 * sz, bh = 7 * sz;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
    const f = clamp((D.sp - DLR.minSp) / (DLR.maxSp - DLR.minSp), 0, 1);
    if (f > 0.02) { ctx.fillStyle = D.boostT > 0 || D.tail ? C.gold : PCOL[D.k]; rr(bx, by, Math.max(bh, bw * f), bh, bh / 2); ctx.fill(); }
    dlrLeapRing(left ? x + pw - 22 * sz : x + 22 * sz, y + ph / 2, 11 * sz, D);
    // the status line under the speed bar
    let lab = '', col = 'rgba(246,239,223,0.8)';
    if (m.phase === 'ready' || m.phase === 'count' || m.phase === 'intro') lab = 'Ready...';
    else if (D.done || st.res) {
      // (the framework's own verdict when it has one: a tied round won on the tiebreak names its winner)
      const w = m.end ? m.end.winner : st.res ? st.res.winner : -2;
      lab = w === D.k ? 'Winner!' : D.done ? 'Finished' : 'Good race!';
    }
    else if (D.tail) { lab = 'Gold current!'; col = C.gold; }
    else if (D.wobT > 0) lab = 'Bump!';
    else if (D.boostT > 0) { lab = 'Zoom!'; col = C.gold; }
    else if (D.inCur) { lab = 'Fast current!'; col = '#bff6ff'; }
    else if (D.fins) { lab = 'Gold fins'; col = C.gold; }
    else if (D.air) lab = 'Wheee!';
    else lab = Math.round(D.sp) + ' speed';
    text(lab, bx + bw / 2, y + ph * 0.7, 11 * sz, col, 'center', 'body');
  }
  // the course progress bar at the bottom middle: start, finish arch, the two dolphins
  {
    const x0 = W / 2 - (big ? 112 : 200), x1 = W / 2 + (big ? 112 : 200), y = H - (big ? 36 : 24);
    ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(x0 - 14, y - 12, x1 - x0 + 28, 24, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(x0, y - 2, x1 - x0, 4, 2); ctx.fill();
    for (const g of c.hoops) { const a = x0 + (x1 - x0) * clamp((g.x - DLR.startX) / (c.len - DLR.startX), 0, 1); ctx.fillStyle = g.got[0] || g.got[1] ? 'rgba(255,214,90,0.35)' : 'rgba(255,214,90,0.8)'; circle(a, y, 1.8); ctx.fill(); }
    for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#5a4a8a' : '#fff'; ctx.fillRect(x1 - 2, y - 8 + k * 5, 4, 5); }
    for (const D of [st.pl[1], st.pl[0]]) {
      const px = x0 + (x1 - x0) * clamp((D.x - DLR.startX) / (c.len - DLR.startX), 0, 1);
      dlrIcon(px, y + (D.k ? 4 : -4), 1.25 * (big ? 1.2 : 1), D.k);
    }
  }
  // the course name, top left under the level pill
  {
    const fs = big ? 17 : 13, h = big ? 32 : 26, y0 = 46;
    const lab = c.name + (st.round >= 5 ? '  ·  the final!' : '');
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + (big ? 34 : 28); pill(14, y0, w, h); text(lab, 14 + (big ? 17 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  if (m.phase === 'live') {
    // each person's keys, early in rounds 1-2 (never the computer's); a nudge for anyone who hasn't leapt yet
    for (const D of st.pl) {
      if (dlrCpu(D.k) || D.done) continue;
      const kk = dlrKeys(D.k), left = D.k === 0, ph = 40 * sz, cxp = left ? 10 + 222 * sz / 2 : W - 10 - 222 * sz / 2, y = H - 6 - ph - (big ? 28 : 18);
      if (st.round <= 2 && st.rt < 7) dlrKeyChip(kk, D, cxp, y, big);
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the round card, below the framework's 3-2-1 circle (which ends at y 274)
    const nf = big ? 32 : 22, hf = big ? 21 : 14;
    ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    // (kept narrow enough that the name tags by the start rope stay in sight: a long hint goes on two lines)
    const maxW = 600;
    let lines = [c.hint];
    if (ctx.measureText(c.hint).width + 44 > maxW) {
      const words = c.hint.split(' ');
      let best = 1, bestD = Infinity;
      for (let i = 1; i < words.length; i++) { const d = Math.abs(ctx.measureText(words.slice(0, i).join(' ')).width - ctx.measureText(words.slice(i).join(' ')).width); if (d < bestD) { bestD = d; best = i; } }
      lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    }
    const w = Math.min(W - 20, Math.max(big ? 380 : 320, ...lines.map(l => ctx.measureText(l).width + 44)));
    const lh = hf * 1.25, ch = (big ? 74 : 50) + (lines.length - 1) * lh, gold = st.pl.some(D => D.gold), yy = big ? 286 : 290;
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1, cx = W / 2;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(cx - w / 2, yy, w, ch, 14); ctx.fill();
    ctx.strokeStyle = gold ? C.gold : 'rgba(246,239,223,0.25)'; ctx.lineWidth = 2; rr(cx - w / 2, yy, w, ch, 14); ctx.stroke();
    const h0 = big ? 74 : 50;
    text(c.name, cx, yy + h0 * 0.33, nf, C.gold, 'center');
    lines.forEach((l, i) => text(l, cx, yy + h0 * 0.74 + i * lh, hf, C.paper, 'center', 'body'));
    for (const D of st.pl) {
      const left = D.k === 0, ph = 40 * sz, cxp = left ? 10 + 222 * sz / 2 : W - 10 - 222 * sz / 2;
      let y = H - 6 - ph - (big ? 28 : 18);
      if (!dlrCpu(D.k) && m.round <= 2) {
        const kk = dlrKeys(D.k);
        dlrChip(kk.touch ? NAMES[D.k] + ': ▲ ▼ swim · tap leap' : big ? NAMES[D.k] + ': ' + kk.move + ' · ' + kk.act + ' leap' : NAMES[D.k] + ': ' + kk.move + ' swim up / dive · ' + kk.act + ' to leap', cxp, y, big, PCOL[D.k], false);
        y -= big ? 44 : 28;
      }
      if (D.gold) dlrChip(D.gold >= 2 ? 'Gold for ' + NAMES[D.k] + ': gold fins + a head start!' : 'Gold for ' + NAMES[D.k] + ': gold fins (quick leaps)!', cxp, y, big, C.gold, true);
    }
    ctx.globalAlpha = 1;
  }
}
// the early-round key reminder over a rider's panel
function dlrKeyChip(kk, D, cxp, y, big) {
  dlrChip(kk.touch ? '▲ ▼ swim  ·  tap leap to jump' : kk.move + ' swim  ·  ' + kk.act + ' to leap', cxp, y, big, PCOL[D.k], false);
}

/* ---------- sounds ---------- */
Sfx.extra.dolphinraceKick = function (p) { this.tone(260 * p, 0.12, 'sine', 0.04, 520 * p); this.tone(1400 * p, 0.06, 'sine', 0.025, 1900 * p, 0.04); };
Sfx.extra.dolphinraceLeap = function (p) { this.tone(1500 * p, 0.07, 'sine', 0.035, 2300 * p); this.tone(1900 * p, 0.08, 'sine', 0.03, 2600 * p, 0.08); };
Sfx.extra.dolphinraceSplash = function (p) { this.tone(420 * p, 0.18, 'sawtooth', 0.015, 120 * p); this.tone(200 * p, 0.14, 'triangle', 0.04, 90 * p, 0.02); };
Sfx.extra.dolphinraceHoop = function (p) { [988, 1319, 1760].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.045, null, i * 0.04)); };
Sfx.extra.dolphinraceBump = function (p) { this.tone(240 * p, 0.12, 'triangle', 0.05, 140 * p); this.tone(520 * p, 0.06, 'sine', 0.02, 300 * p, 0.03); };
Sfx.extra.dolphinraceWeed = function (p) { this.tone(300 * p, 0.16, 'triangle', 0.04, 200 * p); this.tone(180 * p, 0.12, 'sine', 0.03, 140 * p, 0.06); };
Sfx.extra.dolphinraceGull = function (p) { this.tone(1700, 0.08, 'sawtooth', 0.015, 1200); this.tone(1500, 0.08, 'sawtooth', 0.012, 1100, 0.1); this.tone(220 * p, 0.1, 'triangle', 0.04, 150 * p); };
Sfx.extra.dolphinraceFlip = function (p) { this.tone(600 * p, 0.1, 'triangle', 0.035, 1200 * p); };
Sfx.extra.dolphinraceBonk = function () { this.tone(330, 0.08, 'triangle', 0.04, 220); this.tone(280, 0.1, 'triangle', 0.04, 200, 0.04); };
Sfx.extra.dolphinraceGold = function () { this.tone(784, 0.1, 'triangle', 0.05); this.tone(1046, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318, 0.16, 'triangle', 0.04, null, 0.16); };
Sfx.extra.dolphinraceFinish = function (p) { [523, 659, 784, 1047].forEach((f, i) => this.tone(f * p, 0.14, 'triangle', 0.05, null, i * 0.07)); this.tone(1800 * p, 0.1, 'sine', 0.03, 2600 * p, 0.32); };
