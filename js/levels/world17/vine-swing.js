/* Pip & Bo - Level 17-4 Vine Swing (versus, World 17 Jungle Jamboree). */
'use strict';

/* ===== 17-4 Vine Swing (mode 'vine', versus, best of 5) =====
   Gavyn's pick: swing on a vine, let go at the right moment and fly as far as you can, with a scrolling screen.
   Side view of a sunny jungle field. A big tree with a treehouse deck stands at the left; Pip and Bo each hang from their
   own vine on its long branch (Pip on the back vine, Bo on the front one) and swing at the same time. def.ownStep: the
   mode runs the whole live tick, the camera and the picture; the platformer bodies are hidden.
     pump    ◀ ▶: pressing the way you are swinging adds energy, pressing against it brakes. The push is strongest through
             the bottom and fades near the top of the swing (a soft cap), so a steady rhythm builds a big swing and
             mashing or holding one key does not.
     let go  jump (or the action) while swinging forward. A press on the backswing only says "Wait for the forward
             swing!". The release angle and speed set the flight: early is flat and fast, late is high and short; the
             best spot is about a third of the way up. A pop says Perfect / A bit early / A bit late.
     in air  ◀ ▶ nudge a little, ▼ tucks (a cannonball: falls a bit faster, cuts through wind, bigger boings), and the
             action (or jump) opens a big leaf ONCE per flight: a floaty glide that is best opened at the top of the arc
             (opened while still rising, it catches the air and slows you).
   A 10 s swing window per round (the swing clock); at the bell anyone still swinging lets go at the bottom of the next
   forward swing. Landings: grass strips, mossy logs ("Thump!"), mud puddles ("Splat!", the distance still counts),
   the deck ("Plop!", 0 m). Distance is measured from the deck edge, flags show each landing with metres.
   Rounds: round 1 Morning Swing (plain, with a dotted arc hint for each person), then four of Windy Day (tail- or
   headwind, shown by blowing leaves), Stretchy Vine (bungee vines), River Crossing (a splash counts to the near bank;
   Hugo the hippo's belly bounces you), Bouncy Mushrooms, Toucan Taxi (fly into a toucan for a short carry) and Night
   Fireflies (swarms give a sparkle push), shuffled. Longest landing wins; within 0.1 m is a tie (replayed). A second
   tie in a row goes to the longest swing this match, else a sudden-death Last Swing.
   Soft fails only: a splash brings Coco the capybara to paddle you to the bank, mud is a giggle. Nobody is hurt.
   Catch-up help, gold and announced (round card, GO pop, gold vine, HUD edge): 1 round behind = Gold vine (pumping
   1.6x stronger, a slightly bigger top swing); 2+ behind also shows the gold arc hint and the sweet spot.
   Shared pan-and-zoom camera: it fits both swingers and flyers (zooming out as they sail right) and shows an edge
   marker when one is off screen.
   Every top-level name is prefixed vine / VINE, every sound Sfx.extra.vine*. Rule randomness only from
   MODES.vine.rand (field, twists, wind); looks use their own vineVR. */
const VINE_D = Math.PI / 180;
const VINE = {
  px: 172, py: -520, R: 290,                 // the vine knot on the branch, and the vine length to the body's middle
  hand: 29, feet: 17,                        // body middle to hands and to feet (px)
  a0: -40 * VINE_D,                          // the start: standing at the deck edge, vine pulled back
  gs: 1500, damp: 0.04,                      // swing gravity and air drag on the swing
  pump: 0.6, goldPump: 1.6,                  // pump push (rad/s²); the gold vine pushes 1.6x
  capLo: 40 * VINE_D, capHi: 86 * VINE_D, goldCap: 3 * VINE_D,   // the pump fades between these amplitudes (soft cap)
  stretchK: 55, stretchC: 2.4, stretchMax: 150,                   // Stretchy Vine: spring, damping, most stretch (px)
  gf: 850, drag: 0.05, nudge: 45, tuckG: 1.12, tuckWind: 0.4,     // flight
  glideT: 0.8, glideG: 0.45, glideVy: 0.8, glideUp: 3, glideDragUp: 1.2, glideDrag: 0.35, glideWind: 2.2,
  bounceE: 0.82, bounceMin: 430, bounceKick: 45, tuckBounce: 1.18,
  carryT: 1.0, carryV: 330, carryUp: 30, grabR: 40, sparkV: 70, flyR: 48,
  deckX0: -330, deckY: -281, logH: 16, M: 30, // the deck's left end and top; a log's height; px per metre
  window: 10, bellLate: 3, flyCap: 8, showT: 1.1, capT: 40, landT: 0.6, swings: 2, setT: 1.3,
  tie: 0.1, perfect: 6 * VINE_D,
};
const VINE_LANE = [-26, 0];                   // Pip's vine and landing strip sit a little further back (looks only)
const VINE_TWISTS = {
  plain: { name: 'Morning Swing', hint: 'Pump ◀ ▶ the way you swing, then jump to let go!' },
  wind: { name: 'Windy Day', hint: 'Watch the leaves! Glide with a tailwind, tuck (▼) in a headwind.' },
  stretchy: { name: 'Stretchy Vine', hint: 'Boing! Bungee vines sling you. Let go as it springs up!' },
  river: { name: 'River Crossing', hint: 'Land past the river! A splash counts to the near bank.' },
  mush: { name: 'Bouncy Mushrooms', hint: 'Land on a mushroom: BOING! Tuck (▼) for a bigger bounce.' },
  toucan: { name: 'Toucan Taxi', hint: 'Fly into a toucan for a free ride forward!' },
  night: { name: 'Night Fireflies', hint: 'Fly through the firefly swarms for a sparkle push!' },
  last: { name: 'Last Swing', hint: 'Tied again! One more swing decides it.' },
};
const VINE_MIX = ['wind', 'stretchy', 'river', 'mush', 'toucan', 'night'];
// looks-only randomness (leaves, sparkles): never MODES.vine.rand, so the rules' random numbers don't depend on looks
let vineVS = 20261117;
const vineVR = () => { vineVS = (Math.imul(vineVS, 1664525) + 1013904223) >>> 0; return vineVS / 4294967296; };
const vineHash = (a, b) => (((Math.imul(a + 11, 73856093) ^ Math.imul(b + 5, 19349663)) >>> 0) % 1000) / 1000;
// 1-player mode: the computer plays this swinger (no key reminders or hints for it)
const vineCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// phones: this mode's HUD and camera go bigger a little sooner than the shared HUD
const vineBig = () => (typeof stageScale === 'number' ? stageScale < 0.72 : hudBig());
// zoomed far out on a small screen the swingers would be tiny: draw them up to 1.6x bigger (looks only)
const vineHeroK = cam => clamp(0.62 / (cam.z * (typeof stageScale === 'number' ? stageScale : 1)), 1, 1.6);
const vineM = x => Math.max(0, x / VINE.M);   // world x -> metres from the deck edge
const vineFmt = d => d.toFixed(1) + ' m';

/* ---------- the field: built once per round with the rules' random numbers ---------- */
function vineBuild(tw, R) {
  const M = VINE.M, f = { tw, wind: 0, mud: [], logs: [], river: null, hippo: null, mush: [], toucans: [], flies: [],
    stretchy: tw === 'stretchy', night: tw === 'night', bouncers: [] };
  if (tw === 'wind') f.wind = (R() < 0.6 ? 1 : -1) * (70 + R() * 50);
  if (tw === 'river') {
    const x0 = (15 + R() * 4) * M, x1 = x0 + (8 + R() * 2.5) * M;
    f.river = { x0, x1 };
    f.hippo = { id: 9, x: (x0 + x1) / 2 + (R() - 0.5) * 2 * M, hw: 58, top: -34, kind: 'hippo' };
    f.bouncers.push(f.hippo);
  }
  if (tw === 'mush') {
    for (let i = 0; i < 4; i++) {
      const x = (12 + i * 8.2 + (R() - 0.5) * 3) * M, hw = 40 + R() * 10, top = -(52 + R() * 30);
      const m = { id: i, x, hw, top, kind: 'mush', col: i % 2 };
      f.mush.push(m); f.bouncers.push(m);
    }
  }
  if (tw === 'toucan') {
    for (let i = 0; i < 2; i++) {
      f.toucans.push({ id: 10 + i, cx: (i ? 26 + R() * 5 : 14 + R() * 5) * M, cy: -(230 + R() * 90), ax: 70 + R() * 40, ay: 30 + R() * 20,
        w: 1.2 + R() * 0.5, ph: R() * 6.28 });
    }
  }
  if (tw === 'night') {
    for (let i = 0; i < 4; i++) f.flies.push({ id: 20 + i, x: (11 + i * 7.5 + (R() - 0.5) * 3) * M, y: -(170 + R() * 200), ph: R() * 6.28 });
  }
  // mud puddles and mossy logs (not in the river, not on each other)
  const free = (x0, x1) => !(f.river && x1 > f.river.x0 - 30 && x0 < f.river.x1 + 30) &&
    f.mud.concat(f.logs).every(q => x1 < q.x0 - 40 || x0 > q.x1 + 40) && f.mush.every(m => x1 < m.x - m.hw - 10 || x0 > m.x + m.hw + 10);
  for (let n = 0, tries = 0; n < 2 && tries < 40; tries++) {
    const w = (2.6 + R() * 1.2) * M, x0 = (11 + R() * 30) * M;
    if (free(x0, x0 + w)) { f.mud.push({ x0, x1: x0 + w }); n++; }
  }
  for (let n = 0, tries = 0; n < 2 && tries < 40; tries++) {
    const w = (2 + R() * 0.8) * M, x0 = (7 + R() * 36) * M;
    if (free(x0, x0 + w)) { f.logs.push({ x0, x1: x0 + w }); n++; }
  }
  return f;
}
// a toucan's place at round time t (a lazy figure of eight)
function vineToucanPos(tc, t) {
  return { x: tc.cx + Math.sin(tc.w * t + tc.ph) * tc.ax, y: tc.cy + Math.sin(2 * (tc.w * t + tc.ph)) * tc.ay, vx: Math.cos(tc.w * t + tc.ph) * tc.ax * tc.w };
}
// what is under x: { y (top of it), kind }
function vineGroundAt(f, x) {
  if (x < 0 && x >= VINE.deckX0) return { y: VINE.deckY, kind: 'deck' };
  if (f.river && x >= f.river.x0 && x <= f.river.x1) return { y: 8, kind: 'splash' };
  for (const q of f.logs) if (x >= q.x0 && x <= q.x1) return { y: -VINE.logH, kind: 'log' };
  for (const q of f.mud) if (x >= q.x0 && x <= q.x1) return { y: 0, kind: 'mud' };
  return { y: 0, kind: 'grass' };
}

/* ---------- the swing (shared with the computer's planning) ---------- */
// how high this swing goes (rad), from its energy
function vineAmp(s) {
  const P = VINE, e = 0.5 * (s.r * s.w) * (s.r * s.w) + 0.5 * s.rv * s.rv + P.gs * (P.R - s.r * Math.cos(s.a));
  const c = 1 - e / (P.gs * P.R);
  return c <= -1 ? Math.PI : Math.acos(Math.min(1, c));
}
// one swing step. d: -1 / 0 / 1 (◀ / nothing / ▶), gold: the gold vine
function vineSwingStep(f, s, d, dt, gold) {
  const P = VINE;
  let tq = d * P.pump * (gold ? P.goldPump : 1);
  if (d * s.w > 0) {
    const A = vineAmp(s), hi = P.capHi + (gold ? P.goldCap : 0);
    tq *= clamp(1 - Math.pow(Math.max(0, (A - P.capLo) / (hi - P.capLo)), 2), 0.08, 1);
  }
  if (!f.stretchy) {
    s.w += (-P.gs / P.R * Math.sin(s.a) - P.damp * s.w + tq) * dt;
    s.a += s.w * dt;
    return;
  }
  // Stretchy Vine: the vine is a spring too
  const ar = s.r * s.w * s.w + P.gs * Math.cos(s.a) - P.stretchK * (s.r - P.R) - P.stretchC * s.rv;
  s.rv += ar * dt; s.r += s.rv * dt;
  if (s.r > P.R + P.stretchMax) { s.r = P.R + P.stretchMax; s.rv = Math.min(0, s.rv); }
  if (s.r < P.R * 0.85) { s.r = P.R * 0.85; s.rv = Math.max(0, s.rv); }
  s.w += ((-P.gs * Math.sin(s.a) - 2 * s.rv * s.w) / s.r - P.damp * s.w + tq * P.R / s.r) * dt;
  s.a += s.w * dt;
}
// where a swing puts the body's middle, and how fast it moves
function vineSwingBody(s) {
  const P = VINE, sa = Math.sin(s.a), ca = Math.cos(s.a);
  return { x: P.px + s.r * sa, y: P.py + s.r * ca, vx: s.r * s.w * ca + s.rv * sa, vy: -s.r * s.w * sa + s.rv * ca };
}
function vineNewBody(s) {
  const q = vineSwingBody(s);
  return { x: q.x, y: q.y, vx: q.vx, vy: q.vy, ft: 0, glide: 0, glideUsed: false, carry: null, used: new Array(32).fill(0), ev: null, evI: -1, tuck: false };
}
function vineCloneBody(b) { return Object.assign({}, b, { used: b.used.slice(), carry: b.carry ? Object.assign({}, b.carry) : null }); }

/* ---------- flight (shared with the computer's planning) ---------- */
// one flight step for body b. inp { left, right, down, glide (open the leaf now), drop (let go of a toucan) } or null.
// t: round time (toucans move). Returns null, or a landing { kind, x }. b.ev names a thing that happened this step.
function vineAir(f, b, inp, dt, t) {
  const P = VINE;
  b.ev = null; b.ft += dt;
  if (b.carry) {
    b.carry.t += dt;
    b.vx = P.carryV; b.vy = -P.carryUp; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.carry.t >= P.carryT || (inp && inp.drop && b.carry.t > 0.15)) { b.carry = null; b.ev = 'drop'; }
    return null;
  }
  if (inp && inp.glide && !b.glideUsed) { b.glideUsed = true; b.glide = P.glideT; b.ev = 'glide'; }
  let g = P.gf, wind = f.wind;
  b.tuck = !!(inp && inp.down) && b.glide <= 0;
  if (b.tuck) { g *= P.tuckG; wind *= P.tuckWind; }
  if (b.glide > 0) {
    b.glide -= dt; wind *= P.glideWind;
    if (b.vy < 0) { b.vy *= Math.exp(-P.glideUp * dt); b.vx *= Math.exp(-P.glideDragUp * dt); }
    else { g *= P.glideG; b.vy *= Math.exp(-P.glideVy * dt); b.vx *= Math.exp(-P.glideDrag * dt); }
  }
  const nudge = inp ? ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * P.nudge : 0;
  const feet0 = b.y + P.feet;
  b.vx += (wind + nudge) * dt; b.vy += g * dt;
  if (!b.tuck) b.vx *= Math.exp(-P.drag * dt);
  b.x += b.vx * dt; b.y += b.vy * dt;
  const feet = b.y + P.feet;
  // firefly swarms: a sparkle push (once each)
  for (const q of f.flies) {
    if (b.used[q.id] || Math.abs(b.x - q.x) > P.flyR || Math.abs(b.y - q.y) > P.flyR) continue;
    if (Math.hypot(b.x - q.x, b.y - q.y) > P.flyR) continue;
    b.used[q.id] = 1; b.vx += P.sparkV; b.vy = Math.min(b.vy, b.vy * 0.5 - 40); b.ev = 'spark'; b.evI = q.id;
  }
  // toucans: fly into one and it carries you a little way (once each)
  for (const q of f.toucans) {
    if (b.used[q.id]) continue;
    const tp = vineToucanPos(q, t);
    if (Math.abs(b.x - tp.x) > P.grabR || Math.hypot(b.x - tp.x, b.y - (tp.y + 20)) > P.grabR) continue;
    b.used[q.id] = 1; b.carry = { id: q.id, t: 0 }; b.glide = 0; b.ev = 'grab'; b.evI = q.id;
    return null;
  }
  // bouncy things: falling onto the top is a BOING (each one at most twice a flight)
  if (b.vy > 0) for (const q of f.bouncers) {
    if (b.used[q.id] >= 2 || Math.abs(b.x - q.x) > q.hw || feet0 > q.top + 2 || feet < q.top) continue;
    b.used[q.id]++;
    b.y = q.top - P.feet;
    b.vy = -Math.max(b.vy * P.bounceE * (b.tuck ? P.tuckBounce : 1), P.bounceMin * (b.tuck ? 1.1 : 1));
    b.vx = Math.max(b.vx, 150) + P.bounceKick;
    b.glide = 0; b.ev = 'boing'; b.evI = q.id;
    return null;
  }
  // landing
  const gr = vineGroundAt(f, b.x);
  if (feet >= gr.y && !(gr.kind === 'deck' && feet0 > gr.y + 4)) {
    b.y = gr.y - P.feet;
    return { kind: gr.kind, x: gr.kind === 'splash' ? f.river.x0 : gr.kind === 'deck' ? 0 : b.x };
  }
  if (b.y > 60) return { kind: 'grass', x: b.x }; // (under the deck edge: down on the grass)
  return null;
}
// a whole flight from body b at round time t with keys from pol(b) (or none): { d (m), kind, T, x }
function vineFlySim(f, b0, t, pol, maxT = VINE.flyCap) {
  const b = vineCloneBody(b0);
  for (let s = 0; s < maxT; s += DT) {
    const r = vineAir(f, b, pol ? pol(b) : null, DT, t + s);
    if (r) return { d: vineM(r.x), kind: r.kind, T: s, x: r.x };
  }
  return { d: vineM(b.x), kind: 'grass', T: maxT, x: b.x };
}
// the best moment to let go on the rest of this forward swing (no more pumping, no leaf): { a, d, dt (s from now) }
function vineBestRelease(f, s0, t0, gold) {
  const s = Object.assign({}, s0), out = { a: s.a, d: -1, dt: 0 };
  let t = t0;
  for (let i = 0; i < 360; i++) {
    if (i % 3 === 0 && s.w > 0.15) {
      const r = vineFlySim(f, vineNewBody(s), t, null);
      if (r.d > out.d + 0.01) { out.d = r.d; out.a = s.a; out.dt = t - t0; }
    }
    vineSwingStep(f, s, 0, DT, gold); t += DT;
    if (i > 6 && s.w <= 0) break;
  }
  return out;
}

/* ---------- the swingers ---------- */
function vineMakeSwinger(k) {
  return { k, status: 'ready', s: { a: VINE.a0, w: 0, r: VINE.R, rv: 0 }, b: null, d: null, kind: '', landX: 0, landT: 0,
    gold: 0, best: null, relA: null, amp: 0, maxAmp: 0, nopeT: 0, bellT: 0, prevW: 0, lastD: 0, pumpOk: 0, brake: 0,
    spin: 0, mud: false, rescue: null, marks: [], rbest: 0,
    // looks only (never read by the rules)
    pop: '', popT: 9, popCol: '#fff', popBig: false, sq: 0, cheer: 0 };
}
function vinePop(P, text, col, big) { P.pop = text; P.popCol = col || '#ffffff'; P.popT = 0; P.popBig = !!big; }
function vineRelease(st, P, why) {
  P.b = vineNewBody(P.s);
  st.vis.ev[P.k] = { a: P.s.a, w: P.s.w, r: P.s.r }; // (looks: the empty vine swings on)
  P.status = 'fly'; P.relA = P.s.a;
  st.stat.lets[P.k]++;
  Sfx.play('vineLet', P.k); rumble(P.k, 0.15, 0.35, 80);
  if (why === 'bell') { vinePop(P, 'Bell! Wheee!', '#ffe6a8'); return; }
  const best = P.best;
  if (best && best.d > 0) {
    const da = P.s.a - best.a;
    if (Math.abs(da) <= VINE.perfect) { vinePop(P, 'Perfect let-go!', C.gold, true); st.stat.perfect[P.k]++; Sfx.play('vinePerfect', P.k); }
    else if (da < 0) vinePop(P, P.s.a < 8 * VINE_D ? 'Too early: flat!' : 'A bit early!', '#ffe6a8');
    else vinePop(P, P.s.a > best.a + 25 * VINE_D ? 'Too late: high!' : 'A bit late!', '#ffe6a8');
  } else vinePop(P, 'Wheee!', '#ffffff');
  for (let i = 0; i < 6; i++) vineFx(st, P.b.x, P.b.y - 20 + VINE_LANE[P.k], (vineVR() - 0.5) * 120, -vineVR() * 120, 0.8, '#7fd65a', 4, 300, 'leaf');
}
function vineLand(st, P, r, live) {
  const b = P.b;
  P.status = 'land'; P.landT = 0; P.kind = r.kind; P.landX = r.kind === 'splash' ? b.x : r.x;
  P.d = Math.round(vineM(r.x) * 10) / 10;
  P.flagX = r.x;
  P.sq = 0.5;
  const k = P.k;
  if (live) {
    st.stat.best[k] = Math.max(st.stat.best[k], P.d);
    st.stat.total[k] += P.d; st.stat.n[k]++;
    if (r.kind === 'mud' || r.kind === 'splash') st.stat.splat[k]++;
    // the jungle record (kept in the browser by level name)
    if (P.d > (st.record ? st.record.d : 0) + 0.05) {
      st.record = { d: P.d, who: k }; st.newRecord = { k, d: P.d };
      store.set('vinebest:' + LEVELS[G.levelIndex].name, st.record);
    }
  }
  const lx = P.landX, ly = -2 + VINE_LANE[k];
  if (r.kind === 'mud') {
    P.mud = true; vinePop(P, 'Splat! Still counts!', '#d9a066', true); Sfx.play('vineSplat', k);
    for (let i = 0; i < 14; i++) vineFx(st, lx, ly, (vineVR() - 0.5) * 260, -60 - vineVR() * 200, 0.7, i % 2 ? '#7a5228' : '#9b6b3a', 4 + vineVR() * 3, 700, 'dot');
  } else if (r.kind === 'splash') {
    P.rescue = { t: 0, x: b.x }; vinePop(P, 'Splash! Still counts!', '#bfe8ff', true); Sfx.play('vineSplash', k);
    for (let i = 0; i < 16; i++) vineFx(st, lx, ly + 6, (vineVR() - 0.5) * 220, -80 - vineVR() * 260, 0.8, i % 3 ? '#bfe8ff' : '#ffffff', 3 + vineVR() * 3, 800, 'dot');
  } else if (r.kind === 'deck') {
    vinePop(P, 'Plop! Still on the deck!', '#ffe6a8'); Sfx.play('vineLand', k);
  } else {
    const better = P.marks.length && P.d > P.rbest + 0.05;
    vinePop(P, better ? 'New best!' : r.kind === 'log' ? 'Thump! Log landing!' : 'Nice landing!', better ? C.gold : PCOL[k] === C.pip ? '#ffd2c4' : '#d3e2ff', true);
    Sfx.play('vineLand', k);
    for (let i = 0; i < 8; i++) vineFx(st, lx, ly + (r.kind === 'log' ? -VINE.logH : 0), (vineVR() - 0.5) * 160, -40 - vineVR() * 90, 0.5, r.kind === 'log' ? '#8bbf5a' : '#b7e58e', 3, 500, 'dot');
  }
  st.cheer = 1;
  rumble(k, 0.25, 0.5, 120);
}
// keys as this mode reads them
function vineInput(p) {
  const i = p.input;
  return { left: !!i.left && !i.right, right: !!i.right && !i.left, down: !!i.down };
}
// one swinger for one tick (live)
function vineSwinger(st, P, p, dt) {
  const f = st.f;
  P.nopeT -= dt; P.pumpOk = Math.max(0, P.pumpOk - dt); P.brake = Math.max(0, P.brake - dt);
  const inp = vineInput(p), press = p.pendingJump || p.pendingAct;
  if (P.status === 'swing') {
    const d = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (d && d * P.s.w > 0.2) { P.pumpOk = 0.15; if (d !== P.lastD) Sfx.play('vinePump', P.k); }
    else if (d && d * P.s.w < -0.2) P.brake = 0.15;
    P.lastD = d;
    P.prevW = P.s.w;
    vineSwingStep(f, P.s, d, dt, P.gold > 0);
    P.amp = vineAmp(P.s); P.maxAmp = Math.max(P.maxAmp, P.amp);
    st.stat.amp[P.k] = Math.max(st.stat.amp[P.k], P.amp);
    // a fresh forward swing: where its best let-go is (for the Perfect pop, the gold sweet spot and the arc hint)
    if (P.prevW <= 0 && P.s.w > 0) P.best = vineBestRelease(f, P.s, st.t, P.gold > 0);
    if (press) {
      if (P.s.w > 0.15) { vineRelease(st, P, 'you'); return; }
      if (P.nopeT <= 0) { P.nopeT = 0.8; vinePop(P, 'Wait for the forward swing!', '#d9d3ef'); Sfx.play('vineNope', P.k); }
    }
    if (st.clock <= 0) {
      P.bellT += dt;
      if ((P.s.w > 0.15 && P.s.a >= 0) || P.bellT > VINE.bellLate) vineRelease(st, P, 'bell');
    }
    return;
  }
  if (P.status === 'fly') {
    const b = P.b;
    const r = vineAir(f, b, { left: inp.left, right: inp.right, down: inp.down, glide: press && !b.carry, drop: press && !!b.carry }, dt, st.t);
    if (b.ev) vineEvent(st, P, b.ev, b.evI);
    if (r) { vineLand(st, P, r, true); return; }
    if (b.ft > VINE.flyCap) {
      const gr = vineGroundAt(f, b.x);
      vineLand(st, P, { kind: gr.kind, x: gr.kind === 'splash' ? f.river.x0 : gr.kind === 'deck' ? 0 : b.x }, true);
    }
    return;
  }
  if (P.status === 'land') { P.landT += dt; if (P.landT >= VINE.landT) P.status = 'done'; }
}
function vineEvent(st, P, ev, i) {
  const b = P.b, k = P.k;
  if (ev === 'glide') { st.stat.glides[k]++; Sfx.play('vineGlide', k); vinePop(P, b.vy < -60 ? 'Leaf! (a bit soon)' : 'Leaf glide!', '#b7f59a'); }
  else if (ev === 'boing') {
    st.stat.boing[k]++; Sfx.play('vineBoing', k); rumble(k, 0.2, 0.4, 90);
    vinePop(P, i === 9 ? 'BOING! Thanks, Hugo!' : 'BOING!', '#ffd2f0', true);
    st.vis.sq[i] = 0.5;
    for (let n = 0; n < 8; n++) vineFx(st, b.x, b.y + VINE.feet + VINE_LANE[k], (vineVR() - 0.5) * 200, -vineVR() * 150, 0.5, n % 2 ? '#ffffff' : '#ff8fc7', 3, 300, 'spark');
  } else if (ev === 'grab') { st.stat.ride[k]++; Sfx.play('vineToucan', k); vinePop(P, 'Toucan Taxi!', '#ffd36b', true); st.vis.carried[k][i] = 1; }
  else if (ev === 'drop') { vinePop(P, 'Thanks, toucan!', '#ffd36b'); st.vis.gone[k][b.carry ? b.carry.id : i] = 1.6; }
  else if (ev === 'spark') {
    st.stat.ride[k]++; Sfx.play('vineSparkle', k); vinePop(P, 'Sparkle push!', '#fff3a0');
    for (let n = 0; n < 12; n++) { const a = vineVR() * 6.28, sp = 60 + vineVR() * 140; vineFx(st, b.x, b.y + VINE_LANE[k], Math.cos(a) * sp, Math.sin(a) * sp, 0.6, n % 2 ? '#fff3a0' : '#c9ff8a', 3, 0, 'spark'); }
  }
}
// where a swinger's body is (world, rules), and the picture's lane offset
function vineBodyPos(P) {
  if (P.status === 'ready' || P.status === 'swing') return vineSwingBody(P.s);
  if (P.b) return { x: P.b.x, y: P.b.y, vx: P.b.vx, vy: P.b.vy };
  return vineSwingBody(P.s);
}

/* ---------- camera ---------- */
// fits both swingers (the tree and its branch while anyone still swings), each flyer and a little room ahead of it,
// and the flags; zoomed all the way out it keeps the leader in view and shows an edge marker for the other
function vineCamera(st, dt, snap, pre) {
  const cam = st.cam, big = vineBig();
  let x0 = 1e9, x1 = -1e9, yTop = -150, lead = null, lx = -1e9;
  for (const P of st.pl) {
    const q = vineBodyPos(P), ly = VINE_LANE[P.k];
    if (P.status === 'ready' || P.status === 'swing') { x0 = Math.min(x0, -300); x1 = Math.max(x1, 430); yTop = Math.min(yTop, -600); }
    else if (P.status === 'fly') {
      x0 = Math.min(x0, q.x - 90); x1 = Math.max(x1, q.x + 170 + Math.max(0, q.vx) * 0.3); yTop = Math.min(yTop, q.y + ly - 90);
      if (q.x > lx) { lx = q.x; lead = q; }
    } else {
      x0 = Math.min(x0, P.landX - 120); x1 = Math.max(x1, P.landX + 120); yTop = Math.min(yTop, -260);
      if (P.landX > lx) { lx = P.landX; lead = { x: P.landX, y: -40 }; }
    }
  }
  const mx = big ? 40 : 56, top = big ? 64 : 54, bot = big ? 80 : 66, yBot = 34;
  const zx = (W - 2 * mx) / Math.max(200, x1 - x0), zy = (H - top - bot) / Math.max(200, yBot - yTop);
  const zMin = big ? 0.42 : 0.36, zMax = big ? 0.95 : 0.85;
  const z = clamp(Math.min(zx, zy), zMin, zMax);
  let cx = (x0 + x1) / 2;
  if (lead) { const hw = (W / 2 - mx) / z; cx = clamp(cx, lead.x + 120 - hw, lead.x - 60 + hw); }
  if (pre) cx = VINE.px + (W / 2 - W * 0.2) / z;
  const cy = yBot - (H / 2 - bot) / z;
  if (snap || cam.z == null) { cam.x = cx; cam.y = cy; cam.z = z; return; }
  const kp = 1 - Math.exp(-dt * 3), kz = 1 - Math.exp(-dt * 2.2);
  cam.z += (z - cam.z) * kz;
  cam.x += (cx - cam.x) * kp;
  cam.y += (yBot - (H / 2 - bot) / cam.z - cam.y) * Math.min(1, kp * 3);
}
const vineToScreen = (cam, x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });

/* ---------- looks: effects that never touch the rules ---------- */
function vineFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot', rot: vineVR() * 6.28 });
  if (v.fx.length > 360) v.fx.splice(0, v.fx.length - 360);
}
function vineVisNew() {
  const leaves = [];
  for (let i = 0; i < 18; i++) leaves.push({ x: vineVR() * W, y: vineVR() * H, s: 0.6 + vineVR() * 0.7, ph: vineVR() * 6.28, c: i % 3 });
  return { fx: [], leaves, sq: {}, carried: [{}, {}], gone: [{}, {}], t: 0, ev: [null, null] };
}
function vineVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  v.t += dt;
  const fr = Math.exp(-1.2 * dt);
  let n = 0;
  for (const q of v.fx) { q.life -= dt; q.vx *= fr; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += dt * 4; if (q.life > 0) v.fx[n++] = q; }
  v.fx.length = n;
  for (const k in v.sq) v.sq[k] = Math.max(0, v.sq[k] - dt);
  for (const g of v.gone) for (const k in g) g[k] = Math.max(0, g[k] - dt);
  // screen leaves drifting in the wind (a gentle fall on calm days)
  const wind = st.f ? st.f.wind : 0;
  for (const l of v.leaves) {
    l.x += (wind * 2.2 + Math.sin(v.t * 1.3 + l.ph) * 18) * dt * l.s; l.y += (26 + Math.sin(v.t + l.ph) * 10) * dt * l.s;
    if (l.x > W + 30) l.x = -30; if (l.x < -30) l.x = W + 30; if (l.y > H + 20) { l.y = -20; l.x = vineVR() * W; }
  }
  for (const P of st.pl) {
    const e = v.ev[P.k];
    if (e) { e.w += (-VINE.gs / VINE.R * Math.sin(e.a) - 0.6 * e.w) * dt; e.a += e.w * dt; e.r += (VINE.R - e.r) * Math.min(1, dt * 4); }
    P.popT += dt; P.sq *= Math.exp(-dt * 8); P.cheer = Math.max(0, P.cheer - dt);
    if (P.b && P.status === 'fly') P.spin += dt * (P.b.tuck ? 11 : 0);
    if (P.rescue) P.rescue.t += dt;
    if (P.status === 'fly' && P.b && P.b.glide > 0 && vineVR() < dt * 14) vineFx(st, P.b.x + (vineVR() - 0.5) * 30, P.b.y - 30 + VINE_LANE[P.k], -20, 30, 0.6, '#b7f59a', 3, 0, 'leaf');
  }
  st.cheer = Math.max(0, (st.cheer || 0) - dt * 0.6);
  if (st.say) { st.say.t += dt; if (st.say.t > 2.5) st.say = null; }
}

/* ---------- the tick ---------- */
function vineTick(dt, live) {
  const st = G.mst, f = st.f;
  st.t += dt;
  if (live) {
    st.lt += dt; st.at += dt;
    if (st.pl.some(P => P.status === 'swing')) {
      const was = st.clock;
      st.clock = Math.max(0, st.clock - dt);
      const sec = Math.ceil(st.clock);
      if (sec !== Math.ceil(was) && sec > 0 && sec <= 3) Sfx.play('tick');
      if (was > 0 && st.clock <= 0) { Sfx.play('vineBell'); st.bellT = 0; }
    }
    if (st.bellT != null) st.bellT += dt;
    if (st.setT > 0) {
      // between swings: both back on the deck for a moment ("Swing 2!"), then off they go
      st.setT -= dt;
      if (st.setT <= 0) vineStartSwing(st);
    } else for (const P of st.pl) vineSwinger(st, P, G.players[P.k], dt);
  }
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  vineCamera(st, dt, false, false);
  vineVisTick(st, dt);
  if (!live) return;
  // the round ends once both have landed and the flags are up
  if (st.pl.every(P => P.status === 'done')) {
    st.endT += dt;
    if (st.endT >= VINE.showT) { if (st.att + 1 < st.attN) vineNextSwing(st); else vineEndRound(st); }
    return;
  }
  // the safety bell: a round that somehow runs this long ends with what there is
  if (st.at > VINE.capT) {
    for (const P of st.pl) if (P.status !== 'done' && P.status !== 'land') {
      const q = vineBodyPos(P), gr = vineGroundAt(f, q.x);
      if (!P.b) P.b = vineNewBody(P.s);
      vineLand(st, P, { kind: gr.kind, x: gr.kind === 'splash' ? f.river.x0 : gr.kind === 'deck' ? 0 : q.x }, true);
    }
    st.endT = VINE.showT; // (straight on: the next swing or the round's end, on the next tick)
  }
}
// the round's next swing: marks kept, both back on the deck with a fresh swing clock
function vineNextSwing(st) {
  st.pl = st.pl.map(P => {
    const N = vineMakeSwinger(P.k);
    N.gold = P.gold; N.marks = P.marks.concat([{ x: P.flagX, d: P.d || 0, kind: P.kind }]); N.rbest = Math.max(P.rbest, P.d || 0);
    return N;
  });
  st.att++; st.at = 0; st.clock = VINE.window; st.bellT = null; st.endT = 0; st.setT = VINE.setT; st.winFlag = -1;
  st.vis.ev = [null, null];
  Sfx.play('roundStart');
}
function vineStartSwing(st) {
  for (const P of st.pl) {
    P.status = 'swing';
    P.best = vineBestRelease(st.f, P.s, st.t, P.gold > 0);
  }
  Sfx.play('vineGo');
}
function vineEndRound(st) {
  const [A, B] = st.pl, a = Math.max(A.d || 0, A.rbest), b = Math.max(B.d || 0, B.rbest);
  if (Math.abs(a - b) < VINE.tie) { matchRoundEnd(-1, 'Too close to call: ' + vineFmt(Math.max(a, b)) + ' each!'); return; }
  const w = a > b ? 0 : 1, by = Math.abs(a - b);
  st.winFlag = w; st.winD = Math.max(a, b);
  matchRoundEnd(w, by < 0.6 ? 'By a whisker: ' + vineFmt(Math.max(a, b)) + '!' : 'Longest swing: ' + vineFmt(Math.max(a, b)) + ' (by ' + vineFmt(by) + ')!');
}

MODES.vine = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { best: [0, 0], total: [0, 0], n: [0, 0], perfect: [0, 0], boing: [0, 0], ride: [0, 0], splat: [0, 0], glides: [0, 0], lets: [0, 0], amp: [0, 0] };
    const mix = VINE_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['plain', ...mix.slice(0, 4)];
    st.forceTwist = this.testTwist || null;
    let rec = null; try { rec = store.get('vinebest:' + L.def.name); } catch (e) { rec = null; }
    st.record = rec && typeof rec.d === 'number' ? rec : null; st.newRecord = null;
    st.vis = vineVisNew();
  },
  resetRound(n, info) {
    const st = G.mst;
    st.round = n;
    st.twist = info.suddenDeath ? 'last' : (st.forceTwist || st.order[Math.min(n, st.order.length) - 1]);
    st.f = vineBuild(st.twist === 'last' ? 'plain' : st.twist, () => this.rand());
    st.pl = [0, 1].map(vineMakeSwinger);
    for (const P of st.pl) P.gold = info.suddenDeath ? 0 : Math.max(0, info.wins[1 - P.k] - info.wins[P.k]);
    st.t = 0; st.lt = 0; st.clock = VINE.window; st.bellT = null; st.endT = 0; st.winFlag = -1; st.winD = 0; st.goldSaid = false; st.say = null;
    st.att = 0; st.at = 0; st.attN = st.twist === 'last' ? 1 : VINE.swings; st.setT = 0;
    st.vis = vineVisNew();
    st.cam = { x: 0, y: 0, z: null };
    vineCamera(st, 0, true, true);
    // the swingers are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
    G.particles.length = 0;
  },
  go() {
    const st = G.mst;
    vineStartSwing(st);
    for (const P of st.pl) if (P.gold) vinePop(P, P.gold >= 2 ? 'Gold vine + sweet spot!' : 'Gold vine!', C.gold, true);
  },
  step(dt) { vineTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.pl) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (m.phase === 'end' || m.phase === 'over') { vineTick(dt, false); return; }
    // before GO: both stand at the deck edge holding their vines
    st.t += dt;
    vineVisTick(st, dt);
    vineCamera(st, dt, false, true);
    if (m.phase === 'count' && !st.goldSaid) { st.goldSaid = true; if (st.pl.some(P => P.gold)) Sfx.play('vineGold'); }
  },
  tiebreak() {
    const s = G.mst.stat;
    if (Math.abs(s.best[0] - s.best[1]) >= VINE.tie) return { winner: s.best[0] > s.best[1] ? 0 : 1, reason: 'Longest swing this match!' };
    return -1;
  },
  draw() { vineDrawWorld(); },
  drawTop() { vineDrawTop(); },
  hud() { vineHud(); },
  stats() {
    const s = G.mst.stat, mt = v => (v > 0 ? v.toFixed(1) + ' m' : '–');
    const out = [
      { label: 'Longest swing', values: s.best.map(mt) },
      { label: 'Perfect let-gos', values: s.perfect.slice() },
      { label: 'Boings & rides', values: [s.boing[0] + s.ride[0], s.boing[1] + s.ride[1]] },
      { label: 'Splats & splashes', values: s.splat.slice() },
    ];
    const b = s.best, w = Math.abs(b[0] - b[1]) < 0.05 ? -1 : b[0] > b[1] ? 0 : 1;
    if (w >= 0 && b[w] > 0) out.push('Longest of the match: ' + NAMES[w] + ', ' + vineFmt(b[w]) + '!');
    const st = G.mst;
    if (st.newRecord) out.push('New jungle record: ' + vineFmt(st.newRecord.d) + ' by ' + NAMES[st.newRecord.k] + '!');
    else if (st.record) out.push('Jungle record: ' + vineFmt(st.record.d) + '.');
    return out;
  },
  // test access for the bot harness and the computer brain (read-only helpers; no window globals)
  test: { VINE, VINE_TWISTS, build: vineBuild, amp: vineAmp, swingStep: vineSwingStep, swingBody: vineSwingBody, newBody: vineNewBody,
    cloneBody: vineCloneBody, air: vineAir, flySim: vineFlySim, bestRelease: vineBestRelease, toucanPos: vineToucanPos, groundAt: vineGroundAt },
};

/* ---------- drawing ---------- */
function vineCamXform(cam) { ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y); }
function vineView(cam, pad = 0) { const hw = W / 2 / cam.z + pad, hh = H / 2 / cam.z + pad; return { x0: cam.x - hw, x1: cam.x + hw, y0: cam.y - hh, y1: cam.y + hh }; }
const VINE_COL = {
  sky: ['#79cfae', '#c8ecb0', '#f6f4c4'], night: ['#0d1838', '#1d2c5a', '#3a3f6e'],
  canopyFar: '#6dbb84', canopyMid: '#4f9f62', canopyNear: '#3a8450', trunk: '#7a5734', trunkDk: '#553a20',
  grassA: '#8edb5e', grassB: '#7ccc50', grassDk: '#4f9a3c', soil: '#7a5a38', soilDk: '#5a4027',
  deck: '#c99358', deckDk: '#8a5a2c', leaf: '#5fbf4a', leafDk: '#3b8a33', vine: '#79b84a', vineDk: '#456f25',
  mud: '#8a5a32', mudHi: '#b07a48', water: '#4fb6d8', waterHi: '#a9e6f5', log: '#8f6338', moss: '#6fc24f',
};
function vineSky(st) {
  const cam = st.cam, night = st.f && st.f.night, cols = night ? VINE_COL.night : VINE_COL.sky;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, cols[0]); g.addColorStop(0.55, cols[1]); g.addColorStop(1, cols[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (night) {
    for (let i = 0; i < 60; i++) {
      const x = ((vineHash(i, 3) * (W + 80) - cam.x * 0.02) % (W + 80) + W + 80) % (W + 80) - 40, y = vineHash(i, 7) * H * 0.6;
      ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(G.clock * (0.6 + (i % 4) * 0.3) + i));
      ctx.fillStyle = '#fff'; circle(x, y, 0.8 + vineHash(i, 9) * 1.2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,250,220,0.18)'; circle(780, 90, 46); ctx.fill();
    ctx.fillStyle = '#fff8dc'; circle(780, 90, 30); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,150,0.35)'; circle(770, 84, 6); ctx.fill(); circle(790, 98, 4); ctx.fill();
  } else {
    // sun rays through the canopy
    ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#fffbe0';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 300 + 140 - cam.x * 0.05) % 1200 + 1200) % 1200 - 120;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 200, H); ctx.lineTo(x + 90, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,250,200,0.5)'; circle(800, 70, 50); ctx.fill(); ctx.fillStyle = '#fff6c4'; circle(800, 70, 30); ctx.fill();
  }
  // far canopy layers (parallax): big round treetops
  const layers = [[0.12, night ? '#203a48' : VINE_COL.canopyFar, 300, 120, 1], [0.3, night ? '#18303a' : VINE_COL.canopyMid, 360, 90, 2]];
  for (const [par, col, base, rr0, seed] of layers) {
    const gy = (base - cam.y * 0.08 * par) , span = 1400;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = -60; x <= W + 60; x += 30) {
      const wx = x + cam.x * par, h = Math.sin(wx * 0.006 + seed) * 26 + Math.sin(wx * 0.017 + seed * 3) * 14;
      ctx.lineTo(x, gy - h);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // round treetops along it
    for (let i = 0; i < 9; i++) {
      const wx = ((i * 190 + seed * 70 - cam.x * par) % span + span) % span - 120;
      const h = Math.sin((wx + cam.x * par) * 0.006 + seed) * 26;
      circle(wx, gy - h - rr0 * 0.25, rr0 * (0.55 + vineHash(i, seed) * 0.4)); ctx.fill();
    }
  }
  // hanging vines from the top edge (parallax)
  ctx.strokeStyle = night ? 'rgba(60,100,80,0.6)' : 'rgba(60,130,60,0.55)'; ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const x = ((i * 170 + 40 - cam.x * 0.45) % 1190 + 1190) % 1190 - 60, len = 40 + vineHash(i, 4) * 70, sw = Math.sin(G.clock * 0.9 + i) * 4;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + sw, len / 2, x + sw * 1.5, len); ctx.stroke();
    ctx.fillStyle = night ? 'rgba(60,100,80,0.7)' : 'rgba(80,160,70,0.8)';
    ctx.beginPath(); ctx.ellipse(x + sw * 1.5 + 4, len, 7, 3.5, 0.5, 0, Math.PI * 2); ctx.fill();
  }
}
function vineLeafShape(x, y, len, wid, ang, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -wid, len, 0); ctx.quadraticCurveTo(len * 0.5, wid, 0, 0); ctx.fill();
  ctx.restore();
}
// the ground: two landing strips (back for Pip, front for Bo), stripes every 5 m, soil under them
function vineDrawGround(st, v) {
  const x0 = Math.max(v.x0, -700), x1 = v.x1;
  ctx.fillStyle = VINE_COL.soil; ctx.fillRect(x0, 4, x1 - x0, v.y1 - 4);
  ctx.fillStyle = VINE_COL.soilDk; for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) { circle(x + 20, 30 + (x % 120 ? 6 : 16), 5); ctx.fill(); }
  // grass band from the back strip to the front
  const top = VINE_LANE[0] - 14;
  for (let x = Math.floor(x0 / (5 * VINE.M)) * 5 * VINE.M; x < x1; x += 5 * VINE.M) {
    ctx.fillStyle = Math.round(x / (5 * VINE.M)) % 2 ? VINE_COL.grassA : VINE_COL.grassB;
    ctx.fillRect(x, top, 5 * VINE.M + 1, 8 - top);
  }
  ctx.fillStyle = 'rgba(40,90,30,0.18)'; ctx.fillRect(x0, VINE_LANE[0] + 2, x1 - x0, 3); // the line between the two strips
  ctx.fillStyle = VINE_COL.grassDk; ctx.fillRect(x0, 6, x1 - x0, 4);
  // grass tufts
  ctx.strokeStyle = VINE_COL.grassDk; ctx.lineWidth = 2;
  for (let x = Math.floor(x0 / 37) * 37; x < x1; x += 37) {
    const h = vineHash(Math.round(x / 37), 2);
    if (h < 0.4) continue;
    const y = top + 4 + h * 14;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 7); ctx.moveTo(x, y); ctx.lineTo(x + 1, y - 9); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 6); ctx.stroke();
    if (h > 0.85) { ctx.fillStyle = ['#ff8fc7', '#ffd36b', '#ffffff'][Math.round(h * 100) % 3]; circle(x + 1, y - 10, 3); ctx.fill(); }
  }
  // the start line under the deck edge
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-3, top, 6, 8 - top);
}
function vineDrawMud(q) {
  const cx = (q.x0 + q.x1) / 2, hw = (q.x1 - q.x0) / 2;
  for (const ly of VINE_LANE) {
    ctx.fillStyle = VINE_COL.mud; ctx.beginPath(); ctx.ellipse(cx, ly + 1, hw, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = VINE_COL.mudHi; ctx.beginPath(); ctx.ellipse(cx - hw * 0.3, ly - 1, hw * 0.35, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    const b = (G.clock * 0.7 + cx * 0.01) % 1;
    ctx.strokeStyle = 'rgba(255,230,190,' + (0.6 * (1 - b)) + ')'; ctx.lineWidth = 1.5; circle(cx + hw * 0.3, ly + 1 - b * 3, 2 + b * 4); ctx.stroke();
  }
}
function vineDrawLog(q) {
  const w = q.x1 - q.x0, h = VINE.logH;
  for (const ly of VINE_LANE) {
    ctx.fillStyle = VINE_COL.log; rr(q.x0, ly - h, w, h + 2, 7); ctx.fill();
    ctx.strokeStyle = '#5e3e1e'; ctx.lineWidth = 2; rr(q.x0, ly - h, w, h + 2, 7); ctx.stroke();
    ctx.fillStyle = '#c99a62'; ctx.beginPath(); ctx.ellipse(q.x1 - 4, ly - h / 2 + 1, 5, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8f6338'; ctx.lineWidth = 1; circle(q.x1 - 4, ly - h / 2 + 1, 2.5); ctx.stroke();
    ctx.fillStyle = VINE_COL.moss;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(q.x0 + 8 + i * (w - 20) / 3, ly - h + 1, 9, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}
function vineDrawRiver(st) {
  const r = st.f.river; if (!r) return;
  const w = r.x1 - r.x0, t = G.clock;
  ctx.fillStyle = VINE_COL.soilDk; ctx.fillRect(r.x0 - 6, VINE_LANE[0] - 14, w + 12, 60);
  const g = ctx.createLinearGradient(0, VINE_LANE[0] - 8, 0, 50);
  g.addColorStop(0, VINE_COL.water); g.addColorStop(1, '#2f7fa8');
  ctx.fillStyle = g; ctx.fillRect(r.x0, VINE_LANE[0] - 8, w, 58);
  ctx.strokeStyle = VINE_COL.waterHi; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const y = VINE_LANE[0] - 4 + i * 12;
    ctx.beginPath();
    for (let x = r.x0; x <= r.x1; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.05 + t * 2 + i) * 1.6);
    ctx.stroke();
  }
  // lily pads with frogs
  for (let i = 0; i < 3; i++) {
    const x = r.x0 + w * (0.15 + i * 0.35), y = VINE_LANE[i % 2] - 2 + Math.sin(t * 1.5 + i) * 1.2;
    ctx.fillStyle = '#5fbf4a'; ctx.beginPath(); ctx.ellipse(x, y, 16, 5, 0, 0.3, Math.PI * 2 - 0.1); ctx.lineTo(x, y); ctx.fill();
    if (i !== 1) vineDrawFrog(x, y - 3, i);
  }
  // banks
  ctx.fillStyle = VINE_COL.grassDk; ctx.fillRect(r.x0 - 6, VINE_LANE[0] - 14, 6, 22); ctx.fillRect(r.x1, VINE_LANE[0] - 14, 6, 22);
}
function vineDrawFrog(x, y, ph) {
  const hop = Math.max(0, Math.sin(G.clock * 2.2 + ph * 2)) > 0.97 ? -4 : 0;
  ctx.save(); ctx.translate(x, y + hop);
  ctx.fillStyle = '#7fd65a'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  for (const s of [-1, 1]) { ctx.fillStyle = '#7fd65a'; circle(s * 3.5, -4, 2.8); ctx.fill(); ctx.fillStyle = '#fff'; circle(s * 3.5, -4.4, 1.7); ctx.fill(); ctx.fillStyle = C.ink; circle(s * 3.5, -4.2, 0.9); ctx.fill(); }
  ctx.strokeStyle = '#2f6b25'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}
// Hugo the hippo floats on his back in the river: his round belly is a bouncy pad
function vineDrawHippo(st) {
  const hp = st.f.hippo; if (!hp) return;
  const sq = (st.vis.sq[9] || 0) / 0.5, bob = Math.sin(G.clock * 1.6) * 2, y = (VINE_LANE[0] + VINE_LANE[1]) / 2 + 6 + bob;
  ctx.save(); ctx.translate(hp.x, y);
  // body (back down in the water), the pink belly up
  ctx.fillStyle = '#9d8fbf'; ctx.beginPath(); ctx.ellipse(0, -14 + sq * 6, hp.hw, 26 - sq * 6, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5b8cf'; ctx.beginPath(); ctx.ellipse(0, -16 + sq * 6, hp.hw * 0.72, 18 - sq * 5, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-12, -28 + sq * 8, 14, 4, -0.2, 0, Math.PI * 2); ctx.fill();
  // little legs up
  ctx.fillStyle = '#9d8fbf';
  for (const lx of [-34, -16, 16, 34]) { rr(lx - 5, -38 + sq * 8 + Math.abs(lx) * 0.25, 10, 16, 4); ctx.fill(); }
  // head at the right, smiling with closed eyes
  ctx.fillStyle = '#a99cc9'; ctx.beginPath(); ctx.ellipse(hp.hw + 6, -6, 22, 16, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9d8fbf'; circle(hp.hw - 2, -20, 5); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(hp.hw + 2, -10, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(hp.hw + 14, -2, 5, 0.2, Math.PI - 0.6); ctx.stroke();
  ctx.fillStyle = 'rgba(255,140,170,0.6)'; circle(hp.hw + 6, -2, 3); ctx.fill();
  ctx.fillStyle = '#6a5d8c'; circle(hp.hw + 24, -10, 1.6); ctx.fill(); circle(hp.hw + 22, -4, 1.6); ctx.fill();
  ctx.restore();
  vineLabelWorld('Hugo', hp.x, y - 48, '#f5b8cf');
}
function vineLabelWorld(str, x, y, col) {
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.strokeText(str, x, y); ctx.fillStyle = col; ctx.fillText(str, x, y);
}
function vineDrawMushroom(st, m, ly) {
  const sq = (st.vis.sq[m.id] || 0) / 0.5, top = m.top + sq * 8, h = -top;
  ctx.save(); ctx.translate(m.x, ly);
  // stem with a sleepy smile
  ctx.fillStyle = '#fff1d6'; rr(-12, top + 14, 24, h - 12, 8); ctx.fill();
  ctx.strokeStyle = '#d8c09a'; ctx.lineWidth = 2; rr(-12, top + 14, 24, h - 12, 8); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 5, top + h * 0.5 + 2, 2, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, top + h * 0.5 + 8, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  // the cap
  const col = m.col ? ['#ff7aa8', '#c04c78'] : ['#ff9a52', '#c7612a'];
  ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(0, top + 20, m.hw * (1 + sq * 0.15), 20 - sq * 6, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col[1]; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#fff';
  for (const [dx, dy, r] of [[-0.55, -0.35, 5], [0, -0.7, 6], [0.5, -0.4, 4.5]]) { ctx.beginPath(); ctx.ellipse(dx * m.hw, top + 20 + dy * 20, r, r * 0.75, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function vineDrawToucan(x, y, s, flap, face) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (face || 1), s);
  // wings
  const wy = Math.sin(flap) * 12;
  ctx.fillStyle = '#2b2a3a';
  ctx.beginPath(); ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-18, -14 - wy, -30, -4 - wy); ctx.quadraticCurveTo(-16, 4, -6, 4); ctx.fill();
  // body
  ctx.fillStyle = '#2b2a3a'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.ellipse(7, 1, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2a3a'; ctx.beginPath(); ctx.moveTo(-13, 2); ctx.lineTo(-24, 8); ctx.lineTo(-12, 7); ctx.fill();
  // the big beak
  ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(10, -5); ctx.quadraticCurveTo(32, -8, 36, 2); ctx.quadraticCurveTo(24, 3, 10, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff6b4a'; ctx.beginPath(); ctx.moveTo(30, -4); ctx.quadraticCurveTo(35, -2, 36, 2); ctx.lineTo(31, 2); ctx.fill();
  ctx.fillStyle = '#7fd6ff'; circle(8, -4, 3.2); ctx.fill(); ctx.fillStyle = C.ink; circle(8.6, -4, 1.6); ctx.fill();
  // wing in front
  ctx.fillStyle = '#3c3a52'; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-10, -18 - wy * 1.2, -20, -10 - wy); ctx.quadraticCurveTo(-10, 2, -4, 3); ctx.fill();
  // feet
  ctx.strokeStyle = '#7c8fb0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, 10); ctx.lineTo(-3, 15); ctx.moveTo(3, 10); ctx.lineTo(3, 15); ctx.stroke();
  ctx.restore();
}
function vineDrawFireflies(st, sw) {
  const f = st.f; if (!f.flies.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const q of f.flies) for (const k of [0, 1]) {
    const used = st.pl[k].b && st.pl[k].b.used[q.id], y = q.y + VINE_LANE[k];
    const g = ctx.createRadialGradient(q.x, y, 2, q.x, y, VINE.flyR + 10);
    g.addColorStop(0, used ? 'rgba(200,255,140,0.10)' : 'rgba(230,255,150,' + (sw ? 0.22 : 0.3) + ')'); g.addColorStop(1, 'rgba(200,255,120,0)');
    ctx.fillStyle = g; circle(q.x, y, VINE.flyR + 10); ctx.fill();
    for (let i = 0; i < 9; i++) {
      const a = G.clock * (0.8 + i * 0.13) + i * 2.4 + q.ph, r = 10 + (i % 4) * 9;
      const fx = q.x + Math.cos(a) * r, fy = y + Math.sin(a * 1.3) * r * 0.7;
      ctx.fillStyle = used ? 'rgba(220,255,160,0.35)' : 'rgba(250,255,170,' + (0.6 + 0.4 * Math.sin(G.clock * 6 + i)) + ')';
      circle(fx, fy, 2.2); ctx.fill();
    }
  }
  ctx.restore();
}
// distance posts every 5 m along the front strip, the jungle record flag
function vineDrawPosts(st, v) {
  const step = 5 * VINE.M;
  for (let x = Math.max(step, Math.floor(v.x0 / step) * step); x < v.x1; x += step) {
    const m = Math.round(x / VINE.M), big = m % 10 === 0;
    ctx.fillStyle = '#c9b06a'; ctx.fillRect(x - 2.5, -22, 5, 30);
    ctx.fillStyle = '#a88f4a'; ctx.fillRect(x - 3, -14, 6, 2); ctx.fillRect(x - 3, -4, 6, 2);
    if (big) {
      ctx.fillStyle = '#fff6d8'; rr(x - 17, -40, 34, 18, 5); ctx.fill(); ctx.strokeStyle = '#8a6a2c'; ctx.lineWidth = 1.5; rr(x - 17, -40, 34, 18, 5); ctx.stroke();
      ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#5a4020'; ctx.fillText(m + ' m', x, -30.5);
    }
  }
  if (st.record && st.record.d > 1) {
    const x = st.record.d * VINE.M;
    if (x > v.x0 - 40 && x < v.x1 + 40) {
      ctx.fillStyle = '#efe3c0'; ctx.fillRect(x - 1.5, -88, 3, 92);
      const wv = Math.sin(G.clock * 4) * 3;
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x + 1.5, -88); ctx.quadraticCurveTo(x + 16, -84 + wv, x + 30, -80); ctx.lineTo(x + 1.5, -70); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; vineStar(x + 12, -80, 4);
    }
  }
}
function vineStar(x, y, r) { // a small star (named for this file: draws only with ctx)
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.48 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill();
}
// the big tree, its long branch with two vine knots, the treehouse deck, the monkey and parrots
function vineDrawTree(st, v) {
  if (v.x0 > 420) return;
  const night = st.f && st.f.night, P = VINE;
  // trunk
  ctx.fillStyle = VINE_COL.trunk;
  ctx.beginPath(); ctx.moveTo(-270, 10); ctx.quadraticCurveTo(-250, -300, -235, -640); ctx.lineTo(-160, -640); ctx.quadraticCurveTo(-170, -300, -140, 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = VINE_COL.trunkDk; ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-232 + i * 16, -40 - i * 60); ctx.quadraticCurveTo(-220 + i * 12, -140 - i * 70, -214 + i * 10, -220 - i * 80); ctx.stroke(); }
  // roots
  ctx.fillStyle = VINE_COL.trunk;
  for (const [x, w] of [[-300, 40], [-130, 36]]) { ctx.beginPath(); ctx.moveTo(x, 10); ctx.quadraticCurveTo(x + w * 0.5, -30, x + (x < -200 ? w + 30 : -10), -30); ctx.lineTo(x + (x < -200 ? w + 30 : 10), 10); ctx.fill(); }
  // the long branch (back one for Pip a little higher, the front one for Bo)
  for (const k of [0, 1]) {
    const dy = VINE_LANE[k];
    ctx.fillStyle = k ? VINE_COL.trunk : '#6a4b2c';
    ctx.beginPath(); ctx.moveTo(-180, P.py - 70 + dy); ctx.quadraticCurveTo(20, P.py - 40 + dy, P.px + 120, P.py - 12 + dy);
    ctx.lineTo(P.px + 124, P.py + dy); ctx.quadraticCurveTo(20, P.py - 18 + dy, -180, P.py - 34 + dy); ctx.closePath(); ctx.fill();
    // leaf tuft at the tip
    for (let i = 0; i < 5; i++) vineLeafShape(P.px + 118, P.py - 6 + dy, 26, 9, -0.9 + i * 0.45, i % 2 ? VINE_COL.leaf : VINE_COL.leafDk);
  }
  // canopy above
  ctx.fillStyle = night ? '#1f4a35' : VINE_COL.canopyNear;
  for (const [x, y, r] of [[-300, -690, 120], [-170, -730, 140], [-30, -690, 110], [90, -640, 80], [-380, -610, 90]]) { circle(x, y, r); ctx.fill(); }
  ctx.fillStyle = night ? '#2b5e45' : VINE_COL.leaf;
  for (const [x, y, r] of [[-250, -700, 70], [-120, -740, 80], [-20, -680, 60], [100, -650, 40]]) { circle(x, y, r); ctx.fill(); }
  // the treehouse: deck with planks, a railing at the back, a little leaf roof hut
  const dY = P.deckY;
  ctx.fillStyle = '#9b6b3a'; ctx.fillRect(P.deckX0 + 30, dY + 14, 10, 300); ctx.fillRect(-60, dY + 14, 10, 300);
  ctx.fillStyle = '#b07a48'; rr(P.deckX0 + 60, dY - 110, 140, 112, 6); ctx.fill();
  ctx.fillStyle = '#7a4f28'; rr(P.deckX0 + 110, dY - 64, 40, 64, 6); ctx.fill();
  ctx.fillStyle = '#ffe6a8'; rr(P.deckX0 + 76, dY - 92, 26, 22, 4); ctx.fill();
  ctx.fillStyle = night ? '#2b5e45' : '#4fae45';
  ctx.beginPath(); ctx.moveTo(P.deckX0 + 40, dY - 104); ctx.lineTo(P.deckX0 + 130, dY - 160); ctx.lineTo(P.deckX0 + 220, dY - 104); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 6; i++) vineLeafShape(P.deckX0 + 50 + i * 30, dY - 104, 22, 7, 1.2, VINE_COL.leafDk);
  // deck (with depth: the back strip is Pip's, the front Bo's)
  ctx.fillStyle = VINE_COL.deckDk; ctx.fillRect(P.deckX0, dY + VINE_LANE[0] - 6, -P.deckX0, 26 - VINE_LANE[0]);
  for (let x = P.deckX0; x < 0; x += 22) { ctx.fillStyle = (x / 22) % 2 ? VINE_COL.deck : '#d6a06a'; ctx.fillRect(x, dY + VINE_LANE[0] - 6, 21, -VINE_LANE[0] + 6); }
  ctx.fillStyle = '#e2b27a'; ctx.fillRect(P.deckX0, dY - 2, -P.deckX0, 4);
  ctx.fillStyle = VINE_COL.deckDk; ctx.fillRect(P.deckX0, dY + 2, -P.deckX0, 12);
  // railing at the left part only (the edge is open)
  ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(P.deckX0 + 4, dY - 40 + VINE_LANE[0]); ctx.lineTo(-120, dY - 40 + VINE_LANE[0]); ctx.stroke();
  for (let x = P.deckX0 + 4; x <= -120; x += 30) { ctx.beginPath(); ctx.moveTo(x, dY + VINE_LANE[0] - 4); ctx.lineTo(x, dY - 40 + VINE_LANE[0]); ctx.stroke(); }
  // rope ladder
  ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-100, dY + 14); ctx.lineTo(-104, 0); ctx.moveTo(-80, dY + 14); ctx.lineTo(-76, 0); ctx.stroke();
  for (let y = dY + 34; y < 0; y += 24) { ctx.beginPath(); ctx.moveTo(-102, y); ctx.lineTo(-78, y); ctx.stroke(); }
  // Mango the monkey on the railing, cheering when someone lands; two parrots on the branch
  vineDrawMonkey(-180, dY - 40 + VINE_LANE[0] - 2, st.cheer || 0);
  vineDrawParrot(-40, P.py - 36 + VINE_LANE[0], '#ff5f5f', '#5b95ff', 0);
  vineDrawParrot(60, P.py - 30 + VINE_LANE[0], '#5bd47a', '#ffd34d', 1.7);
}
function vineDrawMonkey(x, y, cheer) {
  const bob = reduceMotion ? 0 : cheer > 0 ? Math.abs(Math.sin(G.clock * 12)) * 8 : Math.sin(G.clock * 2) * 1.5;
  ctx.save(); ctx.translate(x, y - bob);
  ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-26, 10, -22, -10); ctx.stroke(); // tail
  ctx.fillStyle = '#9b6b3a'; ctx.beginPath(); ctx.ellipse(0, -2, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
  const up = cheer > 0 ? -1 : 0.4;
  ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-16, -6 + up * 16); ctx.moveTo(8, -6); ctx.lineTo(16, -6 + up * 16); ctx.stroke();
  ctx.fillStyle = '#9b6b3a'; circle(0, -20, 10); ctx.fill(); circle(-10, -22, 4.5); ctx.fill(); circle(10, -22, 4.5); ctx.fill();
  ctx.fillStyle = '#f2cf9e'; ctx.beginPath(); ctx.ellipse(0, -18, 7, 6, 0, 0, Math.PI * 2); ctx.fill(); circle(-10, -22, 2.4); ctx.fill(); circle(10, -22, 2.4); ctx.fill();
  ctx.fillStyle = C.ink; circle(-3, -21, 1.4); ctx.fill(); circle(3, -21, 1.4); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -17, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}
function vineDrawParrot(x, y, a, b, ph) {
  const tilt = Math.sin(G.clock * 1.4 + ph) * 0.15;
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  ctx.fillStyle = b; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(-8, 22); ctx.lineTo(1, 6); ctx.fill();
  ctx.fillStyle = a; ctx.beginPath(); ctx.ellipse(0, 0, 6, 9, 0.2, 0, Math.PI * 2); ctx.fill(); circle(2, -9, 5); ctx.fill();
  ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.moveTo(6, -10); ctx.quadraticCurveTo(11, -8, 7, -4); ctx.fill();
  ctx.fillStyle = C.ink; circle(3.5, -10, 1.2); ctx.fill();
  ctx.fillStyle = b; ctx.beginPath(); ctx.ellipse(-2, 1, 3.5, 6, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// Tilly the tapir, asleep at the far end of the field (she wakes up and waves at a very long swing)
function vineDrawTapir(st, v) {
  const x = 56 * VINE.M, y = VINE_LANE[0] - 2;
  if (x < v.x0 - 80 || x > v.x1 + 80) return;
  const awake = st.pl.some(P => P.status !== 'swing' && P.status !== 'ready' && P.landX > x - 260);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#3a3646'; ctx.beginPath(); ctx.ellipse(0, -18, 38, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2efe6'; ctx.beginPath(); ctx.ellipse(6, -20, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3646'; ctx.beginPath(); ctx.ellipse(-36, -14, 16, 12, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-52, -8, 9, 5, 0.5, 0, Math.PI * 2); ctx.fill();
  circle(-30, -26, 5); ctx.fill();
  ctx.fillStyle = '#3a3646'; for (const lx of [-22, -8, 14, 26]) { rr(lx - 4, -6, 8, 8, 3); ctx.fill(); }
  ctx.strokeStyle = '#e9e4f5'; ctx.lineWidth = 1.5;
  if (awake) { ctx.fillStyle = '#fff'; circle(-38, -17, 2.4); ctx.fill(); ctx.fillStyle = C.ink; circle(-38.5, -17, 1.2); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(-38, -17, 2.4, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.restore();
  if (!awake) { const zt = (G.clock * 0.6) % 1; ctx.globalAlpha = 1 - zt; vineLabelWorld('z', x - 40 + zt * 10, y - 46 - zt * 22, '#ffffff'); ctx.globalAlpha = 1; }
  else vineLabelWorld('Wow!', x - 40, y - 52, '#ffe6a8');
}
// a vine from the knot to the hands (a little bow in it), with leaves along it
function vineDrawVine(k, hx, hy, gold, stretchy, sag) {
  const P = VINE, kx = P.px, ky = P.py + VINE_LANE[k];
  const mx = (kx + hx) / 2 - sag * 10, my = (ky + hy) / 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = gold ? '#b9850f' : VINE_COL.vineDk; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, hx, hy); ctx.stroke();
  ctx.strokeStyle = gold ? C.gold : (stretchy ? '#b8e06a' : VINE_COL.vine); ctx.lineWidth = 4;
  if (stretchy) ctx.setLineDash([9, 5]);
  ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, hx, hy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  for (let i = 1; i < 6; i++) {
    const u = i / 6, x = (1 - u) * (1 - u) * kx + 2 * u * (1 - u) * mx + u * u * hx, y = (1 - u) * (1 - u) * ky + 2 * u * (1 - u) * my + u * u * hy;
    vineLeafShape(x, y, 12, 4.5, i % 2 ? 0.5 : Math.PI - 0.5, gold ? '#ffe08a' : (i % 2 ? VINE_COL.leaf : VINE_COL.leafDk));
  }
  // the knot
  ctx.fillStyle = gold ? C.gold : VINE_COL.vineDk; circle(kx, ky + 2, 5); ctx.fill();
}

/* the heroes: Pip and Bo in their own look, holding a vine, flying, tucked, gliding under a leaf, or landed */
function vineDrawHero(k, o) {
  const col = PCOL[k], dk = PDARK[k], s = o.s || 1.3;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0); ctx.scale(s * (o.face || 1), s);
  if (o.sq) ctx.scale(1 + o.sq * 0.3, 1 - o.sq * 0.3);
  const pose = o.pose;
  ctx.lineCap = 'round';
  if (pose === 'glide') {
    // a big leaf over the head, held with both hands
    ctx.strokeStyle = dk; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(-10, -26); ctx.moveTo(7, -8); ctx.lineTo(10, -26); ctx.stroke();
    ctx.fillStyle = '#5fcf4a'; ctx.strokeStyle = '#2f8a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-34, -24); ctx.quadraticCurveTo(0, -52, 34, -24); ctx.quadraticCurveTo(0, -32, -34, -24); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-30, -26); ctx.quadraticCurveTo(0, -40, 30, -26); ctx.stroke();
  }
  if (pose === 'hang' || pose === 'ready') {
    ctx.strokeStyle = dk; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-2, -22); ctx.moveTo(6, -8); ctx.lineTo(2, -22); ctx.stroke();
    ctx.fillStyle = col; circle(0, -22, 3.8); ctx.fill();
  }
  if (pose === 'fly') {
    ctx.strokeStyle = dk; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-19, -16); ctx.moveTo(8, -6); ctx.lineTo(19, -16); ctx.stroke();
  }
  if (pose === 'stand') {
    ctx.strokeStyle = dk; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-13, 6); ctx.moveTo(9, -4); ctx.lineTo(13, 6); ctx.stroke();
  }
  if (pose === 'cheer') {
    const wv = Math.sin(G.clock * 14) * 3;
    ctx.strokeStyle = dk; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-14, -20 + wv); ctx.moveTo(8, -6); ctx.lineTo(14, -20 - wv); ctx.stroke();
  }
  // feet
  ctx.fillStyle = dk;
  if (pose === 'tuck') { circle(-5, 9, 3.5); ctx.fill(); circle(5, 9, 3.5); ctx.fill(); }
  else {
    const kick = pose === 'hang' ? Math.sin(o.kick || 0) * 3 : 0;
    ctx.beginPath(); ctx.ellipse(-5 + kick, 13, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5 - kick, 13, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // ears (Bo) / sprout (Pip)
  if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; for (const ex of [-7, 7]) { circle(ex, -12, 4.6); ctx.fill(); ctx.stroke(); } }
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2.4;
  if (pose === 'tuck') { circle(0, 0, 13); ctx.fill(); ctx.stroke(); }
  else { rr(-11, -13, 22, 26, 8); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-8, -10, 8, 9, 4); ctx.fill();
  if (k === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(1, -18); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, -19, 5, 2.5, -0.5, 0, Math.PI * 2); ctx.fill(); }
  if (pose === 'tuck') { ctx.strokeStyle = dk; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 2, 10, 0.3, Math.PI - 0.3); ctx.stroke(); }
  // mud spots
  if (o.mud) { ctx.fillStyle = 'rgba(122,82,40,0.85)'; circle(-5, 6, 3); ctx.fill(); circle(6, 2, 2.4); ctx.fill(); circle(2, 10, 2); ctx.fill(); circle(-8, -4, 1.8); ctx.fill(); }
  // face
  const ey = -3, mood = o.mood || 'happy';
  if (mood === 'joy') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
    for (const ex of [-4, 5]) { ctx.beginPath(); ctx.arc(ex, ey + 1, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.fillStyle = 'rgba(90,30,40,0.85)'; ctx.beginPath(); ctx.arc(0.5, ey + 5, 3.8, 0, Math.PI); ctx.fill();
  } else {
    for (const ex of [-4, 5]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 3, 3.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + 1, ey + 0.4, 1.6); ctx.fill(); }
    if (mood === 'wow') { ctx.fillStyle = 'rgba(90,30,40,0.85)'; ctx.beginPath(); ctx.ellipse(0.5, ey + 6, 2.4, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (mood === 'grit') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2, ey + 6); ctx.lineTo(3, ey + 6); ctx.stroke(); }
    else { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0.5, ey + 4, 2.8, 0.2, Math.PI - 0.2); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-7, ey + 5, 1.9); ctx.fill(); circle(9, ey + 5, 1.9); ctx.fill();
  ctx.lineCap = 'butt';
  ctx.restore();
}
// Coco the capybara paddles a splashed swinger to the near bank
function vineDrawCapy(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#b07a48'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-26, -6, 12, 9, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a5a32'; circle(-22, -15, 3.5); ctx.fill();
  ctx.fillStyle = C.ink; circle(-28, -9, 1.5); ctx.fill(); ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(-37, -5, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb3c8'; circle(-4, -14, 3); ctx.fill(); ctx.fillStyle = '#ffd36b'; circle(-4, -14, 1.3); ctx.fill(); // a flower on her head
  ctx.restore();
}
function vineDrawWorld() {
  const st = G.mst; if (!st.f || !st.cam || !st.pl) return;
  const cam = st.cam, f = st.f;
  vineSky(st);
  ctx.save(); vineCamXform(cam);
  const v = vineView(cam, 60);
  vineDrawGround(st, v);
  if (f.river) vineDrawRiver(st);
  for (const q of f.mud) vineDrawMud(q);
  for (const q of f.logs) vineDrawLog(q);
  vineDrawPosts(st, v);
  vineDrawTapir(st, v);
  for (const m of f.mush) for (const k of [0, 1]) vineDrawMushroom(st, m, VINE_LANE[k]);
  if (f.hippo) vineDrawHippo(st);
  vineDrawTree(st, v);
  ctx.restore();
  if (f.night) { ctx.fillStyle = 'rgba(8,14,40,0.38)'; ctx.fillRect(0, 0, W, H); }
}
// the arc a person would fly if they let go now (round 1, or gold 2+), and the sweet spot on the swing
function vineDrawArc(st, P) {
  const f = st.f, b = vineNewBody(P.s), ly = VINE_LANE[P.k];
  if (P.s.w <= 0.15) return;
  ctx.fillStyle = PCOL[P.k];
  let t = st.t, lastX = b.x;
  for (let i = 0; i < 400; i++) {
    const r = vineAir(f, b, null, DT * 2, t); t += DT * 2;
    if (i % 4 === 0) { ctx.globalAlpha = 0.65; circle(b.x, b.y + ly, 3.2 / Math.max(0.5, st.cam.z)); ctx.fill(); }
    lastX = b.x;
    if (r) { lastX = r.x; break; }
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PCOL[P.k]; ctx.lineWidth = 3 / st.cam.z; circle(lastX, ly - 4, 10); ctx.stroke();
}
function vineDrawSweetSpot(st, P) {
  if (!P.best || P.best.d <= 0) return;
  const a = P.best.a, ly = VINE_LANE[P.k], x = VINE.px + VINE.R * Math.sin(a), y = VINE.py + VINE.R * Math.cos(a) + ly;
  ctx.strokeStyle = 'rgba(255,197,61,0.8)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(VINE.px, VINE.py + ly, VINE.R, Math.PI / 2 - a - VINE.perfect, Math.PI / 2 - a + VINE.perfect); ctx.stroke();
  ctx.fillStyle = C.gold; vineStar(x + 16 * Math.cos(a), y - 16 * Math.sin(a), 7);
}
function vineDrawTop() {
  const st = G.mst, m = G.match; if (!st.f || !st.cam || !st.pl) return;
  const cam = st.cam, f = st.f, big = vineBig(), zk = vineHeroK(cam);
  ctx.save(); vineCamXform(cam);
  // the swing arcs (faint) and hints for people
  for (const P of st.pl) {
    if (P.status !== 'swing' && P.status !== 'ready') continue;
    const help = !vineCpu(P.k) && (st.round === 1 && st.twist === 'plain' || P.gold >= 2);
    if (help && P.status === 'swing') { if (P.gold >= 2 || st.round === 1) vineDrawSweetSpot(st, P); vineDrawArc(st, P); }
  }
  // fireflies behind the swingers
  if (f.flies.length) vineDrawFireflies(st, false);
  // toucans (each lane has its own pair; one that gave a ride flies off for a moment)
  for (const tc of f.toucans) for (const k of [0, 1]) {
    const P = st.pl[k];
    if (P.b && P.b.carry && P.b.carry.id === tc.id) continue;
    const gone = st.vis.gone[k][tc.id] || 0;
    if (P.b && P.b.used[tc.id] && gone <= 0 && P.status === 'fly') continue;
    const tp = vineToucanPos(tc, st.t);
    ctx.globalAlpha = gone > 0 ? Math.min(1, gone) : 1;
    vineDrawToucan(tp.x + (gone > 0 ? (1.6 - gone) * 120 : 0), tp.y + VINE_LANE[k] - (gone > 0 ? (1.6 - gone) * 90 : 0), 1, G.clock * 12 + tc.ph, tp.vx >= 0 ? 1 : -1);
    ctx.globalAlpha = 1;
  }
  // flags where each landed (Pip's on the back strip); this round's earlier swing is a smaller flag
  for (const P of st.pl) for (const mk of P.marks) {
    const x = mk.x, y = VINE_LANE[P.k], h = 50;
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#f6efdf'; ctx.fillRect(x - 1, y - h, 2, h);
    ctx.fillStyle = PCOL[P.k]; ctx.beginPath(); ctx.moveTo(x + 1, y - h); ctx.lineTo(x + 18, y - h + 6); ctx.lineTo(x + 1, y - h + 12); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    if (st.winFlag === P.k && Math.abs(mk.d - st.winD) < 0.05 && !(P.d != null && Math.abs(P.d - st.winD) < 0.05)) { ctx.fillStyle = C.gold; vineStar(x, y - h - 8, 7); }
  }
  for (const P of st.pl) {
    if (P.status !== 'land' && P.status !== 'done') continue;
    const x = P.flagX, y = VINE_LANE[P.k], k = Math.min(1, P.landT / 0.3 + (P.status === 'done' ? 1 : 0)), h = 70 * k;
    ctx.fillStyle = '#f6efdf'; ctx.fillRect(x - 1.5, y - h, 3, h);
    const wv = Math.sin(G.clock * 5 + P.k) * 3;
    ctx.fillStyle = PCOL[P.k]; ctx.beginPath(); ctx.moveTo(x + 1.5, y - h); ctx.quadraticCurveTo(x + 14, y - h + 4 + wv, x + 26, y - h + 8); ctx.lineTo(x + 1.5, y - h + 18); ctx.closePath(); ctx.fill();
    if (st.winFlag === P.k && P.d != null && Math.abs(P.d - st.winD) < 0.05) { ctx.fillStyle = C.gold; vineStar(x, y - h - 8, 7); }
  }
  // the swingers, then the little effects (leaves, mud, splashes, sparkles)
  for (const P of st.pl) vineDrawSwinger(st, P, zk);
  for (const q of st.vis.fx) {
    const a = clamp(q.life / q.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'leaf') vineLeafShape(q.x, q.y, 10, 4, q.rot, q.col);
    else if (q.kind === 'spark') vineStar(q.x, q.y, q.size * (0.7 + 0.6 * a));
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // words, flag labels and pins in screen space (they read the same at any zoom)
  for (const P of st.pl) {
    if (P.status === 'land' || P.status === 'done') {
      const s = vineToScreen(cam, P.flagX, VINE_LANE[P.k] - 70), lab = vineFmt(P.d || 0), fs = big ? 18 : 14;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(lab).width + 14, other = st.pl[1 - P.k], oy = (other.status === 'land' || other.status === 'done') && Math.abs(other.flagX - P.flagX) * cam.z < w + 10 ? (P.k ? 0 : -(fs + 12)) : 0;
      const x = clamp(s.x + 14, w / 2 + 4, W - w / 2 - 4), y = s.y - 14 + oy;
      ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(x - w / 2, y - fs / 2 - 4, w, fs + 8, 8); ctx.fill();
      ctx.strokeStyle = PCOL[P.k]; ctx.lineWidth = 2; rr(x - w / 2, y - fs / 2 - 4, w, fs + 8, 8); ctx.stroke();
      text(lab, x, y + 0.5, fs, '#fff', 'center', 'body');
    }
  }
  for (const P of st.pl) if (P.popT < 1.1 && P.pop) {
    const q = vineHeroPos(st, P), s = vineToScreen(cam, q.x, q.y), k = P.popT / 1.1;
    ctx.globalAlpha = 1 - k * k;
    const fs = (P.popBig ? (big ? 26 : 20) : (big ? 21 : 16));
    let y = s.y - (big ? 52 : 42) * Math.max(1, zk * cam.z) - 22 * k;
    if (P.k === 0 && st.pl[1].popT < 1.1 && Math.abs(vineHeroPos(st, st.pl[1]).x - q.x) * cam.z < 140) y -= fs + 6; // (both at once: Pip's above)
    bigText(P.pop, clamp(s.x, 90, W - 90), Math.max(y, (G.matchHudBox ? G.matchHudBox.y1 : 50) + 16), fs, P.popCol, 1 + 0.25 * Math.max(0, 1 - k * 5));
    ctx.globalAlpha = 1;
  }
  // zoomed out: a pin over each swinger; off screen: an edge marker
  const pinA = clamp((0.62 - cam.z) / 0.12, 0, 1);
  for (const P of st.pl) {
    const q = vineHeroPos(st, P), s = vineToScreen(cam, q.x, q.y), pad = big ? 34 : 26;
    if (s.x > -10 && s.x < W + 10 && s.y > -10 && s.y < H + 10) {
      if (pinA > 0 && m && m.phase !== 'ready' && m.phase !== 'count' && P.status !== 'ready') {
        const r0 = big ? 11 : 8, px = s.x, py = s.y - 26 * zk * cam.z - r0 - 14;
        ctx.globalAlpha = pinA; ctx.fillStyle = PCOL[P.k];
        ctx.beginPath(); ctx.moveTo(px - 5, py + r0 - 2); ctx.lineTo(px + 5, py + r0 - 2); ctx.lineTo(px, py + r0 + 6); ctx.fill();
        circle(px, py, r0); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; circle(px, py, r0); ctx.stroke();
        text(NAMES[P.k][0], px, py + 0.5, big ? 14 : 11, '#fff', 'center'); ctx.globalAlpha = 1;
      }
      continue;
    }
    const ex = clamp(s.x, pad, W - pad), ey = clamp(s.y, pad + (big ? 60 : 50), H - pad - (big ? 70 : 56)), a = Math.atan2(s.y - ey, s.x - ex), r0 = big ? 20 : 15;
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; circle(ex, ey, r0 + 3); ctx.fill();
    ctx.fillStyle = PCOL[P.k]; circle(ex, ey, r0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * (r0 + 12), ey + Math.sin(a) * (r0 + 12)); ctx.lineTo(ex + Math.cos(a + 0.5) * (r0 + 2), ey + Math.sin(a + 0.5) * (r0 + 2)); ctx.lineTo(ex + Math.cos(a - 0.5) * (r0 + 2), ey + Math.sin(a - 0.5) * (r0 + 2)); ctx.closePath(); ctx.fill();
    text(NAMES[P.k][0], ex, ey + 1, big ? 20 : 15, '#fff', 'center');
  }
  // name tags through the intro card, "Round N" and 3-2-1
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
  if (tagA > 0) for (const P of st.pl) {
    const q = vineHeroPos(st, P), s = vineToScreen(cam, q.x, q.y), cpu = vineCpu(P.k), hw = cpu ? 30 : 18;
    const x = s.x + (P.k ? 26 : -26), y = s.y - 40 * cam.z * zk - 16;
    ctx.globalAlpha = tagA; ctx.fillStyle = PCOL[P.k]; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x + (P.k ? -10 : 10), y + 14); ctx.fill();
    text(cpu ? NAMES[P.k] + ' · CPU' : NAMES[P.k], x, y - 1.5, 12, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
}
// where a swinger is drawn (world, with the lane): the body's middle
function vineHeroPos(st, P) {
  const ly = VINE_LANE[P.k];
  if (P.status === 'land' || P.status === 'done') {
    if (P.kind === 'splash' && P.rescue) {
      const k = clamp(P.rescue.t / 1.6, 0, 1), e = k * k * (3 - 2 * k);
      return { x: P.rescue.x + (st.f.river.x0 - 30 - P.rescue.x) * e, y: ly - 14 };
    }
    const top = P.kind === 'log' ? -VINE.logH : P.kind === 'deck' ? VINE.deckY : 0;
    return { x: P.landX, y: top + ly - VINE.feet };
  }
  const q = vineBodyPos(P);
  return { x: q.x, y: q.y + ly };
}
function vineDrawSwinger(st, P, zk) {
  const k = P.k, ly = VINE_LANE[k], gold = P.gold > 0, s = 1.3 * zk;
  if (P.status === 'ready' || P.status === 'swing') {
    const q = vineSwingBody(P.s), x = q.x, y = q.y + ly, rot = -P.s.a;
    const hx = x - Math.sin(P.s.a) * (VINE.hand * s / 1.3), hy = y - Math.cos(P.s.a) * (VINE.hand * s / 1.3);
    vineDrawVine(k, hx, hy, gold, st.f.stretchy, clamp(P.s.w * 0.4, -2, 2));
    if (P.pumpOk > 0 && !vineCpu(k) && st.round <= 2) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(x, y, 22 * s / 1.3); ctx.fill(); }
    const mood = P.status === 'ready' ? 'happy' : P.brake > 0 ? 'grit' : Math.abs(P.s.w) > 1.6 ? 'wow' : 'happy';
    vineDrawHero(k, { x, y, rot, s, pose: P.status === 'ready' ? 'ready' : 'hang', mood, kick: G.clock * 9 + k, face: 1 });
    return;
  }
  const pos = vineHeroPos(st, P);
  if (P.status === 'fly') {
    const b = P.b;
    if (b.carry) {
      const fl = G.clock * 14 + b.carry.id;
      vineDrawHero(k, { x: pos.x, y: pos.y, s, pose: 'cheer', mood: 'joy', face: 1 });
      vineDrawToucan(pos.x, pos.y - 34 * s / 1.3, 1.05 * s / 1.3, fl, 1);
    } else if (b.glide > 0) vineDrawHero(k, { x: pos.x, y: pos.y, s, pose: 'glide', mood: 'joy', rot: clamp(b.vx / 3000, -0.15, 0.15) });
    else if (b.tuck) vineDrawHero(k, { x: pos.x, y: pos.y, s, pose: 'tuck', mood: 'grit', rot: P.spin });
    else vineDrawHero(k, { x: pos.x, y: pos.y, s, pose: 'fly', mood: b.vy < 0 ? 'joy' : 'wow', rot: clamp(Math.atan2(b.vy, b.vx) * 0.35, -0.5, 0.5) });
  } else if (P.kind === 'splash') {
    const r = P.rescue, k2 = r ? clamp(r.t / 1.6, 0, 1) : 1;
    vineDrawCapy(pos.x + 4, pos.y + 22, 1.1 * s / 1.3);
    vineDrawHero(k, { x: pos.x, y: pos.y - 2 + Math.sin(G.clock * 5) * 1.5, s, pose: k2 >= 1 ? 'cheer' : 'ready', mood: 'joy' });
  } else {
    const win = st.winFlag === k || (G.match && G.match.end && G.match.end.winner === k);
    const footY = pos.y + VINE.feet;
    vineDrawHero(k, { x: pos.x, y: footY - VINE.feet * s / 1.3, s, pose: win || P.landT < 0.4 ? 'cheer' : 'stand', mood: P.kind === 'mud' ? 'joy' : win ? 'joy' : 'happy', sq: P.sq, mud: P.mud });
  }
  // the empty vine swinging back
  const ve = st.vis.ev[k] || { a: P.s.a, r: VINE.R };
  const hx = VINE.px + (ve.r - VINE.hand) * Math.sin(ve.a), hy = VINE.py + (ve.r - VINE.hand) * Math.cos(ve.a) + ly;
  vineDrawVine(k, hx, hy, gold, st.f.stretchy, 0);
}

/* ---------- HUD ---------- */
// each player's own keys (none for the computer)
function vineKeys(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (k === 'pad') return { l: '◀', r: '▶', pump: 'stick ◀ ▶', go: glyph('a'), leaf: glyph('act'), tuck: 'stick ▼' };
  if (k === 'touch') return { l: '◀', r: '▶', pump: '◀ ▶', go: '▲', leaf: 'glide', tuck: '▼' };
  const solo = typeof cpuSolo === 'function' && cpuSolo();
  if (solo) return { l: 'A/←', r: 'D/→', pump: 'A D or ← →', go: 'W or ↑', leaf: 'F or /', tuck: 'S or ↓' };
  return id === 0 ? { l: 'A', r: 'D', pump: 'A D', go: 'W', leaf: 'F', tuck: 'S' } : { l: '←', r: '→', pump: '← →', go: '↑', leaf: '/', tuck: '↓' };
}
function vineChip(label, x, y, big, col, gold) {
  const fs = big ? 18 : 13, h = big ? 30 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), cx = clamp(x, w / 2 + 6, W - w / 2 - 6), cy = clamp(y, h / 2 + 4, H - h / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, cy + 0.5, fs, gold ? C.gold : C.paper, 'center', 'body');
  return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
}
// a little leaf icon (the glide: full when ready, dashed when used)
function vineLeafIcon(x, y, s, on) {
  if (!on) { ctx.strokeStyle = 'rgba(246,239,223,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 5 * s, -0.5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); return; }
  vineLeafShape(x - 9 * s, y + 5 * s, 20 * s, 7 * s, -0.5, '#6fd65a');
  ctx.strokeStyle = '#2f8a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 9 * s, y + 5 * s); ctx.lineTo(x + 7 * s, y - 4 * s); ctx.stroke();
}
function vineHud() {
  const st = G.mst, m = G.match; if (!st.pl || !st.f || !st.cam) return;
  const big = vineBig(), tw = VINE_TWISTS[st.twist], f = st.f, cam = st.cam, sz = big ? 1.4 : 1;
  // bottom corners: each swinger's swing meter (how high the swing goes), the leaf, and the mark once landed
  for (const P of st.pl) {
    const left = P.k === 0, pw = 196 * sz, ph = 40 * sz, y = H - 8 - ph, x = left ? 10 : W - 10 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.84)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (P.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    const nx = left ? x + 14 * sz : x + pw - 14 * sz;
    text(NAMES[P.k], nx, y + ph / 2 + 0.5, 17 * sz, PCOL[P.k], left ? 'left' : 'right');
    const bx = left ? x + 52 * sz : x + 38 * sz, bw = 92 * sz, by = y + ph / 2;
    if (P.status === 'land' || P.status === 'done') {
      text(vineFmt(P.d || 0), bx + bw / 2, by + 0.5, 17 * sz, C.paper, 'center', 'body');
    } else if (P.status === 'fly') {
      text(P.b && P.b.carry ? 'Toucan ride!' : 'Wheee!', bx + bw / 2, by + 0.5, 15 * sz, '#ffe6a8', 'center', 'body');
    } else {
      // swing meter: how high this swing goes, with a gold band near the top
      const A = P.status === 'swing' ? vineAmp(P.s) : 0, kA = clamp(A / (90 * VINE_D), 0, 1), hk = (75 / 90);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, by - 6 * sz, bw, 12 * sz, 6 * sz); ctx.fill();
      ctx.fillStyle = 'rgba(255,197,61,0.35)'; rr(bx + bw * hk, by - 6 * sz, bw * (1 - hk), 12 * sz, 6 * sz); ctx.fill();
      if (kA > 0) { ctx.fillStyle = P.gold ? C.gold : PCOL[P.k]; rr(bx, by - 6 * sz, Math.max(12 * sz, bw * kA), 12 * sz, 6 * sz); ctx.fill(); }
      if (P.pumpOk > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; rr(bx, by - 6 * sz, bw, 12 * sz, 6 * sz); ctx.stroke(); }
    }
    const lx = left ? x + pw - 22 * sz : x + 22 * sz;
    vineLeafIcon(lx, by, sz, !(P.b && P.b.glideUsed) && !(P.status === 'land' || P.status === 'done'));
  }
  // bottom centre: a distance ruler with both swingers, the river or mushrooms, and the jungle record
  {
    const mw = big ? 300 : 380, mh = big ? 30 : 24, x0 = W / 2 - mw / 2, y = H - 8 - mh, a = x0 + 14, b = x0 + mw - 14, cy = y + mh / 2;
    let far = 50; for (const P of st.pl) { const q = vineBodyPos(P); far = Math.max(far, vineM(P.status === 'land' || P.status === 'done' ? P.landX : q.x) + 5); }
    far = Math.ceil(far / 10) * 10;
    const X = d => a + (b - a) * clamp(d / far, 0, 1);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y, mw, mh, mh / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(246,239,223,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, cy); ctx.lineTo(b, cy); ctx.stroke();
    for (let d = 10; d < far; d += 10) { ctx.fillStyle = 'rgba(246,239,223,0.45)'; ctx.fillRect(X(d) - 1, cy - 4, 2, 8); }
    if (f.river) { ctx.fillStyle = 'rgba(79,182,216,0.75)'; ctx.fillRect(X(f.river.x0 / VINE.M), cy - 3, X(f.river.x1 / VINE.M) - X(f.river.x0 / VINE.M), 6); }
    for (const q of f.mush) { ctx.fillStyle = '#ff8fc7'; circle(X(q.x / VINE.M), cy, 3); ctx.fill(); }
    if (st.record) { ctx.fillStyle = C.gold; ctx.fillRect(X(st.record.d) - 1.5, cy - 8, 3, 16); }
    for (const P of st.pl) {
      const q = vineBodyPos(P), d = vineM(P.status === 'land' || P.status === 'done' ? P.landX : q.x);
      const px = X(d), py = cy + (P.k ? 3 : -3) * (big ? 1.3 : 1), rad = big ? 7 : 6;
      ctx.fillStyle = PCOL[P.k]; circle(px, py, rad); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(px, py, rad); ctx.stroke();
    }
  }
  // the twist, top left under the level pill (not in the plain round); the wind with arrows
  if (st.twist !== 'plain') {
    const fs = big ? 20 : 13, h = big ? 36 : 26, y0 = 46;
    const lab = tw.name + (f.wind ? (f.wind > 0 ? ':  Tailwind ▶▶' : ':  Headwind ◀◀') : '');
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + (big ? 36 : 28); pill(14, y0, w, h); text(lab, 14 + (big ? 18 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  // drifting leaves on the screen (they show the wind)
  // (calm: only a few gentle ones, and none low over the HUD; reduced motion: only the wind's)
  if (!reduceMotion || f.wind) st.vis.leaves.forEach((l, i) => {
    if (!f.wind && (i % 3 || l.y > H * 0.7)) return;
    ctx.globalAlpha = f.wind ? 0.85 : 0.5;
    vineLeafShape(l.x, l.y, 13 * l.s, 5 * l.s, l.ph + st.vis.t * (f.wind ? 3 : 1.2), ['#7fd65a', '#5fbf4a', '#c9e86a'][l.c]);
  });
  ctx.globalAlpha = 1;
  if (m.phase === 'live' || m.phase === 'end') {
    // the swing clock under the match pill while anyone still swings
    if (st.pl.some(P => P.status === 'swing') || (st.bellT != null && st.bellT < 1.2)) {
      const box = G.matchHudBox, y0 = box ? box.y1 + 6 : 52, sec = Math.ceil(st.clock), warn = sec <= 3;
      const lab = (st.attN > 1 ? 'Swing ' + (st.att + 1) + ' of ' + st.attN + '  ·  ' : '') + (st.clock > 0 ? 'Let go in ' + sec : 'Bell! Let go!');
      vineChip(lab, W / 2, y0 + (big ? 16 : 12), big, warn ? C.gold : 'rgba(246,239,223,0.5)', warn);
    }
    if (st.setT > 0) {
      const k = 1 - st.setT / VINE.setT;
      ctx.globalAlpha = clamp(st.setT / 0.3, 0, 1);
      bigText('Swing ' + (st.att + 1) + '!', W / 2, (big ? 150 : 140), big ? 52 : 44, C.gold, 1 + 0.3 * Math.max(0, 1 - k * 4));
      const bests = st.pl.map(P => NAMES[P.k] + ' ' + vineFmt(P.rbest)).join('   ·   ');
      vineChip('Best so far: ' + bests, W / 2, (big ? 196 : 180), big, 'rgba(246,239,223,0.5)', false);
      ctx.globalAlpha = 1;
    }
    // hints for people (never for the computer): pump arrows and "jump!" in rounds 1-2, the leaf in the air
    for (const P of st.pl) {
      if (vineCpu(P.k)) continue;
      const kk = vineKeys(P.k), q = vineHeroPos(st, P), s = vineToScreen(cam, q.x, q.y), zk = vineHeroK(cam);
      const below = s.y + 46 * cam.z * zk + (big ? 22 : 16);
      if (P.status === 'swing' && (st.round <= 2 || P.gold)) {
        const fwd = P.s.w > 0, A = vineAmp(P.s);
        const key = fwd ? kk.r : kk.l, arrow = fwd ? '▶' : '◀';
        let lab = (key === arrow ? arrow : fwd ? key + ' ▶' : '◀ ' + key) + '  pump';
        if (fwd && P.best && A > 50 * VINE_D && P.s.a > P.best.a - 25 * VINE_D && P.s.a < P.best.a + 8 * VINE_D) lab = kk.go + ' let go!';
        vineChip(lab, s.x + (P.k ? 70 : -70), below, big, PCOL[P.k], lab.indexOf('let go') >= 0);
      } else if (P.status === 'fly' && P.b && !P.b.glideUsed && !P.b.carry && st.round <= 2 && P.b.vy > -140) {
        vineChip(kk.leaf + ' leaf glide!', s.x, s.y - (big ? 70 : 56), big, PCOL[P.k], true);
      }
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the round card: this round's twist, and any gold help announced
    const lines = [];
    for (const P of st.pl) if (P.gold) lines.push(P.gold >= 2 ? 'Gold vine and the sweet spot for ' + NAMES[P.k] + '!' : 'Gold vine for ' + NAMES[P.k] + ': pumping is easier!');
    const hint = f.wind ? (f.wind > 0 ? 'A tailwind today! Open your leaf to sail.' : 'A headwind today! Tuck (▼) to cut through.') : tw.hint;
    const nf = big ? 30 : 26, hf = big ? 19 : 14, lh = big ? 26 : 20, ch = (big ? 78 : 60) + lines.length * lh, cy = H - (big ? 70 : 54) - ch - 6;
    ctx.font = hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    let w = Math.max(big ? 380 : 300, ctx.measureText(hint).width + 48);
    ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    for (const l of lines) w = Math.max(w, ctx.measureText(l).width + 48);
    w = Math.min(W - 20, w);
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1, cx = W / 2 + (big ? 0 : 90);
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(cx - w / 2, cy, w, ch, 16); ctx.fill();
    if (lines.length) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(cx - w / 2, cy, w, ch, 16); ctx.stroke(); }
    text(tw.name, cx, cy + (big ? 25 : 21), nf, C.gold, 'center'); text(hint, cx, cy + (big ? 57 : 46), hf, C.paper, 'center', 'body');
    lines.forEach((l, i) => text(l, cx, cy + (big ? 57 : 46) + (i + 1) * lh, hf, C.gold, 'center', 'body'));
    ctx.globalAlpha = 1;
    // key reminders above that card before rounds 1 and 2 (each player's own device; never the computer's)
    if (m.round <= 2) {
      ctx.globalAlpha = a;
      const who = st.pl.filter(P => !vineCpu(P.k)), step = big ? 36 : 28;
      let yy = cy - 6 - step / 2 - (who.length - 1) * step;
      for (const P of who) {
        const kk = vineKeys(P.k);
        vineChip(NAMES[P.k] + ': ' + kk.pump + ' pump · ' + kk.go + ' let go · ' + kk.leaf + ' leaf', cx, yy, big, PCOL[P.k], false);
        yy += step;
      }
      ctx.globalAlpha = 1;
    }
  }
}

Sfx.extra.vinePump = function (p) { this.tone(240 * p, 0.12, 'sine', 0.03, 360 * p); };
Sfx.extra.vineLet = function (p) { this.tone(420 * p, 0.18, 'triangle', 0.05, 900 * p); this.tone(1200 * p, 0.12, 'sine', 0.02, 1800 * p, 0.05); };
Sfx.extra.vinePerfect = function (p) { [784, 988, 1318].forEach((f, i) => this.tone(f * p, 0.1, 'triangle', 0.045, null, i * 0.06)); };
Sfx.extra.vineNope = function (p) { this.tone(260 * p, 0.08, 'triangle', 0.03, 200 * p); };
Sfx.extra.vineGlide = function (p) { this.tone(500 * p, 0.3, 'sine', 0.035, 300 * p); };
Sfx.extra.vineLand = function (p) { this.tone(170 * p, 0.09, 'triangle', 0.06, 100 * p); this.tone(520 * p, 0.1, 'triangle', 0.03, null, 0.06); };
Sfx.extra.vineSplat = function (p) { this.tone(140 * p, 0.2, 'sawtooth', 0.04, 70 * p); this.tone(600 * p, 0.12, 'triangle', 0.03, 300 * p, 0.05); };
Sfx.extra.vineSplash = function (p) { this.tone(900 * p, 0.25, 'sine', 0.035, 200 * p); this.tone(300 * p, 0.3, 'triangle', 0.03, 120 * p, 0.04); };
Sfx.extra.vineBoing = function (p) { this.tone(170 * p, 0.28, 'sine', 0.08, 620 * p); };
Sfx.extra.vineToucan = function (p) { [660, 880, 660].forEach((f, i) => this.tone(f * p, 0.07, 'square', 0.025, null, i * 0.07)); };
Sfx.extra.vineSparkle = function (p) { [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.035, null, i * 0.04)); };
Sfx.extra.vineBell = function () { this.tone(880, 0.4, 'sine', 0.05); this.tone(1320, 0.3, 'sine', 0.03, null, 0.05); };
Sfx.extra.vineGo = function () { this.tone(300, 0.25, 'triangle', 0.04, 700); };
Sfx.extra.vineGold = function () { this.tone(784, 0.1, 'triangle', 0.05); this.tone(1046, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318, 0.16, 'triangle', 0.04, null, 0.16); };
/* ===== end of 17-4 Vine Swing ===== */
