/* Pip & Bo - Level 18-2 Grapple & Zip (team, World 18 Pirate Cove). */
'use strict';

/* ===== 18-2 Grapple & Zip (mode 'grapple', World 18 "Pirate Cove", team) =====
   Gavyn's pick: "You cross a whole fleet of ships. One throws a grappling hook to the next mast, aiming and picking the
   power. The other zips down the rope grabbing coins, then pulls the thrower across."
   Side view of a sunny bay: a row of friendly pirate ships at anchor, from the dock to Captain Polly's flagship. The
   camera scrolls right one ship at a time. The mode owns the tick, the picture and the HUD (def.ownStep + def.ownHUD);
   the engine grid is empty apart from the two spawns, and the platformer bodies are hidden (mirrored for tags/bubbles).
   Every ship has one tall mast with a crow's nest on top (the perch: a rope ladder goes up to it) and a brass ring on a
   little spar lower down the same mast (the target). One HOP = from this ship's crow's nest to the next ship's ring:
     1. THROW: the thrower stands on the gold X in the crow's nest. ▲ ▼ aim (a dotted guide shows only the first part of
        the flight), hold the action to charge (the meter rises and falls), let go to throw. The hook must pass through
        the ring. Ships bob, wind nudges the hook (later gusty), laundry lines and gulls can block, the ring can hang off
        a swinging boom. A miss ("Clunk!", "Splash!", "Flump! Socks!") reels the hook back and counts a try.
     2. ZIP: once the hook holds, the zipper (anywhere in the crow's nest; they wait on the ladder side so the thrower
        stays in view) presses the action to grab the handle and zips down
        the rope. It speeds up downhill; ▶ tucks (faster), ◀ brakes. Coins float along the line: some in the middle,
        some high (hold ▲ to pull your legs up) and some low (hold ▼ to dangle). A flag pole from a rowboat below needs
        ▲, a lantern hanging from above needs ▼, else "Bonk!" (a slow-down, counted). Reaching the stopper knot too fast
        is "Bonk! The mast!". At the knot you let go (the action) and drop onto the deck (after a moment you drop by
        yourself). Letting go over the water is a "Splash!": Dolly the dolphin carries you back to the start ship.
     3. HAUL: the zipper walks to the capstan and cranks it with the action on a steady beat (0.3-1.1 s apart is a full
        heave; faster slips). The thrower hops into the bosun's chair at the X (the action) and is hauled across: the
        rope sags under the chair, so the end of the line is uphill and needs more heaves. The rider can grab coins the
        zipper missed (▲ ▼) and helps pull with ▶ while the capstan turns. At the ring the rider hops onto the deck.
   Whoever arrived first (the zipper) throws the next hook, so the jobs swap every hop. 4 fleets ("Fleet N of 4") of 2
   hops each: Dockside Hop, Laundry Day, Windy Boom, Polly's Flagship (gulls, gusts and a tall flagship). Nobody can do
   a hop alone: only the thrower throws, only the zipper zips and cranks, and the rider must board.
   Gold help (always announced): Gold hook after 3 misses on one hop (a bigger ring, a 1.3x slower meter and a longer
   guide), Super gold hook after 6 (a huge ring, a 1.6x slower meter, the whole path shown with a star or a cross where it
   ends, gold marks on the meter for the powers that catch, Polly by the ring); Gold handle after 2 splashes (it won't
   let go over water); a tip after every miss says what went wrong (too far, too short, socks, a gull);
   Gold capstan after 14 s of hauling (every heave pulls 1.6x).
   Room def: { title, tip, act, fleet: [start ship, ship, ship] }. A ship (the hop INTO it is described on it):
     { name, pal, nest (crow's nest height above the deck), ring (ring height), gap (mast to mast from the ship before),
       coins: 'm.h.l' (zip coins spread along the line: m middle, h high, l low, . none), chair: 'h.l' (coins for the
       rider), obs: ['flag:0.5', 'lant:0.62'] (u along the line), wind, gust (px/s² on the hook), boom (swing px),
       lines: [[dx0, h0, dx1, h1]] (laundry lines: dx from the middle of the gap, heights above the sea),
       gulls: [[dx, h, rx, ry, speed]], crew, dock (the start pier), flagship }
   Every global is prefixed grapple / GRAPPLE (and Sfx.extra.grapple*); all state lives in G.mst. */
const GRAPPLE = {
  SEA: 432, free: 44, freeFlag: 62, shipL: 330, flagL: 430,
  walk: 175, climb: 200, hopV: 330, grav: 1400,
  aimMin: -12, aimMax: 78, aimRate: 46, aimRate2: 90, powPeriod: 2.4, goldSlow: 1.3, superSlow: 1.6, powMin: 0.08, vMin: 230, vMax: 860, hookG: 900,
  ringR: 16, hookR: 6, goldRing: 1.9, superRing: 2.6, guideT: 0.26, guideGold: 0.55, goldMiss: 3, superMiss: 6,
  reelT: 1.05, flyMax: 3.2, spotTol: 16, ladTol: 15,
  zipSag: 0.05, chairSag: 0.12, zipG: 720, zipDrag: 0.0014, tuckAcc: 90, brakeAcc: 520, crawl: 62, bonkV: 255, stopT: 1.8,
  offMid: 26, offHi: 12, offLo: 44, offRate: 230, rideMid: 32, rideHi: 14, rideLo: 48,
  coinR: 13, endBack: 32,
  heave: 32, heaveSlip: 0.17, heaveGood: 0.3, heaveLate: 1.15, chairV: 230, pullAdd: 8, goldHaul: 1.6, haulHelpT: 14,
  splashHelp: 2, dolphinT: 2.6, arriveT: 0.9, roomEndT: 1.8, finT: 5.4, hintLife: 2.8, pollyT: 20,
};
const GRAPPLE_PAL = {
  red: { hull: '#d0573f', hullDk: '#8f3524', band: '#f6d58a', trim: '#ffe7a8', sail: '#fff7e6', stripe: '#ef6a55', flag: '#ff7a6b', cabin: '#b4472f' },
  teal: { hull: '#2fa39a', hullDk: '#1d6d67', band: '#ffe7a8', trim: '#fff3cf', sail: '#fffbf0', stripe: '#3fc0b4', flag: '#5bd8c9', cabin: '#26867f' },
  purple: { hull: '#8a62d0', hullDk: '#553a8f', band: '#ffd9f0', trim: '#fff0fb', sail: '#fff8f2', stripe: '#b78cff', flag: '#c9a2ff', cabin: '#7350b4' },
  yellow: { hull: '#e7a93a', hullDk: '#a26e1c', band: '#fff2c4', trim: '#fff8dd', sail: '#fffdf4', stripe: '#ff9a3d', flag: '#ffcf4a', cabin: '#c98d27' },
  green: { hull: '#58b04f', hullDk: '#357a33', band: '#fff1b8', trim: '#fffae0', sail: '#fffcf2', stripe: '#7fd36a', flag: '#9be36f', cabin: '#47943f' },
  pink: { hull: '#e36f9a', hullDk: '#a3406a', band: '#fff0c8', trim: '#fff6e0', sail: '#fffaf4', stripe: '#ff9ac1', flag: '#ffa6c9', cabin: '#c45a83' },
  blue: { hull: '#4f7fd8', hullDk: '#2f4f99', band: '#ffe7a8', trim: '#fff3d0', sail: '#fffbf2', stripe: '#6fa8ff', flag: '#8fc0ff', cabin: '#3f68b8' },
  flag: { hull: '#2f3f86', hullDk: '#1c2658', band: '#ffc53d', trim: '#ffe08a', sail: '#fffaf0', stripe: '#ffc53d', flag: '#ffc53d', cabin: '#26346f' },
};
const grappleLerp = (a, b, u) => a + (b - a) * u;
const grappleSmooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const grappleQuiet = id => typeof cpuOn === 'function' && cpuOn(id);
const grappleUpH = p => !!(p.input.jump || p.input.up);
// each player's own keys for prompts and the job cards (a controller shows its buttons, touch the screen buttons)
function grappleKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'up') return pad ? 'stick ▲' : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? 'stick ▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'ud') return pad ? 'stick ▲ ▼' : touch ? '▲ ▼' : id === 0 ? 'W S' : '↑ ↓';
  return pad ? 'stick ◀ ▶' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
}

/* ---------- the fleet: ships laid out along the bay ---------- */
function grappleShip(spec, x, k) {
  const P = GRAPPLE, dock = !!spec.dock, flagship = !!spec.flagship;
  const L = dock ? 300 : flagship ? P.flagL : P.shipL, free = dock ? 38 : flagship ? P.freeFlag : P.free;
  const mast = x + (dock ? 210 : flagship ? 0.46 * L : 0.52 * L);
  const sh = {
    k, spec, dock, flagship, x, L, mast, deck0: P.SEA - free, name: spec.name || '', pal: GRAPPLE_PAL[spec.pal] || GRAPPLE_PAL.red,
    nest: spec.nest || 200, ring: spec.ring || 110, boom: spec.boom || 0, crew: spec.crew == null ? 2 : spec.crew,
    bobA: dock ? 0 : flagship ? 3 : 4 + (k % 3), bobW: 1.6 + (k % 4) * 0.17, ph: k * 1.37,
  };
  sh.deckX0 = x + (dock ? 8 : 30); sh.deckX1 = x + L - (dock ? 20 : 34);
  sh.ladX = mast - 22; sh.spotX = mast + 16; sh.waitX = mast - 24; sh.capX = mast - 104;
  sh.nestX0 = mast - 30; sh.nestX1 = mast + 30;
  sh.mizzen = dock ? null : x + 0.2 * L; sh.fore = dock ? null : x + 0.82 * L;
  sh.mizzenH = 104; sh.foreH = 126;
  return sh;
}
function grappleCompile(def, startX) {
  const fleet = def.fleet || [];
  const ships = [];
  let x = startX || 0;
  fleet.forEach((spec, i) => {
    if (i === 0) { ships.push(grappleShip(spec, x - (spec.dock ? 210 : (spec.flagship ? 0.46 * GRAPPLE.flagL : 0.52 * GRAPPLE.shipL)), i)); return; }
    const prevMast = ships[i - 1].mast, mast = prevMast + (spec.gap || 440);
    const off = spec.dock ? 210 : spec.flagship ? 0.46 * GRAPPLE.flagL : 0.52 * GRAPPLE.shipL;
    ships.push(grappleShip(spec, mast - off, i));
  });
  return ships;
}
const grappleDeckY = (sh, t) => sh.deck0 + (reduceMotion ? 0 : sh.bobA) * Math.sin(t * sh.bobW + sh.ph);
const grappleNestY = (sh, t) => grappleDeckY(sh, t) - sh.nest;
// the ring on its spar (a boom ring sways until the rope is tied to it)
function grappleRing(st, sh, t) {
  const hop = st.hop;
  let sx = 0;
  if (sh.boom) { const tie = hop && hop.to === sh.k ? hop.boomTie : 0; sx = sh.boom * Math.sin(t * 1.9 + sh.ph) * (1 - tie); }
  return { x: sh.mast - 22 + sx, y: grappleDeckY(sh, t) - sh.ring };
}
const grappleAnchor = (sh, t) => ({ x: sh.spotX + 8, y: grappleNestY(sh, t) - 22 });
const grappleHand = (sh, t) => ({ x: sh.spotX + 12, y: grappleNestY(sh, t) - 30 });
const grappleWind = (hop, t) => (hop ? (hop.wind || 0) + (hop.gust || 0) * Math.sin(t * 0.8 + 1.3) : 0);
const grappleGull = (g, t) => ({ x: g.x + g.rx * Math.sin(t * g.w + g.ph), y: g.y + g.ry * Math.sin(t * g.w * 2 + g.ph), vx: g.rx * g.w * Math.cos(t * g.w + g.ph) });

/* ---------- the rope: a quadratic curve from the anchor to the ring, sagging in the middle ---------- */
function grappleRopeMake(A, B, sagK) {
  const L0 = Math.hypot(B.x - A.x, B.y - A.y), Cx = (A.x + B.x) / 2, Cy = (A.y + B.y) / 2 + sagK * L0;
  const N = 48, pts = [], cl = [0];
  for (let i = 0; i <= N; i++) { const u = i / N, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; pts.push({ x: a * A.x + b * Cx + c * B.x, y: a * A.y + b * Cy + c * B.y }); }
  for (let i = 1; i <= N; i++) cl.push(cl[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const r = { A, B, C: { x: Cx, y: Cy }, pts, cl, N, len: cl[N] };
  r.sEnd = grappleRopeSAtX(r, B.x - GRAPPLE.endBack);
  return r;
}
// a point on the rope by length along it: x, y, the slope (sin: + is downhill toward the ring) and u (0..1)
function grappleRopeAt(r, s) {
  s = clamp(s, 0, r.len);
  let lo = 0, hi = r.N;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.cl[m] <= s) lo = m; else hi = m; }
  const a = r.pts[lo], b = r.pts[hi], seg = r.cl[hi] - r.cl[lo] || 1, f = (s - r.cl[lo]) / seg;
  return { x: grappleLerp(a.x, b.x, f), y: grappleLerp(a.y, b.y, f), sin: (b.y - a.y) / seg, cos: (b.x - a.x) / seg, u: (lo + f) / r.N };
}
function grappleRopeU(r, u) {
  const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
  return { x: a * r.A.x + b * r.C.x + c * r.B.x, y: a * r.A.y + b * r.C.y + c * r.B.y };
}
function grappleRopeSAtX(r, x) {
  for (let i = 1; i <= r.N; i++) if (r.pts[i].x >= x) { const a = r.pts[i - 1], b = r.pts[i], f = (x - a.x) / ((b.x - a.x) || 1); return r.cl[i - 1] + (r.cl[i] - r.cl[i - 1]) * clamp(f, 0, 1); }
  return r.len;
}
// the rope's height (world y) right below/above x
function grappleRopeYAtX(r, x) { return grappleRopeAt(r, grappleRopeSAtX(r, x)).y; }

/* ---------- a fleet (a room) ---------- */
function grappleRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.title = def.title || '';
  st.ships = grappleCompile(def, 0);
  st.t = st.t || 0;
  st.hopN = st.ships.length - 1; st.hopI = -1; st.hop = null;
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = st.hinted || {}; st.msg = null; st.sign = null;
  st.roomT = 0; st.segStart = G.time; st.inT = [-99, -99]; st.prevAct = [false, false];
  st.endT = 0; st.fin = null; st.polly = { x: -200, y: 120, tx: -200, ty: 120, t: 0, say: null, sayT: 0, face: 1 };
  st.dolphin = null;
  st.stats.roomTitles[k] = st.title;
  st.cam = { x: 0 };
  // the players: both on the start ship. Fleet 1: on the dock. Later fleets: where the last hop left them (the new
  // thrower, last hop's zipper, at the capstan; the new zipper by the mast)
  const s0 = st.ships[0];
  st.pl = [0, 1].map(id => ({ id, mode: 'walk', ship: 0, x: 0, h: 0, vy: 0, vx: 0, face: 1, walkPh: 0, climbPh: 0, onNest: false,
    zip: null, chair: false, fall: null, cheerT: 0, sq: 0, mood: 'happy', bonkT: 0, wx: 0, wy: 0 }));
  if (s0.dock) { st.pl[0].x = s0.ladX - 50; st.pl[1].x = s0.ladX - 86; }
  else { st.pl[0].x = s0.capX; st.pl[1].x = s0.mast - 46; st.pl[1].face = -1; }
  grappleStartHop(st, 0);
  grappleCamera(st, 0, true);
  grappleActLabels(st);
  grappleMirror(st);
}
function grappleStartHop(st, i) {
  const from = st.ships[i], to = st.ships[i + 1], spec = to.spec, P = GRAPPLE;
  const gIdx = st.k * 2 + i; // hops so far in the level: Pip throws the even ones (the arriver throws the next)
  const T = gIdx % 2 === 0 ? 0 : 1;
  st.hopI = i;
  const midX = (from.mast + to.mast) / 2;
  const hop = {
    i, from: i, to: i + 1, T, Z: 1 - T, phase: 'aim', ang: 32, pow: 0, charging: false, chargeT: 0, aimHold: 0,
    hook: null, reelT: 0, missT: 0, tries: 0, misses: 0, gold: 0, boomTie: 0, rope: null, sag: P.zipSag, sagTo: P.zipSag,
    wind: spec.wind || 0, gust: spec.gust || 0, coins: [], obs: [], chairCoinsSpec: spec.chair || '', chairCoinsOn: false,
    lines: (spec.lines || []).map(l => ({ x0: midX + l[0], y0: P.SEA - l[1], x1: midX + l[2], y1: P.SEA - l[3], wob: 0, socks: hash(l[0] + 7, l[2] + i) })),
    gulls: (spec.gulls || []).map((g, j) => ({ x: midX + g[0], y: P.SEA - g[1], rx: g[2], ry: g[3], w: g[4] || 0.9, ph: j * 2.1 + i, hitT: 0 })),
    splashes: 0, handleGold: false, haulT: 0, capGold: false, lastHeave: -9, heaveA: 0, capRot: 0, pullsLeft: 0,
    chairS: 0, chairTS: 0, boarded: false, landed: false, doneT: 0, done: false, stuckT: 0, startT: G.time,
  };
  // zip coins and obstacles, by where they sit along the line (u) and how far below it (off)
  const cs = String(spec.coins || '');
  for (let j = 0; j < cs.length; j++) {
    const ch = cs[j]; if (ch === '.') continue;
    const u = cs.length > 1 ? grappleLerp(0.16, 0.8, j / (cs.length - 1)) : 0.5;
    hop.coins.push({ u, off: ch === 'h' ? P.offHi - 1 : ch === 'l' ? P.offLo + 2 : P.offMid + 2, band: ch, got: false, fly: 0, by: -1, k: j, rider: false });
  }
  for (const o of spec.obs || []) {
    const [kind, uu] = String(o).split(':');
    hop.obs.push({ kind: kind === 'lant' ? 'lant' : 'flag', u: +uu || 0.5, hitT: 0, k: hop.obs.length });
  }
  st.hop = hop;
  // the first hop of each fleet shows its sign
  if (spec.sign) st.sign = { text: spec.sign, t: 0, life: 5.5 };
  grappleActLabels(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function grappleStep(st, dt) {
  if (!st.hop) return;
  const ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[k].pendingJump || ps[k].pendingAct) st.inT[k] = G.time;
  }
  st.t += dt; st.roomT += dt;
  const frozen = G.introT > 0;
  // fresh presses this tick (cleared on the engine players so they can't fire later)
  const pend = [0, 1].map(k => ({ act: !frozen && ps[k].pendingAct, jump: !frozen && ps[k].pendingJump, rel: !frozen && st.prevAct[k] && !ps[k].input.act }));
  for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
  for (const k of [0, 1]) st.prevAct[k] = !frozen && ps[k].input.act;
  const hop = st.hop;
  if (st.fin) grappleFinStep(st, dt);
  else if (!frozen) {
    grappleHopStep(st, hop, pend, dt);
    for (const pl of st.pl) grapplePlayer(st, pl, ps[pl.id], pend[pl.id], dt);
    // a hint about the old job goes away once the job changes
    st.jobs = st.jobs || [null, null];
    for (const k of [0, 1]) {
      const j = grappleNeeds(st, k).job;
      if (st.jobs[k] && j !== st.jobs[k] && st.hints[k] && st.hints[k].t > 0.3) st.hints[k] = null;
      st.jobs[k] = j;
    }
  }
  if (hop.boomTie < 1 && hop.rope) hop.boomTie = Math.min(1, hop.boomTie + dt * 1.2);
  if (hop.rope || hop.phase === 'caught') grappleRopeUpdate(st, hop, dt);
  grapplePolly(st, dt);
  grappleCamera(st, dt, false);
  grappleFx(st, dt);
  grappleActLabels(st);
  grappleMirror(st);
}
function grappleRopeUpdate(st, hop, dt) {
  const from = st.ships[hop.from], to = st.ships[hop.to];
  hop.sag = approach(hop.sag, hop.sagTo, dt * 0.12);
  hop.rope = grappleRopeMake(grappleAnchor(from, st.t), grappleRing(st, to, st.t), hop.sag);
}

/* ---------- the hop: throw, zip, haul ---------- */
function grappleHopStep(st, hop, pend, dt) {
  const P = GRAPPLE, from = st.ships[hop.from], to = st.ships[hop.to];
  const Tp = st.pl[hop.T], Zp = st.pl[hop.Z], Tin = G.players[hop.T].input, Zin = G.players[hop.Z].input;
  hop.stuckT += dt;
  if (hop.done) {
    hop.doneT += dt;
    if (hop.doneT >= P.arriveT) grappleNextHop(st, dt);
    return;
  }
  if (hop.phase === 'aim') {
    const onSpot = grappleOnSpot(from, Tp);
    if (onSpot) {
      // ▲ ▼ aim (a held key speeds up), the action charges, letting go throws
      const ud = (grappleUpH(G.players[hop.T]) ? 1 : 0) - (Tin.down ? 1 : 0);
      if (ud) { hop.aimHold += dt; hop.ang = clamp(hop.ang + ud * (hop.aimHold > 0.45 ? P.aimRate2 : P.aimRate) * dt, P.aimMin, P.aimMax); }
      else hop.aimHold = 0;
      if (Tin.act && !hop.charging && (pend[hop.T].act || hop.armed)) { hop.charging = true; hop.chargeT = 0; hop.armed = false; hop.period = grapplePeriod(hop); Sfx.play('grappleCharge', hop.T); }
      if (hop.gold >= 2) grappleSweetSpots(st, hop, from, dt);
      if (hop.charging) {
        hop.chargeT += dt;
        hop.pow = grapplePowAt(hop, hop.chargeT);
        if (!Tin.act) {
          hop.charging = false;
          if (hop.pow < P.powMin) { grappleHint(st, hop.T, 'Hold ' + grappleKey(hop.T, 'act') + ' longer, then let go!'); hop.pow = 0; }
          else grappleThrow(st, hop, from);
        }
      }
    } else {
      hop.charging = false; hop.pow = 0; hop.armed = false;
      // (holding the action as you step onto the X starts the charge)
      if (Tin.act) hop.armed = true;
      if (pend[hop.T].act && Tp.onNest) grappleHint(st, hop.T, 'Stand on the gold X to throw!', 2);
    }
  } else if (hop.phase === 'fly') {
    grappleHookTick(st, hop, dt);
  } else if (hop.phase === 'reel') {
    hop.reelT += dt;
    if (hop.reelT >= P.reelT) { hop.phase = 'aim'; hop.hook = null; hop.pow = 0; hop.armed = false; }
  } else if (hop.phase === 'caught') {
    // the zipper grabs the handle at the X
    if (pend[hop.Z].act && Zp.mode === 'walk' && Zp.ship === hop.from && Zp.onNest) { grappleStartZip(st, hop, Zp); pend[hop.Z].act = false; }
    else if (pend[hop.Z].act && Zp.mode === 'walk' && Zp.ship === hop.from && !Zp.onNest) grappleHint(st, hop.Z, 'Climb up to the crow\'s nest first! ' + grappleKey(hop.Z, 'up'), 2.2);
    if (pend[hop.T].act && Tp.onNest) grappleHint(st, hop.T, NAMES[hop.Z] + ' zips first! Then you ride.', 2.2);
  } else if (hop.phase === 'zip') {
    // (the zipper's own tick moves them; see grappleZipTick)
  } else if (hop.phase === 'haul') {
    hop.haulT += hop.boarded ? dt : 0;
    if (hop.haulT > P.haulHelpT && !hop.capGold) {
      hop.capGold = true; st.stats.helps++;
      grappleMsg(st, 'Gold capstan! Every heave pulls ' + NAMES[hop.T] + ' further', C.gold, 3.6); Sfx.play('grappleHelp');
    }
    // the rider boards at the X
    if (!hop.boarded && pend[hop.T].act && Tp.mode === 'walk' && Tp.ship === hop.from && Tp.onNest) {
      hop.boarded = true; Tp.mode = 'chair'; Tp.hh = 0; Tp.hopV = 0; Tp.zip = { s: 0, off: P.rideMid, pose: 0 }; hop.chairS = 0; hop.chairTS = 0;
      hop.sagTo = P.chairSag;
      grapplePop(st, Tp.x, grappleNestY(from, st.t) - 60, 'Hop in!', '#ffffff', 18);
      Sfx.play('grappleBoard', hop.T);
      grappleShowChairCoins(st, hop);
      pend[hop.T].act = false;
    }
    // the capstan: a press of the action at it is a heave
    if (pend[hop.Z].act && Zp.mode === 'walk' && Zp.ship === hop.to && !Zp.onNest && Math.abs(Zp.x - to.capX) < 30) grappleHeave(st, hop);
    else if (pend[hop.Z].act && Zp.mode === 'walk' && Zp.ship === hop.to) grappleHint(st, hop.Z, 'Go to the capstan ' + (Zp.x > to.capX ? grappleKey(hop.Z, 'left') : grappleKey(hop.Z, 'right')), 2);
    // the rider helps pull while the capstan turns
    if (hop.boarded && Tp.mode === 'chair') {
      const Tpl = G.players[hop.T];
      if (Tpl.input.right && !hop.riderPrevR && hop.pullsLeft > 0 && st.t - hop.lastHeave < 0.8) {
        hop.pullsLeft--; hop.chairTS += P.pullAdd; st.stats.pulls[hop.T]++; Sfx.play('grapplePull', hop.T);
      }
      hop.riderPrevR = Tpl.input.right;
      grappleChairTick(st, hop, Tp, dt);
    }
  }
}
// the power meter: up and down, slower with gold help (the period is fixed when the charge starts)
const grapplePeriod = hop => GRAPPLE.powPeriod * (hop.gold >= 2 ? GRAPPLE.superSlow : hop.gold >= 1 ? GRAPPLE.goldSlow : 1);
function grapplePowAt(hop, ct) { const ph = (ct / (hop.period || grapplePeriod(hop))) % 1; return ph < 0.5 ? ph * 2 : 2 - ph * 2; }
// a throw worked out ahead with the level's own hook rules: what it hits and where ({ hit, x, y, pts })
function grappleSimThrow(st, hop, from, ang, pow, t0, maxT, keep) {
  const P = GRAPPLE, h = grappleHand(from, t0), a = ang * Math.PI / 180, v = P.vMin + pow * (P.vMax - P.vMin);
  const hk = { x: h.x, y: h.y, vx: v * Math.cos(a), vy: -v * Math.sin(a), t: 0, near: 1e9 }, dt = 1 / 60, pts = keep ? [] : null;
  for (let j = 1; hk.t < maxT; j++) {
    hk.t += dt;
    let hit = null;
    for (let i = 0; i < 2 && !hit; i++) hit = grappleHookMove(st, hop, hk, t0 + (j - 1) * dt + dt * (i + 1) / 2, dt / 2);
    if (pts) pts.push({ x: hk.x, y: hk.y });
    if (hit) return { hit, x: hk.x, y: hk.y, pts };
  }
  return { hit: null, x: hk.x, y: hk.y, pts };
}
// super gold: which powers on the meter catch the ring at this angle right now (gold marks on the meter)
function grappleSweetSpots(st, hop, from, dt) {
  hop.sweetT = (hop.sweetT || 0) - dt;
  if (hop.sweetT > 0) return;
  hop.sweetT = 0.15;
  const bands = [];
  let on = null;
  for (let pw = 0.08; pw <= 1.0001; pw += 0.02) {
    const ok = grappleSimThrow(st, hop, from, hop.ang, pw, st.t + 0.05, GRAPPLE.flyMax).hit === 'ring';
    if (ok && !on) { on = [pw - 0.01, pw + 0.01]; bands.push(on); } else if (ok) on[1] = pw + 0.01; else on = null;
  }
  hop.sweet = bands;
}
function grappleOnSpot(sh, pl) { return pl.mode === 'walk' && pl.ship === sh.k && pl.onNest && Math.abs(pl.x - sh.spotX) < GRAPPLE.spotTol; }
function grappleThrow(st, hop, from) {
  const P = GRAPPLE, h = grappleHand(from, st.t), a = hop.ang * Math.PI / 180, v = P.vMin + hop.pow * (P.vMax - P.vMin);
  hop.hook = { x: h.x, y: h.y, vx: v * Math.cos(a), vy: -v * Math.sin(a), t: 0, trail: [], near: 1e9 };
  hop.phase = 'fly'; hop.tries++; st.stats.throws[hop.T]++;
  st.pl[hop.T].throwA = 1;
  Sfx.play('grappleThrow', hop.T);
}
// one tick of hook flight with the level's own rules (the computer's planner runs the same function)
function grappleHookMove(st, hop, hk, t, dt) {
  const P = GRAPPLE, to = st.ships[hop.to], from = st.ships[hop.from];
  const ox = hk.x, oy = hk.y;
  hk.vy += P.hookG * dt; hk.vx += grappleWind(hop, t) * dt;
  hk.x += hk.vx * dt; hk.y += hk.vy * dt;
  // the ring
  const rg = grappleRing(st, to, t), rr0 = P.ringR * (hop.gold >= 2 ? P.superRing : hop.gold >= 1 ? P.goldRing : 1) + P.hookR;
  const d = grappleSegPt(ox, oy, hk.x, hk.y, rg.x, rg.y);
  if (d < hk.near) hk.near = d;
  if (d < rr0) return 'ring';
  // laundry lines and gulls
  for (const ln of hop.lines) for (let j = 0; j < 6; j++) {
    const u0 = j / 6, u1 = (j + 1) / 6, sg = Math.abs(ln.x1 - ln.x0) * 0.06;
    const ax = grappleLerp(ln.x0, ln.x1, u0), ay = grappleLerp(ln.y0, ln.y1, u0) + sg * 4 * u0 * (1 - u0), bx = grappleLerp(ln.x0, ln.x1, u1), by = grappleLerp(ln.y0, ln.y1, u1) + sg * 4 * u1 * (1 - u1);
    if (grappleSegX(ox, oy, hk.x, hk.y, ax, ay, bx, by + 14)) { hk.hitLine = ln; return 'laundry'; }
  }
  for (const g of hop.gulls) { const q = grappleGull(g, t); if (Math.hypot(hk.x - q.x, hk.y - q.y) < 20) { hk.hitGull = g; return 'gull'; } }
  // masts of the next ship (main mast above and below the ring, the short back mast)
  const dk = grappleDeckY(to, t);
  if (Math.abs(hk.x - to.mast) < 6 && hk.y > dk - to.nest - 40 && hk.y < dk) return 'mast';
  if (to.mizzen && Math.abs(hk.x - to.mizzen) < 5 && hk.y > dk - to.mizzenH && hk.y < dk) return 'mast';
  // decks and hulls
  for (const sh of [from, to]) if (hk.x > sh.x + 6 && hk.x < sh.x + sh.L - 6 && hk.y > grappleDeckY(sh, t) - 4 && sh !== from) return 'deck';
  if (hk.y > P.SEA) return 'water';
  if (hk.x > to.mast + 520 || hk.t > P.flyMax) return 'far';
  return null;
}
function grappleSegPt(x0, y0, x1, y1, px, py) {
  const ax = x1 - x0, ay = y1 - y0, L2 = ax * ax + ay * ay || 1, u = clamp(((px - x0) * ax + (py - y0) * ay) / L2, 0, 1);
  return Math.hypot(px - (x0 + ax * u), py - (y0 + ay * u));
}
function grappleSegX(ax, ay, bx, by, cx, cy, dx, dy) {
  // does segment a-b cross the band between segment c-(d) (dy is the low edge of hanging socks: a thin quad test)
  const cr = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const midY = (cy + dy) / 2;
  const d1 = cr(cx, cy, dx, midY, ax, ay), d2 = cr(cx, cy, dx, midY, bx, by), d3 = cr(ax, ay, bx, by, cx, cy), d4 = cr(ax, ay, bx, by, dx, midY);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
function grappleHookTick(st, hop, dt) {
  const P = GRAPPLE, hk = hop.hook, to = st.ships[hop.to];
  hk.t += dt;
  const sub = 2;
  let hit = null;
  for (let i = 0; i < sub && !hit; i++) hit = grappleHookMove(st, hop, hk, st.t - dt + dt * (i + 1) / sub, dt / sub);
  hk.trail.push({ x: hk.x, y: hk.y }); if (hk.trail.length > 14) hk.trail.shift();
  if (!hit) return;
  if (hit === 'ring') {
    hop.phase = 'caught'; hop.hook = null; hop.boomTie = 0;
    hop.sag = P.zipSag; hop.sagTo = P.zipSag;
    grappleRopeUpdate(st, hop, 0);
    if (hop.misses === 0) st.stats.first++;
    st.stats.caught[hop.T]++;
    const rg = grappleRing(st, to, st.t);
    grapplePop(st, rg.x, rg.y - 40, hop.misses === 0 ? 'Clink! First try!' : 'Clink! Got it!', C.gold, 22);
    for (let i = 0; i < 12; i++) grapplePart(st, rg.x, rg.y, (Math.random() - 0.5) * 220, (Math.random() - 0.8) * 200, 0.7, C.gold, 3, 300, 'spark');
    Sfx.play('grappleClink', hop.T); rumble(hop.T, 0.2, 0.4, 120);
    st.crewCheer = { ship: hop.to, t: 1.6 }; st.crewCheer2 = { ship: hop.from, t: 1.6 };
    grappleHint(st, hop.Z, 'Grab the handle at the X! ' + grappleKey(hop.Z, 'act'), 3);
    hop.stuckT = 0;
    return;
  }
  // a miss: the hook drops, then reels back
  hop.misses++; st.stats.misses[hop.T]++;
  hop.phase = 'reel'; hop.reelT = 0; hop.missAt = { x: hk.x, y: hk.y, kind: hit };
  const words = { mast: 'Clunk! The mast!', deck: 'Clonk! The deck!', water: 'Splash!', far: 'Whoosh! Too far!', laundry: 'Flump! Socks!', gull: 'Squawk! A gull!' }[hit] || 'Clunk!';
  const near = hk.near < 46 ? ' So close!' : '';
  grapplePop(st, clamp(hk.x, st.cam.x + 80, st.cam.x + W - 80), Math.min(hk.y, P.SEA) - 30, words + near, '#ffffff', 20);
  if (hit === 'water') { for (let i = 0; i < 12; i++) grapplePart(st, hk.x, P.SEA, (Math.random() - 0.5) * 160, -80 - Math.random() * 180, 0.7, i % 2 ? '#ffffff' : '#bff0ff', 3 + Math.random() * 2, 600, 'drop'); Sfx.play('grappleSplash'); }
  else if (hit === 'laundry') { hk.hitLine.wob = 1; Sfx.play('grappleFlump'); }
  else if (hit === 'gull') { hk.hitGull.hitT = 1.2; Sfx.play('grappleSquawk'); for (let i = 0; i < 6; i++) grapplePart(st, hk.x, hk.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, 0.9, '#ffffff', 3, 60, 'feather'); }
  else Sfx.play('grappleClunk');
  // gold help, announced
  const want = hop.misses >= P.superMiss ? 2 : hop.misses >= P.goldMiss ? 1 : 0;
  if (want > hop.gold) {
    hop.gold = want; st.stats.helps++;
    grappleMsg(st, want === 2 ? 'Super gold hook! The whole throw shows, and gold marks on the meter say when to let go' : 'Gold hook! A bigger ring, a slower meter and a longer aim guide', C.gold, 4.5);
    Sfx.play('grappleHelp');
  }
  // what went wrong, after every miss (short, so it never piles up)
  grappleHint(st, hop.T, grappleMissTip(st, hop, hk, hit, to), 2.6);
  if (hk.near < 46 && hit !== 'ring') st.stats.close++;
}
function grappleMissTip(st, hop, hk, hit, to) {
  const rg = grappleRing(st, to, st.t), id = hop.T;
  if (hit === 'laundry') return 'Socks! Throw over or under them ' + grappleKey(id, 'ud');
  if (hit === 'gull') return 'A gull! Throw when the way is clear';
  if (hit === 'far' || hk.x > rg.x + 10) return 'Too far! Let go a bit sooner';
  if (hk.y > rg.y) return 'Too short! Hold ' + grappleKey(id, 'act') + ' a bit longer';
  return 'Too high! Aim lower ' + grappleKey(id, 'down');
}
function grappleStartZip(st, hop, Zp) {
  const P = GRAPPLE;
  hop.phase = 'zip';
  Zp.mode = 'zip'; Zp.hh = 0; Zp.hopV = 0; Zp.zip = { s: 0, v: 70, off: P.offMid, at: 'go', stopT: 0, bonkT: 0 };
  Sfx.play('grappleGrab', Zp.id);
  grapplePop(st, Zp.x, grappleNestY(st.ships[hop.from], st.t) - 64, 'Wheee!', '#ffffff', 18);
  hop.stuckT = 0;
}
// the zipper on the line: gravity downhill, tuck / brake, legs up / dangle, coins and bumps, the stopper knot
function grappleZipTick(st, hop, pl, p, pnd, dt) {
  const P = GRAPPLE, z = pl.zip, r = hop.rope, inp = p.input;
  if (!r) return;
  const up = grappleUpH(p), down = inp.down && !up;
  const want = up ? P.offHi : down ? P.offLo : P.offMid;
  z.off = approach(z.off, want, P.offRate * dt);
  if (z.bonkT > 0) z.bonkT -= dt;
  const at = grappleRopeAt(r, z.s);
  if (z.at === 'go') {
    let a = P.zipG * at.sin - P.zipDrag * z.v * Math.abs(z.v) * (inp.right ? 0.5 : 1);
    if (inp.right && !inp.left) a += P.tuckAcc;
    if (inp.left && !inp.right && z.v > 0) a -= P.brakeAcc;
    z.v += a * dt;
    if (inp.right && !inp.left && z.v < P.crawl) z.v = Math.max(z.v, P.crawl * 0.9);   // hand over hand
    z.s += z.v * dt;
    if (z.s < 0) { z.s = 0; z.v = Math.max(0, z.v); }
    if (z.s >= r.sEnd) {
      if (z.v > P.bonkV) {
        z.s = r.sEnd - 6; z.v = -70; z.bonkT = 0.6; st.stats.bonks++;
        const q = grappleRopeAt(r, z.s);
        grapplePop(st, q.x, q.y - 30, 'Bonk! The mast! Brake ' + (grappleQuiet(pl.id) ? '' : grappleKey(pl.id, 'left')), '#ffe7a8', 18);
        Sfx.play('grappleBonk'); rumble(pl.id, 0.3, 0.3, 120);
        pl.sq = 1;
      } else { z.s = r.sEnd; z.v = 0; z.at = 'stop'; z.stopT = 0; Sfx.play('grappleKnot', pl.id); }
    }
  } else {
    z.stopT += dt;
    z.s = r.sEnd;
  }
  const q = grappleRopeAt(r, z.s);
  const bx = q.x, by = q.y + z.off;
  pl.wx = bx; pl.wy = by + 13;
  // coins and bumps
  grappleTouch(st, hop, pl, bx, by, 13, dt);
  // let go: at the knot (or by itself after a moment), or early (over the water: a splash)
  const letGo = pnd.act || (z.at === 'stop' && z.stopT > P.stopT);
  if (letGo) {
    const overTo = grappleOverDeck(st.ships[hop.to], bx), overFrom = grappleOverDeck(st.ships[hop.from], bx);
    if (!overTo && !overFrom && hop.handleGold) { grappleHint(st, pl.id, 'Gold handle: not over the water! Ride to the end', 2.4); return; }
    pl.mode = 'fall'; pl.fall = { x: bx, y: by + 13, vx: q.cos * z.v * 0.6, vy: q.sin * z.v * 0.6 - 60 }; pl.zip = null;
    hop.phase = 'drop';
    Sfx.play('grappleLetGo', pl.id);
  }
}
function grappleOverDeck(sh, x) { return x > sh.deckX0 - 6 && x < sh.deckX1 + 6; }
// coins and bumps for whoever is on the line (the zipper or the rider), body centre (bx, by), half height hh
function grappleTouch(st, hop, pl, bx, by, hh, dt) {
  const P = GRAPPLE, r = hop.rope;
  for (const c of hop.coins) {
    if (c.got || (c.rider && !hop.chairCoinsOn)) continue;
    const q = grappleRopeU(r, c.u), cy = q.y + c.off;
    if (Math.abs(q.x - bx) < 14 && Math.abs(cy - by) < P.coinR + 1) {
      c.got = true; c.fly = 1; c.by = pl.id; c.x = q.x; c.y = cy;
      st.stats.coins++; st.stats.coinsBy[pl.id]++;
      grapplePop(st, q.x, cy - 26, c.band === 'm' ? '+1' : 'Nice! +1', '#ffe08a', 15);
      Sfx.play('grappleCoin', pl.id);
      for (let i = 0; i < 6; i++) grapplePart(st, q.x, cy, (Math.random() - 0.5) * 140, (Math.random() - 0.6) * 140, 0.5, C.gold, 2.6, 200, 'spark');
    }
  }
  if (pl.bonkT > 0) pl.bonkT -= dt;
  for (const o of hop.obs) {
    const q = grappleRopeU(r, o.u);
    o.by = o.by || [false, false];
    // (one bonk per pass: someone stopped against a flag or lantern isn't bonked again and again)
    if (Math.abs(q.x - bx) > 11) { if (Math.abs(q.x - bx) > 24) o.by[pl.id] = false; continue; }
    if (pl.bonkT > 0 || o.by[pl.id]) continue;
    const hit = o.kind === 'flag' ? by + hh > q.y + 33 : by - hh < q.y + 22;
    if (!hit) continue;
    o.by[pl.id] = true;
    o.hitT = 1; pl.bonkT = 0.7; pl.sq = 1; st.stats.bonks++;
    if (pl.zip && pl.mode === 'zip') pl.zip.v = Math.min(pl.zip.v, 40);
    if (pl.mode === 'chair') hop.chairTS = Math.min(hop.chairTS, hop.chairS);
    const qk = grappleQuiet(pl.id);
    grapplePop(st, q.x, q.y - 20, o.kind === 'flag' ? 'Bonk! Lift your legs' + (qk ? '!' : ' ' + grappleKey(pl.id, 'up')) : 'Bonk! Dip under' + (qk ? '!' : ' ' + grappleKey(pl.id, 'down')), '#ffe7a8', 17);
    Sfx.play('grappleBonk'); rumble(pl.id, 0.25, 0.3, 100);
  }
}
function grappleShowChairCoins(st, hop) {
  const P = GRAPPLE, cs = String(hop.chairCoinsSpec || '');
  hop.chairCoinsOn = true;
  for (let j = 0; j < cs.length; j++) {
    const ch = cs[j]; if (ch === '.') continue;
    const u = cs.length > 1 ? grappleLerp(0.3, 0.78, j / (cs.length - 1)) : 0.55;
    hop.coins.push({ u, off: ch === 'h' ? P.rideHi : ch === 'l' ? P.rideLo : P.rideMid, band: ch, got: false, fly: 0, by: -1, k: 50 + j, rider: true, pop: 0 });
  }
}
function grappleHeave(st, hop) {
  const P = GRAPPLE, gap = st.t - hop.lastHeave, id = hop.Z;
  let k;
  if (gap < P.heaveSlip) k = 0; else if (gap < P.heaveGood) k = 0.4; else if (gap <= P.heaveLate) k = 1; else k = 0.75;
  hop.lastHeave = st.t; hop.heaveA = 1;
  st.stats.heaves[id]++;
  const zp = st.pl[id]; zp.crankA = 1;
  if (k === 0) { hop.slips = (hop.slips || 0) + 1; if (hop.slips >= 6) { hop.slips = 0; grappleHintOnce(st, 'slip' + st.k + hop.i, id, 'Steady! Heave... ho! Not so fast'); } Sfx.play('grappleSlip', id); return; }
  hop.slips = 0;
  hop.capRot += 0.5 * k;
  if (k === 1) st.stats.goodHeaves[id]++;
  if (!hop.boarded) { grappleHint(st, id, 'Wait for ' + NAMES[hop.T] + ' to hop in the chair!', 2); Sfx.play('grappleCrank', id); return; }
  // uphill (the end of a sagging line) a heave pulls less, downhill more
  const at = grappleRopeAt(hop.rope, hop.chairS);
  const slopeK = clamp(1 + (at.sin > 0 ? 0.9 : 1.6) * at.sin, 0.42, 1.7);
  hop.chairTS = Math.min(hop.rope.sEnd + 4, Math.max(hop.chairTS, hop.chairS) + P.heave * k * slopeK * (hop.capGold ? P.goldHaul : 1));
  hop.pullsLeft = 2;
  Sfx.play(k === 1 ? 'grappleHeave' : 'grappleCrank', id);
  if (k === 1) { hop.heaveStreak = (hop.heaveStreak || 0) + 1; if (hop.heaveStreak % 4 === 0) grapplePop(st, st.ships[hop.to].capX, grappleDeckY(st.ships[hop.to], st.t) - 64, 'Heave-ho!', '#ffffff', 16); }
  else hop.heaveStreak = 0;
}
function grappleChairTick(st, hop, pl, dt) {
  const P = GRAPPLE, r = hop.rope, p = G.players[pl.id];
  hop.chairS = approach(hop.chairS, hop.chairTS, P.chairV * dt);
  const up = grappleUpH(p), down = p.input.down && !up;
  pl.zip.off = approach(pl.zip.off, up ? P.rideHi : down ? P.rideLo : P.rideMid, P.offRate * dt);
  const q = grappleRopeAt(r, hop.chairS);
  pl.wx = q.x; pl.wy = q.y + pl.zip.off + 11;
  pl.zip.s = hop.chairS;
  grappleTouch(st, hop, pl, q.x, q.y + pl.zip.off, 11, dt);
  if (hop.chairS >= r.sEnd - 1) {
    // at the ring: hop out onto the deck
    pl.mode = 'fall'; pl.zip = null; pl.fall = { x: q.x, y: q.y + P.rideMid + 11, vx: 70, vy: -260 };
    hop.phase = 'arrive';
    Sfx.play('grappleHop', pl.id);
  }
}

/* ---------- the players: walking on decks, the rope ladder, falling, swimming ---------- */
function grapplePlayer(st, pl, p, pnd, dt) {
  const P = GRAPPLE, hop = st.hop, inp = p.input;
  if (pl.cheerT > 0) pl.cheerT -= dt;
  if (pl.sq > 0) pl.sq = Math.max(0, pl.sq - dt * 4);
  if (pl.throwA > 0) pl.throwA = Math.max(0, pl.throwA - dt * 2.5);
  if (pl.crankA > 0) pl.crankA = Math.max(0, pl.crankA - dt * 3);
  if (pl.mode === 'zip') { grappleZipTick(st, hop, pl, p, pnd, dt); return; }
  if (pl.mode === 'chair') return; // (grappleChairTick, in the hop)
  if (pl.mode === 'fall') { grappleFallTick(st, pl, dt); return; }
  if (pl.mode === 'swim') return;  // (Dolly the dolphin carries you; see grappleFx)
  const sh = st.ships[pl.ship];
  const L = inp.left && !inp.right, R = inp.right && !inp.left, up = grappleUpH(p), dn = inp.down && !up;
  // the thrower on the X stands still to aim (▲ ▼ aim there, not climb)
  const aiming = hop && !hop.done && hop.T === pl.id && (hop.phase === 'aim' || hop.phase === 'fly' || hop.phase === 'reel') && grappleOnSpot(st.ships[hop.from], pl);
  if (pl.mode === 'climb') {
    const top = sh.nest;
    if (up) { pl.h = Math.min(top, pl.h + P.climb * dt); pl.climbPh += dt * 9; }
    else if (dn) { pl.h = Math.max(0, pl.h - P.climb * 1.15 * dt); pl.climbPh += dt * 9; }
    pl.x = approach(pl.x, sh.ladX, 120 * dt);
    if (pl.h >= top) { pl.mode = 'walk'; pl.onNest = true; pl.h = top; pl.x = sh.ladX + 6; Sfx.play('grappleStep', pl.id); }
    else if (pl.h <= 0) { pl.mode = 'walk'; pl.onNest = false; pl.h = 0; }
    // (not while ▲ is held: up + sideways at the foot of the ladder used to flip between climbing and walking every tick)
    else if ((L || R) && !up && pl.h < 20) { pl.mode = 'walk'; pl.onNest = false; pl.h = 0; }
    return;
  }
  // walking (on the deck or in the crow's nest)
  if (pl.hopV || pl.hh > 0) { pl.hopV -= P.grav * dt; pl.hh = Math.max(0, (pl.hh || 0) + pl.hopV * dt); if (pl.hh <= 0) { pl.hopV = 0; pl.hh = 0; } }
  let vx = 0;
  if (!aiming && !(hop && hop.T === pl.id && hop.charging)) { if (L) vx = -P.walk; else if (R) vx = P.walk; }
  if (vx) { pl.face = Math.sign(vx); pl.walkPh += dt * 11; } else pl.walkPh = 0;
  pl.x += vx * dt;
  // the crow's nest is small: the thrower slides onto the middle of the X, and a partner standing still right next
  // to them shuffles over to the ladder side so both stay in view
  if (aiming) pl.x = approach(pl.x, sh.spotX, 140 * dt);
  else if (!vx && pl.onNest && hop && !hop.done && hop.Z === pl.id && hop.from === pl.ship) {
    const o = st.pl[hop.T];
    if (o.mode === 'walk' && o.onNest && o.ship === pl.ship && Math.abs(o.x - pl.x) < 30) pl.x = approach(pl.x, sh.waitX, 90 * dt);
  }
  const x0 = pl.onNest ? sh.nestX0 + 4 : sh.deckX0, x1 = pl.onNest ? sh.nestX1 - 4 : sh.deckX1;
  pl.x = clamp(pl.x, x0, x1);
  if (pl.onNest) pl.h = sh.nest;
  const nearLad = Math.abs(pl.x - sh.ladX) < P.ladTol;
  if (!aiming && up && nearLad && !pl.onNest && !(pl.hh > 0)) { pl.mode = 'climb'; pl.h = 4; pl.x = sh.ladX; return; }
  if (!aiming && dn && nearLad && pl.onNest) { pl.mode = 'climb'; pl.onNest = false; pl.h = sh.nest - 4; pl.x = sh.ladX; pl.hh = 0; pl.hopV = 0; return; }   // (a hop under way ends here: it used to stay frozen for the whole climb)
  if (pnd.jump && !aiming && !(pl.hh > 0) && !(up && nearLad)) { pl.hopV = P.hopV; pl.hh = 0.01; }
  if (!aiming && up && !nearLad && !pl.onNest && pnd.jump && Math.abs(pl.x - sh.ladX) < 90) grappleHintOnce(st, 'lad' + pl.id, pl.id, 'Climb the rope ladder: stand by it and hold ' + grappleKey(pl.id, 'up'));
}
function grappleFallTick(st, pl, dt) {
  const P = GRAPPLE, f = pl.fall, hop = st.hop;
  f.vy += P.grav * dt; f.x += f.vx * dt; f.y += f.vy * dt;
  f.vx *= Math.exp(-dt * 1.5);
  pl.wx = f.x; pl.wy = f.y;
  for (const sh of [st.ships[hop.to], st.ships[hop.from]]) {
    if (!grappleOverDeck(sh, f.x)) continue;
    const dk = grappleDeckY(sh, st.t);
    if (f.y >= dk && f.vy > 0 && f.y - f.vy * dt <= dk + 6) {   // (only when crossing the deck line: a faller already below it is not snapped up onto the deck)
      pl.mode = 'walk'; pl.ship = sh.k; pl.onNest = false; pl.h = 0; pl.x = clamp(f.x, sh.deckX0, sh.deckX1); pl.fall = null; pl.sq = 1;
      Sfx.play('grappleLand', pl.id);
      grappleLanded(st, pl, sh);
      return;
    }
  }
  if (f.y >= P.SEA - 4) {
    // splash! Dolly the dolphin brings you back to the start ship
    pl.mode = 'swim'; pl.fall = null; pl.wx = f.x; pl.wy = P.SEA;
    st.stats.splashes++; hop.splashes++;
    grapplePop(st, f.x, P.SEA - 50, 'Splash!', '#ffffff', 26);
    for (let i = 0; i < 18; i++) grapplePart(st, f.x, P.SEA, (Math.random() - 0.5) * 200, -100 - Math.random() * 220, 0.8, i % 2 ? '#ffffff' : '#bff0ff', 3 + Math.random() * 3, 700, 'drop');
    Sfx.play('grappleBigSplash'); rumble(pl.id, 0.3, 0.5, 200);
    st.dolphin = { id: pl.id, t: 0, x0: f.x, x1: st.ships[hop.from].ladX - 40, ship: hop.from };
    if (hop.splashes >= P.splashHelp && !hop.handleGold) {
      hop.handleGold = true; st.stats.helps++;
      grappleMsg(st, 'Gold handle! It only lets go over a deck', C.gold, 3.8); Sfx.play('grappleHelp');
    }
    if (hop.phase === 'drop') hop.phase = 'caught';
  }
}
function grappleLanded(st, pl, sh) {
  const hop = st.hop, P = GRAPPLE;
  if (pl.id === hop.Z && hop.phase === 'drop') {
    if (sh.k === hop.to) {
      hop.phase = 'haul'; hop.landed = true; hop.stuckT = 0;
      grapplePop(st, pl.x, grappleDeckY(sh, st.t) - 60, 'Made it!', '#ffffff', 20);
      grappleHint(st, hop.Z, 'Crank the capstan! ' + grappleKey(hop.Z, 'act') + ' ... ' + grappleKey(hop.Z, 'act'), 3);
      grappleHint(st, hop.T, 'Hop in the chair at the X! ' + grappleKey(hop.T, 'act'), 3);
      pl.cheerT = 0.8;
    } else hop.phase = 'caught'; // (dropped back onto the start ship: grab the handle again)
  } else if (pl.id === hop.T && hop.phase === 'arrive') {
    pl.cheerT = 1.2; st.pl[hop.Z].cheerT = 1.2;
    hop.done = true; hop.doneT = 0; hop.rope = null; hop.phase = 'done';
    st.stats.hopT.push(G.time - hop.startT);
    grapplePop(st, pl.x, grappleDeckY(sh, st.t) - 70, 'All aboard!', C.gold, 22);
    Sfx.play('grappleArrive');
    st.crewCheer = { ship: hop.to, t: 1.6 };
  }
}
function grappleNextHop(st, dt) {
  const P = GRAPPLE;
  if (st.hopI + 1 < st.hopN) { grappleStartHop(st, st.hopI + 1); return; }
  // the fleet is done
  const first = st.endT === 0;
  st.endT += dt;
  if (first) {
    st.stats.roomT[st.k] = G.time - st.segStart;
    const Lv = G.level;
    if (Lv.def.rooms && Lv.def.roomIndex < Lv.def.roomCount - 1) { grappleMsg(st, 'Fleet ' + (st.k + 1) + ' crossed! On to the next ships!', '#ffffff', 2.2); Sfx.play('grappleFleet'); }
    else { st.fin = { t: 0 }; Sfx.play('grappleParty'); }
  }
  if (st.fin) return;
  if (st.endT >= P.roomEndT) { st.endT = 0; nextRoom(); }
}
function grappleFinStep(st, dt) {
  const P = GRAPPLE, fn = st.fin, sh = st.ships[st.ships.length - 1];
  fn.t += dt;
  for (const pl of st.pl) { if (pl.mode === 'fall') grappleFallTick(st, pl, dt); pl.cheerT = 1; if (pl.mode === 'walk') pl.x = approach(pl.x, sh.mast - 70 + pl.id * 46, 80 * dt); }
  if (fn.t > 0.6 && !fn.polly) { fn.polly = true; st.polly.say = 'Ahoy, Pip and Bo! Welcome aboard!'; st.polly.sayT = 4; }
  if (fn.t > 1.2 && !fn.chest) { fn.chest = true; Sfx.play('grappleChest'); for (let i = 0; i < 80; i++) confetti(sh.mast + 70 - st.cam.x, grappleDeckY(sh, st.t) - 90); }
  if (fn.t >= P.finT && !fn.cleared) { fn.cleared = true; G.level.goal = { x: sh.mast - st.cam.x, y: grappleDeckY(sh, st.t) - 80 }; levelClear(); }
}

/* ---------- what each player should do now (the prompts, job cards and the computer read this) ---------- */
// job: 'climb' (go up the ladder), 'spot' (walk to the X), 'aim', 'waitHook', 'grab', 'zip', 'board', 'capstan' (walk
// there), 'crank', 'ride', 'wait', 'swim', 'done'. Also: ship, nest (true: the job is in the crow's nest), x (where).
function grappleNeeds(st, id) {
  const hop = st.hop, pl = st.pl[id];
  if (!hop || hop.done || st.fin) return { job: 'done' };
  const from = st.ships[hop.from], to = st.ships[hop.to];
  if (pl.mode === 'swim') return { job: 'swim' };
  if (pl.mode === 'fall') return { job: 'wait' };
  if (id === hop.T) {
    if (hop.phase === 'aim' || hop.phase === 'fly' || hop.phase === 'reel') {
      if (pl.ship !== hop.from) return { job: 'wait' };
      if (!pl.onNest) return { job: 'climb', ship: from.k, x: from.ladX, nest: true };
      if (!grappleOnSpot(from, pl)) return { job: 'spot', ship: from.k, x: from.spotX, nest: true };
      return { job: hop.phase === 'aim' ? 'aim' : 'waitHook', ship: from.k, x: from.spotX, nest: true };
    }
    if (hop.phase === 'caught' || hop.phase === 'zip' || hop.phase === 'drop') return { job: pl.onNest ? 'wait' : 'climb', ship: from.k, x: pl.onNest ? from.spotX : from.ladX, nest: true };
    if (hop.phase === 'haul') {
      if (pl.mode === 'chair') return { job: 'ride' };
      if (!pl.onNest) return { job: 'climb', ship: from.k, x: from.ladX, nest: true };
      return { job: 'board', ship: from.k, x: from.spotX, nest: true };
    }
    return { job: 'wait' };
  }
  // the zipper
  if (hop.phase === 'aim' || hop.phase === 'fly' || hop.phase === 'reel' || hop.phase === 'caught') {
    if (pl.ship !== hop.from) return { job: 'wait' };
    if (!pl.onNest) return { job: 'climb', ship: from.k, x: from.ladX, nest: true };
    const x = from.waitX;
    if (hop.phase !== 'caught') return { job: 'waitHook', ship: from.k, x, nest: true };
    return { job: 'grab', ship: from.k, x, nest: true };
  }
  if (hop.phase === 'zip' || hop.phase === 'drop') return { job: 'zip' };
  if (hop.phase === 'haul' || hop.phase === 'arrive') {
    if (pl.ship !== hop.to) return { job: 'wait' };
    if (pl.onNest || pl.mode === 'climb') return { job: 'capstan', ship: to.k, x: to.ladX, nest: false };
    if (Math.abs(pl.x - to.capX) > 18) return { job: 'capstan', ship: to.k, x: to.capX, nest: false };
    return { job: hop.phase === 'haul' ? 'crank' : 'wait', ship: to.k, x: to.capX, nest: false };
  }
  return { job: 'wait' };
}

/* ---------- Captain Polly: flies over with a hint when a hop has stalled, and to cheer ---------- */
function grapplePolly(st, dt) {
  const P = GRAPPLE, po = st.polly, hop = st.hop;
  po.t += dt;
  if (po.sayT > 0) po.sayT -= dt; else po.say = null;
  let tx = st.cam.x - 160, ty = 110;
  if (st.fin) { const sh = st.ships[st.ships.length - 1]; tx = sh.mast; ty = grappleNestY(sh, st.t) - 34; }
  else if (hop && !hop.done && hop.stuckT > P.pollyT && G.introT <= 0) {
    // who is stuck? point at the job (in 1-player mode, the person's own job first)
    const order = cpuSolo() ? [cpuHuman(), 1 - cpuHuman()] : [hop.T, hop.Z];
    let who = null, nd = null;
    for (const id of order) { const n = grappleNeeds(st, id); if (n.job !== 'wait' && n.job !== 'zip' && n.job !== 'ride' && n.job !== 'swim') { who = id; nd = n; break; } }
    if (who != null) {
      const tip = grapplePollyTip(st, who, nd);
      const pl = st.pl[who];
      tx = pl.wx + 60; ty = pl.wy - 90;
      if (tip && (!po.say || po.say !== tip) && po.sayT <= 0) { po.say = tip; po.sayT = 4.5; Sfx.play('grappleSquawk'); }
      if (hop.stuckT > P.pollyT + 14) hop.stuckT = P.pollyT - 6;
    }
  } else if (hop && hop.gold >= 2 && (hop.phase === 'aim' || hop.phase === 'fly' || hop.phase === 'reel')) {
    const rg = grappleRing(st, st.ships[hop.to], st.t); tx = rg.x + 20; ty = rg.y - 70;
  }
  po.tx = tx; po.ty = ty;
  const dx = po.tx - po.x, dy = po.ty - po.y;
  po.x += dx * Math.min(1, dt * 1.8); po.y += dy * Math.min(1, dt * 1.8);
  if (Math.abs(dx) > 4) po.face = dx > 0 ? 1 : -1;
}
function grapplePollyTip(st, id, nd) {
  const n = NAMES[id];
  switch (nd.job) {
    case 'climb': return 'Squawk! ' + n + ', climb the rope ladder!';
    case 'spot': return 'Squawk! ' + n + ', stand on the gold X!';
    case 'aim': return 'Squawk! ' + n + ', hold to charge, let go to throw!';
    case 'grab': return 'Squawk! ' + n + ', grab the handle at the X!';
    case 'board': return 'Squawk! ' + n + ', hop in the chair at the X!';
    case 'capstan': return 'Squawk! ' + n + ', run to the capstan!';
    case 'crank': return 'Squawk! ' + n + ', heave... ho! Heave... ho!';
    default: return null;
  }
}

/* ---------- prompts, pops and bits ---------- */
function grappleHint(st, id, text, life) { if (grappleQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || GRAPPLE.hintLife }; }
function grappleHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; grappleHint(st, id, text); }
function grappleMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function grapplePop(st, x, y, s, col, size) {
  for (let k = 0; k < 4; k++) { const o = st.pops.find(q => q.t < 0.7 && Math.abs(q.x - x) < 120 && Math.abs(q.y - y) < 22); if (!o) break; y = o.y - 24; }
  st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 12) st.pops.shift();
}
function grapplePart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 300) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function grappleFx(st, dt) {
  const P = GRAPPLE, hop = st.hop;
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'feather') { q.vx *= 1 - dt * 2; q.vy = Math.min(q.vy, 40); }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.3);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  if (st.sign && (st.sign.t += dt) >= st.sign.life) st.sign = null;
  if (st.crewCheer && (st.crewCheer.t -= dt) <= 0) st.crewCheer = null;
  if (st.crewCheer2 && (st.crewCheer2.t -= dt) <= 0) st.crewCheer2 = null;
  if (hop) {
    for (const ln of hop.lines) if (ln.wob > 0) ln.wob = Math.max(0, ln.wob - dt * 1.2);
    for (const g of hop.gulls) if (g.hitT > 0) g.hitT = Math.max(0, g.hitT - dt);
    for (const o of hop.obs) if (o.hitT > 0) o.hitT = Math.max(0, o.hitT - dt * 1.5);
    for (const c of hop.coins) if (c.fly > 0) c.fly = Math.max(0, c.fly - dt * 2.2);
    if (hop.heaveA > 0) hop.heaveA = Math.max(0, hop.heaveA - dt * 3);
    if (hop.phase === 'reel' && hop.missAt) { /* (drawn as the hook coming home) */ }
  }
  // Dolly the dolphin carries a splashed zipper back to the start ship
  const dl = st.dolphin;
  if (dl) {
    dl.t += dt;
    const pl = st.pl[dl.id], u = grappleSmooth((dl.t - 0.5) / (P.dolphinT - 1.0));
    pl.wx = grappleLerp(dl.x0, dl.x1, u); pl.wy = P.SEA - 6 - Math.sin(u * Math.PI) * 30;
    if (dl.t >= P.dolphinT) {
      const sh = st.ships[dl.ship];
      pl.mode = 'walk'; pl.ship = sh.k; pl.onNest = false; pl.h = 0; pl.x = clamp(dl.x1, sh.deckX0, sh.deckX1); pl.sq = 1;
      grapplePop(st, pl.x, grappleDeckY(sh, st.t) - 60, 'Thanks, Dolly!', '#ffffff', 18);
      Sfx.play('grappleLand', pl.id);
      st.dolphin = null;
      grappleHint(st, pl.id, 'Climb up and zip again! Let go at the end', 3);
    }
  }
}
function grappleCamera(st, dt, snap) {
  const hop = st.hop;
  let tx;
  if (st.fin) { const sh = st.ships[st.ships.length - 1]; tx = sh.mast - W / 2 + 40; }
  else if (hop) {
    const from = st.ships[hop.from], to = st.ships[hop.to];
    tx = (from.mast + to.mast) / 2 - W / 2;
    // after the hop (and while the fleet ends) look at the ship you just reached
    if (hop.done) { const nx = st.ships[Math.min(st.ships.length - 1, hop.to + 1)]; tx = st.hopI + 1 < st.hopN ? (to.mast + nx.mast) / 2 - W / 2 : to.mast - W / 2; }
  } else tx = 0;
  if (snap) st.cam.x = tx;
  else st.cam.x += (tx - st.cam.x) * (1 - Math.exp(-dt * 2.4));
}
// the touch buttons and the top-bar legend name each player's own action right now
let grappleLabelEls = null;
function grappleActLabels(st) {
  const hop = st.hop;
  if (!hop) return;
  if (typeof setJobs === 'function') setJobs(hop.T === 0 ? ['thrower', 'zipper'] : ['zipper', 'thrower']);   // (each card shows the player's own job)
  const word = id => {
    if (id === hop.T) return hop.phase === 'haul' || hop.phase === 'caught' || hop.phase === 'zip' || hop.phase === 'drop' || hop.phase === 'arrive' ? 'ride' : 'throw';
    return hop.phase === 'zip' ? 'drop' : hop.phase === 'haul' || hop.phase === 'arrive' ? 'crank' : 'grab';
  };
  const key = word(0) + '/' + word(1);
  if (typeof setActWords === 'function') setActWords([word(0), word(1)]);   // (the cards follow the live words)
  if (st.labKey === key && grappleLabelEls && grappleLabelEls.every(o => document.contains(o.el))) return;
  st.labKey = key;
  try {
    if (!grappleLabelEls || !grappleLabelEls.every(o => document.contains(o.el))) grappleLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const ds = box && (box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp);
      const id = ds !== undefined && ds !== null ? +ds : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of grappleLabelEls) {
      const want = o.id < 0 ? 'action' : word(o.id);
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
// copy where each player is drawn into the engine players (screen px): name tags and bubbles read p.x / p.y
function grappleMirror(st) {
  for (const pl of st.pl) {
    if (pl.mode === 'walk' || pl.mode === 'climb') {
      const sh = st.ships[pl.ship];
      pl.wx = pl.x; pl.wy = grappleDeckY(sh, st.t) - pl.h - (pl.hh || 0);
    }
    const p = G.players[pl.id];
    p.x = pl.wx - st.cam.x - PW / 2; p.y = pl.wy - PH;
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = 0; p.stun = 0; p.face = pl.face || 1;
  }
}

MODES.grapple = {
  // the medal (js/medals.js): Gold by 3:45 with 65% of the coins and at most 8 missed hooks; Silver by 5:30 with 35%
  medals: { bronze: "Reach Captain Polly's flagship", goals: [{ key: 'time', gold: 225, silver: 330 },
    { key: 'coins', gold: 0.65, silver: 0.35, more: true, pct: true, word: 'the coins' }, { key: 'misses', gold: 8, word: 'missed hook' }] },
  medalValues() { const s = G.mst.stats; return s ? { coins: s.coinsAll ? s.coins / s.coinsAll : 1, misses: s.misses[0] + s.misses[1] } : {}; },
  GRAPPLE,
  needs: grappleNeeds,
  setup(st, L) {
    // how many coins float along all the lines (for the results and the medal)
    let coinsAll = 0;
    const rooms = (LEVELS[G.levelIndex] && LEVELS[G.levelIndex].rooms) || [L.def];
    for (const r of rooms) (r.fleet || []).forEach((s, i) => { if (i === 0) return; coinsAll += String(s.coins || '').replace(/\./g, '').length + String(s.chair || '').replace(/\./g, '').length; });
    st.stats = { coins: 0, coinsAll, coinsBy: [0, 0], throws: [0, 0], misses: [0, 0], caught: [0, 0], first: 0, close: 0, splashes: 0, bonks: 0,
      heaves: [0, 0], goodHeaves: [0, 0], pulls: [0, 0], helps: 0, hopT: [], roomT: [], roomTitles: [] };
    st.t = 0;
    grappleRoom(st, L, 0);
  },
  room(k, L) { grappleRoom(G.mst, L, k); },
  step(dt) { grappleStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.hop) return;
    grappleDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.hop) return;
    grappleDrawFront(st);
  },
  hud() { const st = G.mst; if (st.hop) grappleHud(st); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const thr = s.throws[0] + s.throws[1], miss = s.misses[0] + s.misses[1];
    const out = [
      { label: 'Coins', value: s.coins + ' of ' + s.coinsAll },
      { label: 'Hooks / misses', value: thr + ' / ' + miss },
      { label: 'Splashes & bonks', value: s.splashes + ' & ' + s.bonks },
    ];
    const hops = s.caught[0] + s.caught[1];
    out.push('Coins: Pip ' + s.coinsBy[0] + ', Bo ' + s.coinsBy[1] + '. First-try catches: ' + s.first + ' of ' + hops + '. Good heaves: Pip ' + s.goodHeaves[0] + ', Bo ' + s.goodHeaves[1] + '.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
  // read-only helpers for the computer brain and the bot tests
  test: { rope: grappleRopeMake, ropeAt: grappleRopeAt, ropeU: grappleRopeU, hookMove: grappleHookMove, ring: grappleRing, hand: grappleHand,
    deckY: grappleDeckY, nestY: grappleNestY, onSpot: grappleOnSpot, overDeck: grappleOverDeck, wind: grappleWind, powAt: grapplePowAt },
};

/* ---------- drawing ---------- */
const GRAPPLE_COL = {
  seaTop: '#46c9d8', sea: '#2fb3c9', seaDeep: '#1f8fb0', foam: '#f2fffd', far: '#9fe6e3', farDk: '#6fcfd3',
  wood: '#a8723e', woodDk: '#6e4422', woodLt: '#c99358', rope: '#e8cf98', ropeDk: '#7a5a2a', brass: '#ffc53d', brassDk: '#a8770f',
  sand: '#f4dc9a', palm: '#4fae4a', palmDk: '#2f7d36', trunk: '#9a6a3a', island: '#5cbf63', islandDk: '#3f9a4f',
};
const grappleVisible = (st, sh) => !(sh.x > st.cam.x + W + 90 || sh.x + sh.L + 70 < st.cam.x - 60);
function grappleDrawWorld(st) {
  const cam = st.cam;
  grappleDrawSky(st);
  ctx.save(); ctx.translate(-cam.x, 0);
  grappleDrawBackSea(st);
  if (st.ships[0].dock) grappleDrawBeach(st, st.ships[0]);
  for (const sh of st.ships) { if (!grappleVisible(st, sh)) continue; if (sh.dock) grappleDrawDock(st, sh); else grappleDrawShip(st, sh); }
  const hop = st.hop;
  if (hop) {
    grappleDrawLaundry(st, hop);
    grappleDrawObstacles(st, hop, false);
    grappleDrawRope(st, hop);
    grappleDrawCoins(st, hop);
    grappleDrawGulls(st, hop);
  }
  // (the thrower is drawn last so the partner waiting in the crow's nest never hides them)
  const order = hop && !hop.done && hop.T === 0 ? [1, 0] : [0, 1];
  for (const k of order) grappleDrawPlayer(st, st.pl[k]);
  for (const sh of st.ships) { if (!grappleVisible(st, sh)) continue; grappleDrawNestFront(st, sh); }
  if (hop) { grappleDrawHook(st, hop); grappleDrawObstacles(st, hop, true); }
  grappleDrawDolphin(st);
  grappleDrawFrontSea(st);
  ctx.restore();
}
function grappleDrawFront(st) {
  const cam = st.cam;
  ctx.save(); ctx.translate(-cam.x, 0);
  grappleDrawAim(st, st.hop);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.x < cam.x - 30 || q.x > cam.x + W + 30) continue;
    ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { grappleStar(q.x, q.y, q.size * 1.7, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'feather') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.sin(q.r) * 0.8); ctx.beginPath(); ctx.ellipse(0, 0, q.size * 1.8, q.size * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else { circle(q.x, q.y, q.size * (0.6 + 0.4 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  grappleDrawPolly(st);
  for (const q of st.pops) {
    // (a quick fade at the end: a half-see-through outline shows through the letters)
    const a = clamp((1.3 - q.t) / 0.3, 0, 1), x = clamp(q.x, cam.x + 80, cam.x + W - 80), y = q.y - q.t * 30;
    ctx.font = q.size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // (the outline fades faster than the letters, so it never shows through them as they go)
    ctx.globalAlpha = a * a * a;
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, q.size * 0.2); ctx.strokeStyle = 'rgba(28,26,54,0.85)'; ctx.strokeText(q.s, x, y);
    ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.fillText(q.s, x, y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function grappleStar(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// sky, sun, clouds, far islands and sailboats (parallax)
function grappleDrawSky(st) {
  const cam = st.cam, t = G.clock;
  const g = ctx.createLinearGradient(0, 0, 0, 310);
  g.addColorStop(0, C.skyTop || '#55c3ef'); g.addColorStop(1, C.skyBot || '#fff2cf');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 312);
  ctx.fillStyle = 'rgba(255,244,190,0.35)'; circle(820, 86, 74); ctx.fill();
  ctx.save(); ctx.translate(820, 86); ctx.rotate(t * 0.05); ctx.fillStyle = 'rgba(255,248,210,0.3)';
  ctx.beginPath(); for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.moveTo(-5, 46); ctx.lineTo(0, 86 + (i % 2) * 14); ctx.lineTo(5, 46); ctx.closePath(); } ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,246,190,0.98)'; circle(820, 86, 40); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(811, 78, 22); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,120,0.75)'; ctx.lineWidth = 2; circle(820, 86, 40); ctx.stroke();
  for (let k = 0; k < 7; k++) {
    const cx = ((k * 230 - cam.x * 0.12 + t * 6) % 1610 + 1610) % 1610 - 200, cy = 50 + (hash(k + 40, 3) % 80);
    const s = 0.8 + (hash(k, 9) % 50) / 100;
    drawCloud(cx, cy, s * 1.15);
  }
  const hy = 300;
  const sg = ctx.createLinearGradient(0, hy, 0, GRAPPLE.SEA);
  sg.addColorStop(0, GRAPPLE_COL.far); sg.addColorStop(1, GRAPPLE_COL.seaTop);
  ctx.fillStyle = sg; ctx.fillRect(0, hy, W, GRAPPLE.SEA - hy + 2);
  for (let k = 0; k < 5; k++) {
    const ix = ((k * 520 - cam.x * 0.22) % 2600 + 2600) % 2600 - 300, w = 150 + hash(k, 2) % 120, hgt = 30 + hash(k, 4) % 30;
    ctx.fillStyle = GRAPPLE_COL.sand; ctx.beginPath(); ctx.ellipse(ix, hy + 2, w * 0.62, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = GRAPPLE_COL.island; ctx.beginPath(); ctx.ellipse(ix, hy, w * 0.5, hgt, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = GRAPPLE_COL.islandDk; ctx.beginPath(); ctx.ellipse(ix + w * 0.12, hy, w * 0.3, hgt * 0.7, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ix, hy, w * 0.5 - 2, hgt - 2, 0, Math.PI * 1.12, Math.PI * 1.6); ctx.stroke();
    ctx.fillStyle = GRAPPLE_COL.islandDk; ctx.beginPath(); for (let j = 0; j < 4; j++) { grappleDot(ix - w * 0.4 + (hash(k, j + 30) % Math.max(1, w * 0.8 | 0)), hy - 2, 4 + (j % 2) * 2.5); } ctx.fill();
    ctx.fillStyle = 'rgba(40,120,110,0.22)'; ctx.beginPath(); ctx.ellipse(ix, hy + 8, w * 0.5, 4, 0, 0, Math.PI * 2); ctx.fill();
    for (let j = 0; j < 2; j++) grapplePalm(ix - w * 0.2 + j * w * 0.36, hy - hgt * 0.75, 0.55, t + k);
    if (k % 2 === 0) {
      const lx = ix + w * 0.28;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(lx - 5, hy - hgt - 26, 10, 30);
      ctx.fillStyle = '#ef6a55'; ctx.fillRect(lx - 5, hy - hgt - 18, 10, 6); ctx.fillRect(lx - 5, hy - hgt - 6, 10, 6);
      ctx.fillStyle = '#ffe08a'; ctx.fillRect(lx - 4, hy - hgt - 32, 8, 6);
      ctx.fillStyle = '#c94a3a'; ctx.beginPath(); ctx.moveTo(lx - 6, hy - hgt - 32); ctx.lineTo(lx, hy - hgt - 38); ctx.lineTo(lx + 6, hy - hgt - 32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(lx + 1, hy - hgt - 26, 4, 30);
      ctx.strokeStyle = 'rgba(90,70,80,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(lx - 5, hy - hgt - 26, 10, 30);
      ctx.fillStyle = 'rgba(255,240,170,' + (0.25 + 0.2 * Math.sin(t * 3 + k)) + ')'; circle(lx, hy - hgt - 29, 8); ctx.fill();
    }
  }
  for (let k = 0; k < 4; k++) {
    const bx = ((k * 380 - cam.x * 0.4 + t * 9) % 1520 + 1520) % 1520 - 160, by = hy + 26 + (k % 2) * 18;
    ctx.fillStyle = '#7a5a3e'; ctx.beginPath(); ctx.moveTo(bx - 14, by); ctx.lineTo(bx + 14, by); ctx.lineTo(bx + 9, by + 5); ctx.lineTo(bx - 9, by + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(bx, by - 2); ctx.lineTo(bx, by - 24); ctx.lineTo(bx + 12, by - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ['#ef6a55', '#5bd8c9', '#ffcf4a', '#b78cff'][k]; ctx.beginPath(); ctx.moveTo(bx - 1, by - 2); ctx.lineTo(bx - 1, by - 18); ctx.lineTo(bx - 10, by - 4); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (let k = 0; k < 18; k++) { const x = ((k * 97 - cam.x * 0.5) % 1000 + 1000) % 1000 - 20, y = hy + 8 + (hash(k, 11) % 110); ctx.moveTo(x, y); ctx.lineTo(x + 16 + (k % 3) * 6, y); } ctx.stroke();
}
function grapplePalm(x, y, s, t) {
  ctx.strokeStyle = GRAPPLE_COL.trunk; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + 40 * s); ctx.quadraticCurveTo(x + 8 * s, y + 18 * s, x + 4 * s, y); ctx.stroke();
  const sw = Math.sin(t * 1.3) * 0.08;
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.62 + sw;
    ctx.fillStyle = i % 2 ? GRAPPLE_COL.palm : GRAPPLE_COL.palmDk;
    ctx.save(); ctx.translate(x + 4 * s, y); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, -13 * s, 4.5 * s, 15 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = '#8a5a2c'; circle(x + 2 * s, y + 3 * s, 2.6 * s); ctx.fill(); circle(x + 7 * s, y + 4 * s, 2.6 * s); ctx.fill();
  ctx.lineCap = 'butt';
}
function grappleDrawBackSea(st) {
  const cam = st.cam, S = GRAPPLE.SEA;
  const g = ctx.createLinearGradient(0, S - 10, 0, H);
  g.addColorStop(0, GRAPPLE_COL.seaTop); g.addColorStop(1, GRAPPLE_COL.seaDeep);
  ctx.fillStyle = g; ctx.fillRect(cam.x - 10, S - 6, W + 20, H - S + 10);
}
function grappleDrawFrontSea(st) {
  const cam = st.cam, S = GRAPPLE.SEA, t = G.clock;
  const wy = x => S + 6 + Math.sin(x * 0.03 + t * 2.2) * 3;
  ctx.fillStyle = 'rgba(47,179,201,0.8)';
  ctx.beginPath(); ctx.moveTo(cam.x - 20, H + 2);
  for (let x = cam.x - 20; x <= cam.x + W + 20; x += 12) ctx.lineTo(x, wy(x));
  ctx.lineTo(cam.x + W + 20, H + 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(242,255,253,0.9)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = cam.x - 20; x <= cam.x + W + 20; x += 8) { if (x === cam.x - 20) ctx.moveTo(x, wy(x)); else ctx.lineTo(x, wy(x)); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  const k0 = Math.floor((cam.x - 40) / 70), k1 = Math.ceil((cam.x + W + 40) / 70);
  for (let k = k0; k <= k1; k++) for (let j = 0; j < 2; j++) {
    const h = hash(k, j + 21), x = k * 70 + (h % 70) + Math.sin(t + h) * 6, y = S + 30 + j * 38 + (h >> 7) % 26;
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.quadraticCurveTo(x, y - 4, x + 10, y); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function grappleDrawBeach(st, dock) {
  const S = GRAPPLE.SEA, x1 = dock.x + 20;
  ctx.fillStyle = GRAPPLE_COL.sand;
  ctx.beginPath(); ctx.moveTo(x1 - 900, H); ctx.lineTo(x1 - 900, S - 30); ctx.quadraticCurveTo(x1 - 200, S - 40, x1 + 30, S + 14); ctx.lineTo(x1 + 30, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e9c97c'; for (let i = 0; i < 12; i++) { circle(x1 - 60 - i * 37, S - 20 + (i % 3) * 6, 2); ctx.fill(); }
  grapplePalm(x1 - 150, S - 104, 1.3, G.clock);
  grapplePalm(x1 - 270, S - 96, 1.1, G.clock + 1);
}
// a friendly pirate ship: hull, stern cabin, bowsprit, three masts (the middle one is the one you use), sails and flags
function grappleDrawShip(st, sh) {
  const t = st.t, dk = grappleDeckY(sh, t), x = sh.x, L = sh.L, pal = sh.pal, S = GRAPPLE.SEA, nestY = dk - sh.nest;
  const hop = st.hop, windDir = hop && (hop.wind || hop.gust) ? Math.sign(grappleWind(hop, t) || 1) : 1;
  // the decorative masts and sails first (behind the main sail)
  for (const [mx, mh, sc] of [[sh.mizzen, sh.mizzenH, 0.62], [sh.fore, sh.foreH, 0.75]]) {
    ctx.fillStyle = GRAPPLE_COL.woodDk; ctx.fillRect(mx - 3, dk - mh, 6, mh);
    grappleSail(mx, dk - mh + 10, dk - 34, 70 * sc, pal, t, windDir);
    grapplePennant(mx, dk - mh, 18, pal.flag, t, windDir);
  }
  // the main mast, its sail and the crow's nest (back half)
  ctx.fillStyle = GRAPPLE_COL.woodDk; ctx.fillRect(sh.mast - 4, nestY - 44, 8, sh.nest + 44);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(sh.mast - 3, nestY - 44, 2, sh.nest + 44);
  const sy0 = nestY + 22, sy1 = dk - sh.ring - 34;
  if (sy1 - sy0 > 30) grappleSail(sh.mast, sy0, sy1, 118, pal, t, windDir, true);
  grapplePennant(sh.mast, nestY - 44, 30, pal.flag, t, windDir, true);
  ctx.fillStyle = '#6e4422'; rr(sh.nestX0 - 2, nestY - 26, sh.nestX1 - sh.nestX0 + 4, 30, 6); ctx.fill();
  // the rope ladder up to the nest
  grappleLadder(sh.ladX, dk - 2, nestY + 2);
  // the hull
  ctx.save();
  const bowY = dk - 12;
  ctx.beginPath();
  ctx.moveTo(x - 4, dk - 34);
  ctx.lineTo(x + 70, dk - 34); ctx.lineTo(x + 74, dk - 2);
  ctx.lineTo(x + L - 70, dk - 2); ctx.quadraticCurveTo(x + L - 30, dk - 4, x + L + 6, bowY - 10);
  ctx.quadraticCurveTo(x + L - 6, S + 10, x + L - 46, S + 26);
  ctx.lineTo(x + 40, S + 26); ctx.quadraticCurveTo(x + 6, S + 18, x - 4, dk - 34);
  ctx.closePath();
  ctx.fillStyle = pal.hull; ctx.fill();
  const hullPath = new Path2D(); hullPath.moveTo(x - 4, dk - 34); hullPath.lineTo(x + 70, dk - 34); hullPath.lineTo(x + 74, dk - 2);
  hullPath.lineTo(x + L - 70, dk - 2); hullPath.quadraticCurveTo(x + L - 30, dk - 4, x + L + 6, bowY - 10);
  hullPath.quadraticCurveTo(x + L - 6, S + 10, x + L - 46, S + 26); hullPath.lineTo(x + 40, S + 26); hullPath.quadraticCurveTo(x + 6, S + 18, x - 4, dk - 34); hullPath.closePath();
  ctx.clip();
  // planks
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (let y = dk + 6; y < S + 30; y += 9) { ctx.moveTo(x - 10, y); ctx.lineTo(x + L + 10, y); } ctx.stroke();
  // the bright band with round windows (flower boxes, no cannons on these friendly ships)
  ctx.fillStyle = pal.band; ctx.fillRect(x - 10, dk + 6, L + 20, 15);
  for (let px = x + 50; px < x + L - 40; px += 40) {
    ctx.fillStyle = '#5a3a1e'; circle(px, dk + 13.5, 5.5); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; circle(px, dk + 13.5, 3.8); ctx.fill();
  }
  ctx.fillStyle = pal.hullDk; ctx.fillRect(x - 10, S + 2, L + 20, 30);
  // lit edges on the band, nails along the planks, a shaded stern and a lit bow
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x - 10, dk + 6, L + 20, 1.5); ctx.fillRect(x - 10, dk - 2, L + 20, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x - 10, dk + 19, L + 20, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); for (let px = x + 30; px < x + L - 30; px += 26) { grappleDot(px, dk + 30, 1.1); grappleDot(px + 13, dk + 48, 1.1); } ctx.fill();
  const hg = ctx.createLinearGradient(x - 4, 0, x + L + 6, 0); hg.addColorStop(0, 'rgba(0,0,0,0.16)'); hg.addColorStop(0.25, 'rgba(0,0,0,0)'); hg.addColorStop(0.85, 'rgba(255,255,255,0)'); hg.addColorStop(1, 'rgba(255,255,255,0.12)');
  ctx.fillStyle = hg; ctx.fillRect(x - 10, dk - 40, L + 20, S - dk + 80);
  ctx.restore();
  ctx.strokeStyle = mixCol(pal.hullDk, '#141428', 0.45); ctx.lineWidth = 2.2; ctx.stroke(hullPath);
  // stern cabin with windows, the name board
  ctx.fillStyle = pal.cabin; rr(x + 4, dk - 34, 64, 34, 4); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + 56, dk - 33, 11, 32);
  ctx.strokeStyle = 'rgba(40,24,10,0.45)'; ctx.lineWidth = 1.5; rr(x + 4, dk - 34, 64, 34, 4); ctx.stroke();
  ctx.fillStyle = pal.trim; ctx.fillRect(x - 4, dk - 38, 80, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 4, dk - 38, 80, 1.5);
  for (const wx of [x + 18, x + 42]) { ctx.fillStyle = '#5a3a1e'; rr(wx - 1, dk - 27, 14, 14, 3); ctx.fill(); ctx.fillStyle = '#ffe9a8'; rr(wx + 1, dk - 25, 10, 10, 2); ctx.fill(); }
  // rails along the deck
  ctx.strokeStyle = pal.trim; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 74, dk - 16); ctx.lineTo(x + L - 46, dk - 16); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); for (let px = x + 80; px < x + L - 46; px += 22) { ctx.moveTo(px, dk - 16); ctx.lineTo(px, dk - 2); } ctx.stroke();
  // the bowsprit and a smiling dolphin figurehead
  ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + L - 20, dk - 12); ctx.lineTo(x + L + 52, dk - 44); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = GRAPPLE_COL.ropeDk;
  ctx.beginPath(); ctx.moveTo(x + L + 50, dk - 43); ctx.lineTo(sh.fore, dk - sh.foreH + 6); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = pal.trim; ctx.beginPath(); ctx.ellipse(x + L + 2, dk - 6, 9, 6, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; circle(x + L + 5, dk - 9, 1.4); ctx.fill();
  // name board on the stern cabin roof
  ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif';
  const nw = ctx.measureText(sh.name).width + 14;
  ctx.fillStyle = '#f4e2b8'; rr(x + 36 - nw / 2, dk - 56, nw, 16, 5); ctx.fill();
  ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 1.5; rr(x + 36 - nw / 2, dk - 56, nw, 16, 5); ctx.stroke();
  text(sh.name, x + 36, dk - 47.5, 11, '#4a2a10', 'center', 'body');
  // the capstan (on ships you arrive at) and the crew
  grappleCapstan(st, sh, dk);
  grappleCrew(st, sh, dk);
  // the ring on its spar (or hanging from a swinging boom)
  grappleRingDraw(st, sh);
  if (sh.flagship) grappleChest(st, sh, dk);
}
function grappleSail(mx, y0, y1, w, pal, t, windDir, big) {
  const bil = (big ? 12 : 7) * windDir + Math.sin(t * 2 + mx) * 2;
  ctx.fillStyle = GRAPPLE_COL.woodDk; ctx.fillRect(mx - w / 2 - 4, y0 - 3, w + 8, 5);
  ctx.beginPath();
  ctx.moveTo(mx - w / 2, y0); ctx.lineTo(mx + w / 2, y0);
  ctx.quadraticCurveTo(mx + w / 2 + bil, (y0 + y1) / 2, mx + w / 2 - 4, y1);
  ctx.lineTo(mx - w / 2 + 4, y1);
  ctx.quadraticCurveTo(mx - w / 2 + bil, (y0 + y1) / 2, mx - w / 2, y0);
  ctx.closePath();
  ctx.fillStyle = pal.sail; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = pal.stripe; ctx.globalAlpha = 0.85;
  const n = big ? 3 : 2, sw = w / (n * 2 + 1);
  for (let i = 0; i < n; i++) ctx.fillRect(mx - w / 2 + sw * (1 + i * 2) + bil * 0.4, y0, sw, y1 - y0 + 2);
  ctx.globalAlpha = 1;
  if (big) {
    // a smiley sun patch
    const cy = (y0 + y1) / 2, cx = mx + bil * 0.5, r = Math.min(16, (y1 - y0) * 0.28);
    ctx.fillStyle = '#ffe08a'; circle(cx, cy, r); ctx.fill();
    ctx.strokeStyle = '#a8770f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy + r * 0.1, r * 0.55, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = '#a8770f'; circle(cx - r * 0.35, cy - r * 0.25, 1.6); ctx.fill(); circle(cx + r * 0.35, cy - r * 0.25, 1.6); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(80,50,20,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
}
function grapplePennant(mx, y, len, col, t, dir, big) {
  const d = dir || 1, wv = Math.sin(t * 6 + mx) * 3;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(mx, y); ctx.quadraticCurveTo(mx + d * len * 0.5, y + 3 + wv, mx + d * len, y + 6 + wv * 0.6); ctx.lineTo(mx, y + 12); ctx.closePath(); ctx.fill();
  if (big) { ctx.fillStyle = '#ffffff'; grappleStar(mx + d * len * 0.38, y + 6 + wv * 0.4, 4, 1.8, 0); ctx.fill(); }
  ctx.fillStyle = GRAPPLE_COL.brass; circle(mx, y - 2, 3.5); ctx.fill();
}
function grappleLadder(lx, y0, y1) {
  ctx.strokeStyle = GRAPPLE_COL.ropeDk; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(lx - 7, y0); ctx.lineTo(lx - 6, y1); ctx.moveTo(lx + 7, y0); ctx.lineTo(lx + 6, y1); ctx.stroke();
  ctx.strokeStyle = GRAPPLE_COL.rope; ctx.lineWidth = 2.2;
  ctx.beginPath(); for (let y = y0 - 8; y > y1 + 2; y -= 14) { ctx.moveTo(lx - 7, y); ctx.lineTo(lx + 7, y); } ctx.stroke();
}
// the front of the crow's nest (drawn over the players' feet)
function grappleDrawNestFront(st, sh) {
  const t = st.t, dk = grappleDeckY(sh, t), nestY = dk - sh.nest, x0 = sh.nestX0, x1 = sh.nestX1;
  if (sh.dock) {
    ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 - 2, nestY - 16); ctx.lineTo(x1 + 2, nestY - 16); ctx.stroke();
    ctx.beginPath(); for (let px = x0; px <= x1; px += 15) { ctx.moveTo(px, nestY - 16); ctx.lineTo(px, nestY); } ctx.stroke();
  } else {
    ctx.fillStyle = GRAPPLE_COL.wood; rr(x0 - 4, nestY - 14, x1 - x0 + 8, 20, 5); ctx.fill();
    ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 2;
    ctx.beginPath(); for (let px = x0 + 6; px < x1; px += 11) { ctx.moveTo(px, nestY - 12); ctx.lineTo(px, nestY + 5); } ctx.stroke();
    ctx.fillStyle = sh.pal.trim; ctx.fillRect(x0 - 6, nestY - 16, x1 - x0 + 12, 4);
  }
  // the gold X where the thrower stands (and the zipper grabs the handle)
  const hop = st.hop;
  if (hop && !hop.done && hop.from === sh.k) {
    const pulse = 0.65 + 0.35 * Math.sin(G.clock * 5);
    ctx.globalAlpha = pulse; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const sx = sh.spotX, sy = nestY + 10;
    ctx.beginPath(); ctx.moveTo(sx - 6, sy - 4); ctx.lineTo(sx + 6, sy + 4); ctx.moveTo(sx + 6, sy - 4); ctx.lineTo(sx - 6, sy + 4); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
  }
}
function grappleRingDraw(st, sh) {
  const t = st.t, rg = grappleRing(st, sh, t), dk = grappleDeckY(sh, t), hop = st.hop;
  const target = hop && !hop.done && hop.to === sh.k;
  if (sh.boom) {
    // a boom from the mast, the ring swinging from its end on a short rope
    const by = rg.y - 46;
    ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sh.mast, by + 10); ctx.lineTo(rg.x - 4, by); ctx.stroke();
    ctx.strokeStyle = GRAPPLE_COL.ropeDk; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(rg.x - 4, by); ctx.lineTo(rg.x, rg.y - 13); ctx.stroke();
    ctx.lineCap = 'butt';
  } else {
    ctx.fillStyle = GRAPPLE_COL.woodDk; ctx.fillRect(rg.x + 6, rg.y - 2, sh.mast - rg.x - 6, 5);
  }
  const gold = target ? hop.gold : 0, r = GRAPPLE.ringR * (gold >= 2 ? GRAPPLE.superRing : gold >= 1 ? GRAPPLE.goldRing : 1);
  if (target && (hop.phase === 'aim' || hop.phase === 'fly' || hop.phase === 'reel')) {
    // a soft glow so the target is easy to find
    ctx.fillStyle = gold ? 'rgba(255,214,90,0.4)' : 'rgba(255,255,255,0.35)'; circle(rg.x, rg.y, r + 9 + Math.sin(G.clock * 4) * 2); ctx.fill();
  }
  ctx.strokeStyle = GRAPPLE_COL.brassDk; ctx.lineWidth = 6; circle(rg.x, rg.y, r); ctx.stroke();
  ctx.strokeStyle = gold ? '#ffe27a' : GRAPPLE_COL.brass; ctx.lineWidth = 3.5; circle(rg.x, rg.y, r); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(rg.x, rg.y, r, -2.4, -1.4); ctx.stroke();
  void dk;
}
function grappleCapstan(st, sh, dk) {
  const hop = st.hop, active = hop && !hop.done && hop.to === sh.k && (hop.phase === 'haul' || hop.phase === 'arrive');
  const cx = sh.capX, rot = active ? hop.capRot : 0;
  ctx.fillStyle = GRAPPLE_COL.woodDk; rr(cx - 13, dk - 26, 26, 26, 4); ctx.fill();
  ctx.fillStyle = active && hop.capGold ? '#ffd75e' : GRAPPLE_COL.wood; rr(cx - 11, dk - 24, 22, 22, 3); ctx.fill();
  ctx.fillStyle = GRAPPLE_COL.ropeDk; for (let y = dk - 20; y < dk - 4; y += 4) ctx.fillRect(cx - 11, y, 22, 1.6);
  ctx.fillStyle = GRAPPLE_COL.woodLt; rr(cx - 15, dk - 30, 30, 6, 3); ctx.fill();
  // the bars, turning
  ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = rot + i * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    ctx.globalAlpha = s < 0 ? 0.55 : 1;
    ctx.beginPath(); ctx.moveTo(cx, dk - 28); ctx.lineTo(cx + c * 26, dk - 28 + s * 4); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  if (active && hop.heaveA > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + hop.heaveA * 0.8 + ')'; ctx.lineWidth = 2; circle(cx, dk - 18, 22 + (1 - hop.heaveA) * 10); ctx.stroke(); }
}
// a friendly pirate crew member or two on the foredeck (they cheer a catch)
function grappleCrew(st, sh, dk) {
  const n = sh.crew, cheer = (st.crewCheer && st.crewCheer.ship === sh.k) || (st.crewCheer2 && st.crewCheer2.ship === sh.k) || (st.fin && sh.flagship);
  for (let i = 0; i < n; i++) {
    const cx = sh.x + sh.L - 64 - i * 34, h = hash(sh.k * 7 + i, 5), bounce = cheer ? Math.abs(Math.sin(G.clock * 9 + i)) * 6 : Math.sin(G.clock * 2 + i) * 1;
    grapplePirate(cx, dk - bounce, ['#ffd2a8', '#c98a5a', '#f2c08a', '#8a5a3a'][h % 4], ['#ef6a55', '#5b95ff', '#3fc0b4', '#b78cff', '#ffcf4a'][(h >> 3) % 5], cheer, i % 2 ? -1 : 1, h);
  }
}
function grapplePirate(x, y, skin, band, cheer, face, h) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  // legs and boots
  ctx.fillStyle = '#4a3a6a'; ctx.fillRect(-6, -10, 5, 10); ctx.fillRect(1, -10, 5, 10);
  ctx.fillStyle = '#2a2030'; ctx.fillRect(-7, -3, 7, 3); ctx.fillRect(1, -3, 7, 3);
  // striped shirt
  ctx.fillStyle = '#ffffff'; rr(-9, -28, 18, 19, 6); ctx.fill();
  ctx.fillStyle = band; for (let yy = -25; yy < -10; yy += 5) ctx.fillRect(-9, yy, 18, 2.4);
  // arms
  ctx.strokeStyle = skin; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  const wv = Math.sin(G.clock * 12 + h) * 4;
  if (cheer) { ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(-14, -38 + wv); ctx.moveTo(8, -24); ctx.lineTo(14, -38 - wv); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(-11, -13); ctx.moveTo(8, -24); ctx.lineTo(11, -13); ctx.stroke(); }
  ctx.lineCap = 'butt';
  // head, bandana, smile
  ctx.fillStyle = skin; circle(0, -36, 9); ctx.fill();
  ctx.fillStyle = band; ctx.beginPath(); ctx.arc(0, -38, 9.5, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-9, -39); ctx.lineTo(-15, -35); ctx.lineTo(-11, -32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; for (const dx of [-4, 3]) { circle(dx, -41.5, 1.3); ctx.fill(); }
  ctx.fillStyle = C.ink; circle(-3, -35, 1.4); ctx.fill(); circle(3, -35, 1.4); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -33, 3.2, 0.2, Math.PI - 0.2); ctx.stroke();
  if (h % 3 === 0) { ctx.fillStyle = '#6e4422'; ctx.beginPath(); ctx.ellipse(0, -29, 5, 2.6, 0, 0, Math.PI); ctx.fill(); } // a beard
  ctx.restore();
}
function grappleChest(st, sh, dk) {
  const open = st.fin && st.fin.t > 1.2, x = sh.mast + 70, y = dk;
  ctx.fillStyle = '#8a5a2c'; rr(x - 22, y - 26, 44, 26, 4); ctx.fill();
  ctx.fillStyle = GRAPPLE_COL.brass; ctx.fillRect(x - 22, y - 16, 44, 4); ctx.fillRect(x - 3, y - 22, 6, 10);
  if (open) {
    ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.ellipse(x, y - 26, 20, 8, 0, Math.PI, 0); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#ffe9a0' : '#ffc53d'; circle(x - 14 + i * 7, y - 30 - (i % 2) * 3, 4); ctx.fill(); }
    ctx.fillStyle = '#7a4a22'; ctx.save(); ctx.translate(x - 22, y - 26); ctx.rotate(-1.9); rr(0, -4, 44, 12, 5); ctx.fill(); ctx.restore();
    for (let i = 0; i < 3; i++) { const a = G.clock * 3 + i * 2.1; ctx.fillStyle = '#fff6c0'; grappleStar(x + Math.cos(a) * 26, y - 40 + Math.sin(a) * 8, 4, 1.6, a); ctx.fill(); }
  } else { ctx.fillStyle = '#7a4a22'; rr(x - 23, y - 34, 46, 12, 6); ctx.fill(); ctx.fillStyle = GRAPPLE_COL.brass; ctx.fillRect(x - 3, y - 30, 6, 8); }
}
// the dock: a wooden pier with a lookout tower (the first crow's nest), barrels and a crab
function grappleDrawDock(st, sh) {
  const t = st.t, dk = grappleDeckY(sh, t), x = sh.x, L = sh.L, S = GRAPPLE.SEA, nestY = dk - sh.nest;
  // posts into the water
  ctx.fillStyle = GRAPPLE_COL.woodDk;
  for (let px = x + 6; px < x + L; px += 46) ctx.fillRect(px, dk, 10, S - dk + 40);
  // the tower
  ctx.fillStyle = GRAPPLE_COL.woodDk;
  ctx.fillRect(sh.nestX0 - 2, nestY, 7, dk - nestY); ctx.fillRect(sh.nestX1 - 5, nestY, 7, dk - nestY);
  ctx.strokeStyle = GRAPPLE_COL.wood; ctx.lineWidth = 3;
  for (let y = nestY + 20; y < dk - 10; y += 46) { ctx.beginPath(); ctx.moveTo(sh.nestX0, y); ctx.lineTo(sh.nestX1, y + 40); ctx.moveTo(sh.nestX1, y); ctx.lineTo(sh.nestX0, y + 40); ctx.stroke(); }
  ctx.fillStyle = GRAPPLE_COL.wood; rr(sh.nestX0 - 8, nestY - 2, sh.nestX1 - sh.nestX0 + 16, 8, 3); ctx.fill();
  // a striped flag on top
  ctx.fillStyle = GRAPPLE_COL.woodDk; ctx.fillRect(sh.mast - 2, nestY - 70, 4, 70);
  grapplePennant(sh.mast, nestY - 70, 30, '#ef6a55', t, 1, true);
  grappleLadder(sh.ladX, dk - 2, nestY + 4);
  // the planks
  ctx.fillStyle = GRAPPLE_COL.woodLt; ctx.fillRect(x, dk, L, 12);
  ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (let px = x; px < x + L; px += 24) { ctx.moveTo(px, dk); ctx.lineTo(px, dk + 12); } ctx.stroke();
  ctx.fillStyle = GRAPPLE_COL.woodDk; ctx.fillRect(x, dk + 10, L, 3);
  // barrels, a crate and a coil of rope
  for (const [bx, s] of [[x + 30, 1], [x + 56, 0.85]]) {
    ctx.fillStyle = '#9a5f2e'; rr(bx - 11 * s, dk - 28 * s, 22 * s, 28 * s, 6 * s); ctx.fill();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(bx - 11 * s, dk - 22 * s, 22 * s, 3); ctx.fillRect(bx - 11 * s, dk - 9 * s, 22 * s, 3);
  }
  ctx.fillStyle = '#c99358'; rr(x + 250, dk - 24, 28, 24, 3); ctx.fill(); ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 2; rr(x + 250, dk - 24, 28, 24, 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 250, dk - 24); ctx.lineTo(x + 278, dk); ctx.stroke();
  // Cove the crab, scuttling about
  const cx = x + 88 + Math.sin(G.clock * 0.8) * 22;
  ctx.fillStyle = '#ff6b4a'; ctx.beginPath(); ctx.ellipse(cx, dk - 6, 10, 6, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#ff6b4a'; ctx.lineWidth = 2.5;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * 8, dk - 6); ctx.lineTo(cx + d * 14, dk - 13 + Math.sin(G.clock * 8) * 2); ctx.stroke(); circle(cx + d * 15, dk - 14 + Math.sin(G.clock * 8) * 2, 3); ctx.fillStyle = '#ff6b4a'; ctx.fill(); }
  ctx.fillStyle = '#fff'; circle(cx - 3, dk - 13, 2.4); ctx.fill(); circle(cx + 3, dk - 13, 2.4); ctx.fill();
  ctx.fillStyle = C.ink; circle(cx - 3, dk - 13, 1.1); ctx.fill(); circle(cx + 3, dk - 13, 1.1); ctx.fill();
  // the welcome sign
  ctx.fillStyle = GRAPPLE_COL.woodDk; ctx.fillRect(x + 150, dk - 48, 5, 48);
  ctx.fillStyle = '#f4e2b8'; rr(x + 108, dk - 66, 92, 24, 6); ctx.fill();
  ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 2; rr(x + 108, dk - 66, 92, 24, 6); ctx.stroke();
  text('Pirate Cove', x + 154, dk - 53.5, 13, '#4a2a10', 'center');
}
// the line: a twisted rope from the crow's nest to the ring, the zip handle and the bosun's chair
function grappleDrawRope(st, hop) {
  const r = hop.rope;
  if (!r) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); r.pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); };
  ctx.strokeStyle = GRAPPLE_COL.ropeDk; ctx.lineWidth = 5; path(); ctx.stroke();
  ctx.strokeStyle = GRAPPLE_COL.rope; ctx.lineWidth = 3; path(); ctx.stroke();
  ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(122,90,42,0.7)'; ctx.lineWidth = 2; path(); ctx.stroke(); ctx.setLineDash([]);
  // the knot near the ring (the zip stops here)
  const kq = grappleRopeAt(r, r.sEnd + 6);
  ctx.fillStyle = GRAPPLE_COL.ropeDk; circle(kq.x, kq.y, 5); ctx.fill(); ctx.fillStyle = GRAPPLE_COL.rope; circle(kq.x - 1, kq.y - 1, 2.6); ctx.fill();
  // the hook, hooked through the ring
  const rg = r.B;
  grappleHookShape(rg.x + 4, rg.y + 6, 0.6, 1);
  ctx.lineCap = 'butt';
  // the bosun's chair, waiting at the nest until the rider hops in
  if ((hop.phase === 'haul' || hop.phase === 'arrive') && !(hop.boarded && st.pl[hop.T].mode !== 'chair')) {
    const q = grappleRopeAt(r, hop.boarded ? hop.chairS : 0);
    grappleChairShape(q.x, q.y, hop.boarded ? st.pl[hop.T].zip.off : GRAPPLE.rideMid, !hop.boarded);
  }
}
function grappleChairShape(x, y, off, empty) {
  const seatY = y + off + 10;
  ctx.strokeStyle = GRAPPLE_COL.ropeDk; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x - 13, seatY); ctx.moveTo(x, y + 4); ctx.lineTo(x + 13, seatY); ctx.stroke();
  ctx.fillStyle = '#5a5a6a'; circle(x, y, 4.5); ctx.fill(); ctx.fillStyle = '#c9c9d6'; circle(x, y, 2); ctx.fill();
  ctx.fillStyle = GRAPPLE_COL.woodLt; rr(x - 15, seatY - 2, 30, 6, 2); ctx.fill();
  ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 1.5; rr(x - 15, seatY - 2, 30, 6, 2); ctx.stroke();
  if (empty) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.clock * 5); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x - 18, seatY - 5, 36, 12, 4); ctx.stroke(); ctx.globalAlpha = 1; }
}
function grappleHookShape(x, y, ang, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.strokeStyle = '#4a4a5e'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(6, 0); ctx.stroke();
  for (const a of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(6, 0); ctx.quadraticCurveTo(12, a * 8, 7, a * 11 - (a === 0 ? -9 : 0)); ctx.stroke(); }
  ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -0.5); ctx.lineTo(5, -0.5); ctx.stroke();
  for (const a of [-1, 1]) { ctx.beginPath(); ctx.moveTo(6, 0); ctx.quadraticCurveTo(12, a * 8, 7, a * 11); ctx.stroke(); }
  ctx.fillStyle = '#4a4a5e'; circle(-11, 0, 3.5); ctx.fill();
  ctx.restore(); ctx.lineCap = 'butt';
}
// the hook in the thrower's hand, flying with its rope trailing, or reeling back after a miss
function grappleDrawHook(st, hop) {
  const from = st.ships[hop.from], hand = grappleHand(from, st.t);
  const trailRope = (pts) => {
    ctx.strokeStyle = GRAPPLE_COL.ropeDk; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
    ctx.strokeStyle = GRAPPLE_COL.rope; ctx.lineWidth = 2; ctx.stroke(); ctx.lineCap = 'butt';
  };
  if (hop.phase === 'fly' && hop.hook) {
    const hk = hop.hook, pts = [hand];
    const n = 10;
    for (let i = 1; i <= n; i++) { const u = i / n, wob = Math.sin(u * Math.PI) * Math.sin(G.clock * 18 + u * 6) * 6 * (1 - u); pts.push({ x: grappleLerp(hand.x, hk.x, u), y: grappleLerp(hand.y, hk.y, u) + Math.sin(u * Math.PI) * 26 + wob }); }
    trailRope(pts);
    grappleHookShape(hk.x, hk.y, Math.atan2(hk.vy, hk.vx), 1);
  } else if (hop.phase === 'reel' && hop.missAt) {
    const k = grappleSmooth(hop.reelT / GRAPPLE.reelT), m = hop.missAt;
    const sx = m.kind === 'water' ? m.x : m.x, sy = Math.min(m.y, GRAPPLE.SEA);
    const x = grappleLerp(sx, hand.x, k), y = grappleLerp(sy, hand.y, k) - Math.sin(k * Math.PI) * 50;
    const pts = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push({ x: grappleLerp(hand.x, x, u), y: grappleLerp(hand.y, y, u) + Math.sin(u * Math.PI) * 20 }); }
    trailRope(pts);
    grappleHookShape(x, y, -2.4 + k * 2, 1);
    if (m.kind === 'water' && hop.reelT < 0.35) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(m.x, GRAPPLE.SEA, 10 + hop.reelT * 40); ctx.fill(); }
  } else if (hop.phase === 'aim' && grappleOnSpot(from, st.pl[hop.T])) {
    // swinging the hook round over the head (faster while charging)
    const a = G.clock * (hop.charging ? 14 : 4), r = hop.charging ? 16 : 9;
    const hx = hand.x - 6 + Math.cos(a) * r, hy = hand.y - 12 + Math.sin(a) * r * 0.45;
    ctx.strokeStyle = GRAPPLE_COL.ropeDk; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hand.x - 6, hand.y - 2); ctx.lineTo(hx, hy); ctx.stroke();
    grappleHookShape(hx, hy, a + Math.PI / 2, 0.8);
  }
}
// the dotted aim guide (first part of the flight only; longer with gold help, all of it with super gold) and the power meter
function grappleDrawAim(st, hop) {
  const P = GRAPPLE;
  if (!hop || hop.done || hop.phase !== 'aim' || G.introT > 0) return;
  const from = st.ships[hop.from], Tp = st.pl[hop.T];
  if (!grappleOnSpot(from, Tp)) return;
  const hand = grappleHand(from, st.t), pow = hop.charging ? hop.pow : 0.55;
  // the guide follows the level's own hook rules, so it stops at socks, gulls and masts like the hook would
  const T = hop.gold >= 2 ? P.flyMax : hop.gold >= 1 ? P.guideGold : P.guideT;
  const sim = grappleSimThrow(st, hop, from, hop.ang, pow, st.t, T, true);
  const col = hop.gold ? C.gold : '#ffffff';
  sim.pts.forEach((q, n) => {
    if (n % 2 !== 1 || q.y > P.SEA) return;
    const u = (n + 1) / 60, fade = hop.gold >= 2 ? 0.9 : clamp(1.2 - u / T, 0.15, 1);
    ctx.globalAlpha = fade; ctx.fillStyle = 'rgba(28,26,54,0.5)'; circle(q.x, q.y, 4.2); ctx.fill();
    ctx.fillStyle = col; circle(q.x, q.y, 3); ctx.fill();
  });
  ctx.globalAlpha = 1;
  // super gold shows where the whole throw ends: a gold star in the ring, or a little cross where it would miss
  if (hop.gold >= 2 && sim.hit) {
    if (sim.hit === 'ring') { ctx.fillStyle = C.gold; grappleStar(sim.x, sim.y, 11, 5, G.clock * 2); ctx.fill(); }
    else if (sim.y < P.SEA + 4) { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sim.x - 6, sim.y - 6); ctx.lineTo(sim.x + 6, sim.y + 6); ctx.moveTo(sim.x + 6, sim.y - 6); ctx.lineTo(sim.x - 6, sim.y + 6); ctx.stroke(); }
  }
  // the power meter just behind the thrower (out of the guide's way): it rises and falls while the action is held;
  // with super gold the powers that catch the ring at this angle are marked in gold
  const mx = hand.x - 102, my = hand.y - 14, mh = 62, mw = 13;
  ctx.font = '700 10px "Atkinson Hyperlegible", system-ui, sans-serif';
  const lw = ctx.measureText('power').width + 10;
  ctx.fillStyle = 'rgba(28,26,54,0.78)'; rr(mx + mw / 2 - Math.max(mw + 8, lw) / 2, my - 4, Math.max(mw + 8, lw), mh + 24, 7); ctx.fill();
  const g = ctx.createLinearGradient(0, my + mh, 0, my);
  g.addColorStop(0, '#7fd36a'); g.addColorStop(0.6, '#ffd75e'); g.addColorStop(1, '#ff7a6b');
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(mx, my, mw, mh, 5); ctx.fill();
  if (hop.pow > 0.02) { ctx.fillStyle = g; rr(mx, my + mh * (1 - hop.pow), mw, mh * hop.pow, 5); ctx.fill(); }
  if (hop.gold >= 2 && hop.sweet) for (const [p0, p1] of hop.sweet) {
    const y0 = my + mh * (1 - clamp(p1, 0, 1)), y1 = my + mh * (1 - clamp(p0, 0, 1));
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(mx - 3, y0, mw + 6, Math.max(3, y1 - y0), 2); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; rr(mx, my, mw, mh, 5); ctx.stroke();
  text('power', mx + mw / 2, my + mh + 11, 10, '#ffffff', 'center', 'body');
}
function grappleDrawCoins(st, hop) {
  const r = hop.rope || grappleRopeMake(grappleAnchor(st.ships[hop.from], st.t), grappleRing(st, st.ships[hop.to], st.t), GRAPPLE.zipSag);
  const ghost = !hop.rope;
  for (const c of hop.coins) {
    if (c.rider && !hop.chairCoinsOn) continue;
    let x, y, a = 1;
    if (c.got) { if (c.fly <= 0) continue; x = c.x; y = c.y - (1 - c.fly) * 40; a = c.fly; }
    else { const q = grappleRopeU(r, c.u); x = q.x; y = q.y + c.off + Math.sin(G.clock * 3 + c.k) * 1.5; a = ghost ? 0.55 : 1; }
    ctx.globalAlpha = a;
    const sp = Math.cos(G.clock * 3.2 + c.k * 0.9), w = 8 * Math.max(0.25, Math.abs(sp));
    ctx.fillStyle = 'rgba(255,214,90,0.3)'; circle(x, y, 12); ctx.fill();
    ctx.fillStyle = GRAPPLE_COL.brassDk; ctx.beginPath(); ctx.ellipse(x, y, w + 1.5, 9.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sp > 0 ? '#ffd75e' : '#ffc53d'; ctx.beginPath(); ctx.ellipse(x, y, w, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (Math.abs(sp) > 0.4) { ctx.fillStyle = '#fff3b8'; grappleStar(x, y, 4.2 * Math.abs(sp), 1.8 * Math.abs(sp), 0); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
// flag poles on little rowboats (lift your legs) and lanterns held up by friendly gulls (dip under)
function grappleDrawObstacles(st, hop, front) {
  const r = hop.rope || grappleRopeMake(grappleAnchor(st.ships[hop.from], st.t), grappleRing(st, st.ships[hop.to], st.t), GRAPPLE.zipSag), S = GRAPPLE.SEA;
  const gone = hop.done ? clamp(hop.doneT / 0.8, 0, 1) : st.fin ? 1 : 0;
  if (gone >= 1) return;
  ctx.globalAlpha = 1 - gone;
  for (const o of hop.obs) {
    const q = grappleRopeU(r, o.u), wob = Math.sin(G.clock * 14) * 5 * o.hitT;
    if (o.kind === 'flag' && !front) {
      const tip = q.y + 30, bx = q.x, by = S + 2 + Math.sin(G.clock * 2 + o.k) * 2;
      // the rowboat with a waving sailor
      grapplePirate(bx + 10, by - 6, '#f2c08a', '#3fc0b4', (st.crewCheer && hop.phase !== 'aim') || o.hitT > 0, -1, 9 + o.k);
      ctx.fillStyle = '#b4472f'; ctx.beginPath(); ctx.moveTo(bx - 30, by - 8); ctx.lineTo(bx + 30, by - 8); ctx.quadraticCurveTo(bx + 24, by + 8, bx, by + 8); ctx.quadraticCurveTo(bx - 24, by + 8, bx - 30, by - 8); ctx.fill();
      ctx.fillStyle = '#ffe7a8'; ctx.fillRect(bx - 28, by - 8, 56, 3);
      ctx.strokeStyle = GRAPPLE_COL.woodDk; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx - 4, by - 6); ctx.lineTo(bx - 4 + wob * 0.5, tip); ctx.stroke();
      const fx = bx - 4 + wob * 0.5;
      ctx.fillStyle = '#ff7a6b'; ctx.beginPath(); ctx.moveTo(fx, tip + 2); ctx.quadraticCurveTo(fx - 14, tip + 6 + Math.sin(G.clock * 7) * 2, fx - 26, tip + 10); ctx.lineTo(fx, tip + 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; grappleStar(fx - 9, tip + 10, 3.5, 1.5, 0); ctx.fill();
      ctx.fillStyle = GRAPPLE_COL.brass; circle(fx, tip, 3.5); ctx.fill();
    } else if (o.kind === 'lant' && front) {
      const gy = q.y - 46 + Math.sin(G.clock * 3 + o.k) * 3, lx = q.x + wob, top = q.y + 4, bot = q.y + 24;
      grappleGullShape(q.x, gy, 1, G.clock * 9 + o.k, 0.9);
      ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(q.x + 6, gy + 4); ctx.lineTo(lx, top); ctx.stroke();
      ctx.fillStyle = 'rgba(255,214,120,0.35)'; circle(lx, (top + bot) / 2, 16); ctx.fill();
      ctx.fillStyle = '#4a3a5a'; rr(lx - 8, top, 16, 4, 2); ctx.fill(); rr(lx - 8, bot - 3, 16, 4, 2); ctx.fill();
      ctx.fillStyle = '#ffd75e'; rr(lx - 6.5, top + 3, 13, bot - top - 6, 3); ctx.fill();
      ctx.strokeStyle = '#4a3a5a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx, top + 3); ctx.lineTo(lx, bot - 3); ctx.stroke();
      ctx.fillStyle = '#fff6d0'; circle(lx, (top + bot) / 2, 3); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function grappleGullShape(x, y, face, ph, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face * (s || 1), s || 1);
  const f = Math.sin(ph);
  ctx.fillStyle = '#c9ced9';
  ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(-12, -12 - f * 8, -22, -4 - f * 10); ctx.quadraticCurveTo(-12, -2, -2, 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
  circle(9, -4, 5); ctx.fill();
  ctx.fillStyle = '#ffb43d'; ctx.beginPath(); ctx.moveTo(13, -4); ctx.lineTo(19, -2.5); ctx.lineTo(13, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; circle(10.5, -5.5, 1.2); ctx.fill();
  ctx.fillStyle = '#e4e8ef';
  ctx.beginPath(); ctx.moveTo(2, -2); ctx.quadraticCurveTo(10, -12 - f * 8, 18, -5 - f * 10); ctx.quadraticCurveTo(10, -2, 2, 2); ctx.fill();
  ctx.fillStyle = '#9aa2b2'; ctx.beginPath(); ctx.moveTo(-10, -1); ctx.lineTo(-16, 2); ctx.lineTo(-10, 3); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function grappleDrawGulls(st, hop) {
  for (const g of hop.gulls) {
    const q = grappleGull(g, st.t);
    const y = q.y + (g.hitT > 0 ? Math.sin(g.hitT * 20) * 4 : 0);
    grappleGullShape(q.x, y, q.vx >= 0 ? 1 : -1, G.clock * 10 + g.ph, 1.25);
    if (g.hitT > 0) text('!', q.x, y - 22, 16, '#ffffff', 'center');
  }
}
function grappleDrawLaundry(st, hop) {
  const S = GRAPPLE.SEA;
  for (const ln of hop.lines) {
    // two posts on floating barrels
    for (const [px, py] of [[ln.x0, ln.y0], [ln.x1, ln.y1]]) {
      ctx.fillStyle = GRAPPLE_COL.woodDk; ctx.fillRect(px - 3, py - 4, 6, S - py + 4);
      const bob = Math.sin(G.clock * 2 + px) * 2;
      ctx.fillStyle = '#9a5f2e'; rr(px - 13, S - 10 + bob, 26, 20, 7); ctx.fill();
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(px - 13, S - 4 + bob, 26, 3);
    }
    const sg = Math.abs(ln.x1 - ln.x0) * 0.06, at = u => ({ x: grappleLerp(ln.x0, ln.x1, u), y: grappleLerp(ln.y0, ln.y1, u) + sg * 4 * u * (1 - u) });
    ctx.strokeStyle = '#f4f0e6'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const q = at(i / 12); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
    ctx.stroke();
    const n = Math.max(3, Math.round(Math.abs(ln.x1 - ln.x0) / 26));
    for (let i = 1; i < n; i++) {
      const q = at(i / n), h = hash(ln.socks + i, 3), kind = h % 3, col = ['#ff7a6b', '#5bd8c9', '#ffd75e', '#b78cff', '#ffffff', '#8fc0ff'][(h >> 3) % 6];
      const sw = Math.sin(G.clock * 5 + i) * (2 + ln.wob * 10);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(sw * 0.03);
      ctx.fillStyle = col;
      if (kind === 0) { rr(-5, 0, 10, 16, 3); ctx.fill(); rr(-5, 12, 14, 6, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-5, 4, 10, 2.5); }       // a sock
      else if (kind === 1) { ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(12, 6); ctx.lineTo(7, 7); ctx.lineTo(7, 18); ctx.lineTo(-7, 18); ctx.lineTo(-7, 7); ctx.lineTo(-12, 6); ctx.closePath(); ctx.fill(); } // a shirt
      else { ctx.fillRect(-8, 0, 16, 7); ctx.fillRect(-8, 6, 7, 11); ctx.fillRect(1, 6, 7, 11); }  // shorts
      ctx.fillStyle = '#c9a457'; ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
  }
}
// Pip and Bo in their usual look, posed for ladders, the crow's nest, the zip line and the chair
function grappleHero(k, x, y, o) {
  const col = PCOL[k], dk = PDARK[k], s = o.s || 1;
  ctx.save(); ctx.translate(x, y - 13 * s); ctx.scale(s * (o.face || 1), s);
  if (o.sq) ctx.scale(1 + o.sq * 0.25, 1 - o.sq * 0.25);
  const pose = o.pose;
  ctx.lineCap = 'round';
  ctx.strokeStyle = dk; ctx.lineWidth = 3.5;
  const arm = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
  if (pose === 'hang' || pose === 'sit') {
    const rx = (o.reach ? o.reach.x : 0) * (o.face || 1), ry = o.reach ? o.reach.y : -26;
    arm(-7, -8, rx - 3, ry); arm(7, -8, rx + 3, ry);
    ctx.fillStyle = col; circle(rx - 3, ry, 3.6); ctx.fill(); circle(rx + 3, ry, 3.6); ctx.fill();
  } else if (pose === 'climb') {
    const c = Math.sin(o.ph || 0) * 5;
    arm(-7, -8, -9, -22 + c); arm(7, -8, 9, -22 - c);
  } else if (pose === 'aim' || pose === 'charge') {
    arm(-8, -6, -12, 4); arm(7, -8, 6, -24);
  } else if (pose === 'throw') {
    arm(-8, -6, -12, 4); arm(7, -8, 22, -14);
  } else if (pose === 'crank') {
    const c = Math.sin(o.ph || 0) * 3;
    arm(-7, -4, 14, -2 + c); arm(7, -4, 18, 0 - c);
  } else if (pose === 'cheer' || pose === 'fly') {
    const wv = Math.sin(G.clock * 14) * 3;
    arm(-8, -6, -14, -20 + wv); arm(8, -6, 14, -20 - wv);
  } else {
    const sw = Math.sin(o.ph || 0) * 4;
    arm(-9, -4, -12 + sw * 0.5, 6); arm(9, -4, 12 - sw * 0.5, 6);
  }
  // feet
  ctx.fillStyle = dk;
  if (pose === 'sit') {
    ctx.beginPath(); ctx.ellipse(10, 11, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, 9 + Math.sin(G.clock * 6) * 2, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  } else if (pose === 'hang' && o.tuck) {
    circle(-4, 9, 3.5); ctx.fill(); circle(5, 9, 3.5); ctx.fill();
  } else {
    const kick = pose === 'walk' ? Math.sin(o.ph || 0) * 4 : pose === 'hang' ? Math.sin(G.clock * 7) * 2 : pose === 'climb' ? Math.sin(o.ph || 0) * 3 : 0;
    const lo = pose === 'hang' && o.low ? 5 : 0;
    ctx.beginPath(); ctx.ellipse(-5 + kick, 13 + lo, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5 - kick, 13 + lo, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // ears (Bo) / sprout (Pip)
  if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; for (const ex of [-7, 7]) { circle(ex, -12, 4.6); ctx.fill(); ctx.stroke(); } }
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2.4;
  rr(-11, -13, 22, 26, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-8, -10, 8, 9, 4); ctx.fill();
  if (k === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(1, -18); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, -19, 5, 2.5, -0.5, 0, Math.PI * 2); ctx.fill(); }
  // a little pirate bandana knot on the side (Pirate Cove dress-up)
  ctx.fillStyle = k === 0 ? '#ffd75e' : '#ff7a6b';
  ctx.beginPath(); ctx.moveTo(-11, -9); ctx.lineTo(-11, -4); ctx.lineTo(-16, -2); ctx.lineTo(-15, -8); ctx.closePath(); ctx.fill();
  ctx.fillRect(-11, -10, 22, 3);
  if (o.wet) { ctx.fillStyle = 'rgba(190,240,255,0.85)'; circle(-6, -14, 2); ctx.fill(); circle(8, -12, 1.6); ctx.fill(); }
  // face
  const ey = -2, mood = o.mood || 'happy';
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
function grappleDrawPlayer(st, pl) {
  const hop = st.hop, s = 1.05;
  if (pl.mode === 'swim') return; // (riding Dolly: grappleDrawDolphin)
  if (pl.mode === 'zip' && hop && hop.rope) {
    const z = pl.zip, q = grappleRopeAt(hop.rope, z.s);
    const fast = z.v > 230;
    grappleHero(pl.id, q.x, q.y + z.off + 13 * s, { s, pose: 'hang', reach: { x: 0, y: -(z.off) / s + 0 }, face: 1, tuck: z.off < GRAPPLE.offMid - 6, low: z.off > GRAPPLE.offMid + 6,
      mood: pl.sq > 0.3 ? 'wow' : fast ? 'joy' : 'happy', sq: pl.sq * 0.5 });
    // the handle: a little pulley on the rope and a wooden bar
    ctx.fillStyle = '#5a5a6a'; circle(q.x, q.y, 5); ctx.fill(); ctx.fillStyle = '#c9c9d6'; circle(q.x, q.y, 2.2); ctx.fill();
    ctx.strokeStyle = '#5a5a6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, q.y + 3); ctx.lineTo(q.x, q.y + 10); ctx.stroke();
    ctx.fillStyle = GRAPPLE_COL.woodLt; rr(q.x - 11, q.y + 9, 22, 5, 2.5); ctx.fill();
    if (fast) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(q.x - 22 - i * 8, q.y + z.off - 6 + i * 7); ctx.lineTo(q.x - 36 - i * 8, q.y + z.off - 6 + i * 7); } ctx.stroke(); }
    return;
  }
  if (pl.mode === 'chair' && hop && hop.rope) {
    const q = grappleRopeAt(hop.rope, hop.chairS), off = pl.zip.off;
    grappleChairShape(q.x, q.y, off, false);
    grappleHero(pl.id, q.x - 3, q.y + off + 11 * s, { s, pose: 'sit', reach: { x: 3, y: -off / s + 6 }, face: 1, mood: pl.sq > 0.3 ? 'wow' : 'happy', sq: pl.sq * 0.4 });
    return;
  }
  if (pl.mode === 'fall') { grappleHero(pl.id, pl.wx, pl.wy, { s, pose: 'fly', face: 1, mood: 'wow' }); return; }
  let pose = 'stand', ph = 0, face = pl.face || 1, mood = 'happy';
  if (pl.mode === 'climb') { pose = 'climb'; ph = pl.climbPh; }
  else {
    const sh = st.ships[pl.ship];
    if (hop && !hop.done && hop.T === pl.id && hop.phase === 'aim' && grappleOnSpot(st.ships[hop.from], pl)) { pose = hop.charging ? 'charge' : 'aim'; face = 1; mood = hop.charging ? 'grit' : 'happy'; }
    else if (pl.throwA > 0) { pose = 'throw'; face = 1; }
    else if (hop && !hop.done && hop.Z === pl.id && hop.phase === 'haul' && pl.ship === hop.to && Math.abs(pl.x - sh.capX) < 30) { pose = 'crank'; ph = hop.capRot * 2; face = pl.x < sh.capX ? 1 : -1; mood = pl.crankA > 0 ? 'grit' : 'happy'; }
    else if (pl.cheerT > 0 || st.fin) { pose = 'cheer'; mood = 'joy'; }
    else if (pl.walkPh) { pose = 'walk'; ph = pl.walkPh; }
    // (the crank pose stands beside the capstan)
  }
  grappleHero(pl.id, pl.wx, pl.wy, { s, pose, ph, face, mood, sq: pl.sq * 0.5, wet: pl.wetT > 0 });
}
// Dolly the dolphin brings a splashed zipper back
function grappleDrawDolphin(st) {
  const dl = st.dolphin;
  if (!dl) return;
  const pl = st.pl[dl.id], x = pl.wx, y = pl.wy, u = clamp(dl.t / 0.5, 0, 1), dir = dl.x1 < dl.x0 ? -1 : 1;
  ctx.save(); ctx.translate(x, y + 14 - (1 - u) * -20); ctx.scale(dir, 1);
  ctx.fillStyle = '#6fa8d8'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8eefa'; ctx.beginPath(); ctx.ellipse(4, 5, 24, 6, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#6fa8d8'; ctx.beginPath(); ctx.moveTo(30, -3); ctx.quadraticCurveTo(46, -2, 44, 4); ctx.quadraticCurveTo(36, 6, 30, 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(4, -24); ctx.lineTo(8, -10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-46, -10 + Math.sin(G.clock * 10) * 4); ctx.lineTo(-44, 8 + Math.sin(G.clock * 10) * 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; circle(26, -4, 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(36, 1, 5, 0.1, 1.4); ctx.stroke();
  ctx.restore();
  grappleHero(pl.id, x - dir * 4, y + 2, { s: 1.05, pose: 'cheer', face: dir, mood: 'joy', wet: true });
  if (dl.t < 0.6) text('Dolly to the rescue!', x, y - 50, 15, '#ffffff', 'center');
  // splashes behind
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 3; i++) { circle(x - dir * (38 + i * 12), GRAPPLE.SEA + 2 - i, 5 - i); ctx.fill(); }
}
// Captain Polly the parrot, in her little captain's hat
function grappleDrawPolly(st) {
  const po = st.polly;
  if (po.x < st.cam.x - 100 || po.x > st.cam.x + W + 100) return;
  const perched = st.fin && Math.abs(po.x - po.tx) < 6 && Math.abs(po.y - po.ty) < 6;
  const x = po.x, y = po.y + (perched ? 0 : Math.sin(G.clock * 4) * 4), f = perched ? 0 : Math.sin(G.clock * 16);
  ctx.save(); ctx.translate(x, y); ctx.scale(po.face, 1);
  // tail
  ctx.fillStyle = '#3f7fd8'; ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-22, 22); ctx.lineTo(-14, 24); ctx.lineTo(-2, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-16, 26); ctx.lineTo(-10, 26); ctx.closePath(); ctx.fill();
  // body
  ctx.fillStyle = '#e8453c'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 15, 0.25, 0, Math.PI * 2); ctx.fill();
  // wing
  ctx.fillStyle = '#4fbf4a';
  ctx.beginPath(); ctx.moveTo(-2, -4); ctx.quadraticCurveTo(-18, -10 - f * 14, -26, -2 - f * 18); ctx.quadraticCurveTo(-12, 8, 2, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3f7fd8'; ctx.beginPath(); ctx.moveTo(-14, -2 - f * 6); ctx.quadraticCurveTo(-22, -4 - f * 14, -26, -2 - f * 18); ctx.lineTo(-16, 4); ctx.closePath(); ctx.fill();
  // head, eye, beak
  ctx.fillStyle = '#e8453c'; circle(5, -14, 8); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(8, -15, 3.4); ctx.fill(); ctx.fillStyle = C.ink; circle(9, -15, 1.7); ctx.fill();
  ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.moveTo(11, -12); ctx.quadraticCurveTo(19, -12, 16, -5); ctx.quadraticCurveTo(13, -7, 10, -8); ctx.closePath(); ctx.fill();
  // the captain's hat (a cosy tricorn with a gold star)
  ctx.fillStyle = '#2a2448'; ctx.beginPath(); ctx.moveTo(-6, -19); ctx.quadraticCurveTo(5, -32, 16, -19); ctx.quadraticCurveTo(5, -23, -6, -19); ctx.fill();
  ctx.fillStyle = C.gold; grappleStar(5, -24, 3.4, 1.5, 0); ctx.fill();
  // feet
  ctx.strokeStyle = '#9a7a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(-3, 19); ctx.moveTo(3, 14); ctx.lineTo(3, 19); ctx.stroke();
  ctx.restore();
  if (po.say) {
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(po.say).width + 20, h = 24;
    let bx = clamp(x - w / 2, st.cam.x + 8, st.cam.x + W - w - 8), by = y - 56;
    ctx.fillStyle = '#ffffff';
    if (by < 196) {
      // too high (it would sit on the HUD pills): beside her, on whichever side has room
      const right = x + 28 + w < st.cam.x + W - 8;
      bx = right ? x + 28 : x - 28 - w; by = clamp(y - 22, 196, H - 120);
      const tx = right ? bx + 1 : bx + w - 1, ty = clamp(y - 6, by + 6, by + h - 6);
      ctx.beginPath(); ctx.moveTo(tx, ty - 6); ctx.lineTo(tx, ty + 4); ctx.lineTo(right ? x + 16 : x - 16, y - 8); ctx.closePath(); ctx.fill();
      rr(bx, by, w, h, 12); ctx.fill();
    } else {
      rr(bx, by, w, h, 12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(clamp(x, bx + 12, bx + w - 12) - 6, by + h - 1); ctx.lineTo(clamp(x, bx + 12, bx + w - 12) + 4, by + h - 1); ctx.lineTo(x, by + h + 8); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#4fbf4a'; ctx.lineWidth = 2; rr(bx, by, w, h, 12); ctx.stroke();
    text(po.say, bx + w / 2, by + h / 2 + 0.5, 13, C.ink, 'center', 'body');
  }
}

/* ---------- the HUD: time and coins, the hop chip, wind, job cards, prompts, signs ---------- */
function grappleHud(st) {
  const P = GRAPPLE, big = hudBig(), hop = st.hop, t = G.clock, play = G.mode === 'play' || G.mode === 'paused';
  const font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.stats.coins + '/' + st.stats.coinsAll;
    ctx.font = font(fs);
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.2, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    const cx = x0 + 15 + tw + gap + icon / 2;
    ctx.fillStyle = GRAPPLE_COL.brassDk; circle(cx, cy, fs * 0.5); ctx.fill(); ctx.fillStyle = '#ffd75e'; circle(cx, cy, fs * 0.4); ctx.fill();
    ctx.fillStyle = '#fff3b8'; grappleStar(cx, cy, fs * 0.24, fs * 0.1, 0); ctx.fill();
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe7a8', 'left', 'body');
    timeX0 = x0;
    // the hop chip under it: which ship you're heading for and the tries; the wind
    if (hop && !st.fin) {
      const to = st.ships[hop.to], hn = st.k * 2 + hop.i + 1;
      const s1 = 'Ship ' + hn + ' of 8 · ' + to.name + (hop.tries ? ' · tries ' + hop.tries : '');
      const fs2 = big ? 16 : 12, h2 = big ? 32 : 24;
      ctx.font = font(fs2);
      const w2 = ctx.measureText(s1).width + 26, y2 = 12 + h + 6;
      const px = pill(W - 14, y2, w2, h2, 'right');
      if (hop.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, y2, w2, h2, h2 / 2); ctx.stroke(); }
      text(s1, px + 13, y2 + h2 / 2 + 0.5, fs2, hop.gold ? C.gold : C.paper, 'left', 'body');
      const wv = grappleWind(hop, st.t);
      if (hop.wind || hop.gust) {
        const y3 = y2 + h2 + 6, n3 = clamp(Math.round(Math.abs(wv) / 60), 1, 3), arrows = (wv >= 0 ? '▶' : '◀').repeat(n3);
        const s3 = 'Wind ' + arrows + (hop.gust ? ' gusty' : '');
        ctx.font = font(fs2);
        const w3 = ctx.measureText(s3).width + 26, px3 = pill(W - 14, y3, w3, h2, 'right');
        text(s3, px3 + 13, y3 + h2 / 2 + 0.5, fs2, '#d8f0ff', 'left', 'body');
      }
    }
  }
  if (!play || !hop) return;
  const z = big ? 1.4 : 1;
  // job cards in the bottom corners: Pip's on the left, Bo's on the right
  for (const id of [0, 1]) {
    const pw = Math.round(250 * z), ph = Math.round(52 * z), py = H - ph - 8, px = id === 0 ? 10 : W - 10 - pw, quiet = grappleQuiet(id);
    const card = grappleCard(st, id);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = card.gold ? C.gold : PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    { const ttl = NAMES[id] + ' ' + card.title, room = pw - 24 * z - (card.meter != null ? 64 * z : 0);
      let tf = 15 * z; ctx.font = font(tf); while (ctx.measureText(ttl).width > room && tf > 10) { tf -= 0.5; ctx.font = font(tf); }
      text(ttl, px + 12 * z, py + 14 * z, tf, PCOL[id], 'left'); }
    if (quiet) text('Computer' + (card.line ? ' · ' + card.line : ''), px + 12 * z, py + 35 * z, 11 * z, '#d9d3ef', 'left', 'body');
    else if (card.keys) {
      ctx.font = font(11 * z);
      let fs = 11 * z; while (ctx.measureText(card.keys).width > pw - 20 * z && fs > 8) { fs -= 0.5; ctx.font = font(fs); }
      text(card.keys, px + 12 * z, py + 35 * z, fs, '#d9d3ef', 'left', 'body');
    } else if (card.line) text(card.line, px + 12 * z, py + 35 * z, 11 * z, '#d9d3ef', 'left', 'body');
    if (card.meter != null) {
      const bw = 56 * z, bh = 10 * z, bx = px + pw - bw - 12 * z, by = py + 9 * z;
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
      if (card.band) { ctx.fillStyle = 'rgba(255,197,61,0.35)'; rr(bx + bw * card.band[0], by, bw * (card.band[1] - card.band[0]), bh, bh / 2); ctx.fill(); }
      if (card.meter > 0.04) { ctx.fillStyle = card.meterCol || '#ffffff'; rr(bx, by, Math.max(bh, bw * clamp(card.meter, 0, 1)), bh, bh / 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  // the gold help message: between the level pill and the time when it fits, else low over the water (above the
  // fleet's sign when that is up), where the prompts over the crow's nests can't cover it
  const lowY = hh => H - Math.round(52 * z) - 16 - hh;
  if (st.msg) {
    let fs = big ? 19 : 14;
    const h = big ? 32 : 26;
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else { cx = W / 2; y = lowY(h) - (st.sign && G.introT <= 0 ? (big ? 33 : 28) + 8 : 0); while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; } }
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  // the fleet's sign: a wooden board low over the water
  if (st.sign && G.introT <= 0) {
    const s = grappleSignText(st, st.sign.text);
    let fs = big ? 19 : 14;
    ctx.font = font(fs);
    let w = ctx.measureText(s).width + 34;
    while (w > W - 30 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(s).width + 34; }
    // (low over the water, just above the job cards: the prompts over the crow's nests stay clear of it)
    const h = fs + 14, a = clamp(Math.min(st.sign.t / 0.25, (st.sign.life - st.sign.t) / 0.4), 0, 1), y = lowY(h);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#c99358'; rr(W / 2 - w / 2, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = '#6e4422'; ctx.lineWidth = 2.5; rr(W / 2 - w / 2, y, w, h, 8); ctx.stroke();
    text(s, W / 2, y + h / 2 + 0.5, fs, '#2e1c0c', 'center', 'body');
    ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || st.fin || hop.done) return;
  // prompts over each person's head (a hint bubble replaces it for a moment); never for the computer
  const fs = 13 * z, panelTop = H - Math.round(52 * z) - 14;
  const boxes = [];
  const box = (id, str, col, pulse, bubble) => {
    if (grappleQuiet(id) || !str) return;
    const pl = st.pl[id];
    ctx.font = font(fs);
    const w = ctx.measureText(str).width + 22 * z, h = fs + 12 * z;
    let x = pl.wx - st.cam.x - w / 2, y = pl.wy - 46 * z - h - (pl.mode === 'zip' || pl.mode === 'chair' ? 30 : 0);
    if (pl.mode === 'zip' || pl.mode === 'chair') y = Math.min(y, pl.wy - 100);
    x = clamp(x, 6, W - w - 6); y = clamp(y, big ? 100 : 84, panelTop - h);
    boxes.push({ id, str, col, pulse, bubble, x, y, w, h });
  };
  for (const id of [0, 1]) {
    if (st.hints[id]) { box(id, st.hints[id].text, C.ink, false, true); continue; }
    const pr = grapplePrompt(st, id);
    if (pr) box(id, pr.text, pr.col || '#ffe7a8', pr.pulse);
  }
  // two prompts in the same spot: the higher one moves up out of the way
  if (boxes.length === 2) {
    const [a, b] = boxes, gap = 6;
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap) {
      const hi = a.y <= b.y ? a : b, lo = hi === a ? b : a;
      hi.y = lo.y - hi.h - gap;
      if (hi.y < (big ? 100 : 84)) { hi.y = big ? 100 : 84; lo.y = hi.y + hi.h + gap; }
    }
  }
  for (const bx of boxes) {
    const { id, str, col, pulse, bubble, x, y, w, h } = bx;
    const sc = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.font = font(fs);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc);
    ctx.fillStyle = bubble ? '#ffffff' : 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = bubble ? PCOL[id] : col; ctx.lineWidth = 2.5; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, bubble ? C.ink : col, 'center', 'body');
    ctx.restore();
  }
}
function grappleSignText(st, s) {
  const hop = st.hop, T = hop ? hop.T : 0, Z = hop ? hop.Z : 1;
  const two = String(s).split('||');
  if (two.length > 1) s = grappleQuiet(T) || grappleQuiet(Z) ? two[1] : two[0];
  return s.replace(/\{T\}/g, NAMES[T]).replace(/\{Z\}/g, NAMES[Z]).replace(/\{Tud\}/g, grappleKey(T, 'ud')).replace(/\{Tact\}/g, grappleKey(T, 'act'))
    .replace(/\{Zact\}/g, grappleKey(Z, 'act')).replace(/\{Zud\}/g, grappleKey(Z, 'ud')).replace(/\{Zlr\}/g, grappleKey(Z, 'lr'));
}
// the job card for one player: title, keys (their own device), and a little meter
function grappleCard(st, id) {
  const P = GRAPPLE, hop = st.hop, k = w => grappleKey(id, w), pl = st.pl[id];
  if (!hop || hop.done) return { title: 'made it!', line: 'All aboard!' };
  if (id === hop.T) {
    if (pl.mode === 'chair') return { title: 'rides the chair', keys: k('right') + ' pull along · ' + k('ud') + ' reach for coins', gold: hop.capGold, meter: hop.rope ? hop.chairS / hop.rope.sEnd : 0, meterCol: '#bfefff' };
    if (hop.phase === 'haul') return { title: 'rides next', keys: k('act') + ' hop in the chair at the X' };
    if (hop.phase === 'caught' || hop.phase === 'zip' || hop.phase === 'drop') return { title: 'waits to ride', line: NAMES[hop.Z] + ' zips first' };
    const pw = hop.charging ? hop.pow : 0;
    return { title: 'throws the hook', keys: k('ud') + ' aim · hold ' + k('act') + ', let go to throw', gold: hop.gold > 0, meter: pw, meterCol: pw > 0.75 ? '#ff9a8a' : pw > 0.4 ? '#ffd75e' : '#9be36f' };
  }
  if (pl.mode === 'zip' && pl.zip) {
    const z = pl.zip;
    return { title: 'zips!', keys: k('right') + ' faster ' + k('left') + ' brake · ' + k('up') + ' legs up ' + k('down') + ' dip · ' + k('act') + ' let go', gold: hop.handleGold, meter: z.v / 420, meterCol: z.v > P.bonkV ? '#ff9a8a' : '#ffffff' };
  }
  if (hop.phase === 'haul' || hop.phase === 'arrive') {
    const since = st.t - hop.lastHeave;
    return { title: 'cranks the capstan', keys: k('act') + ' heave on the beat: heave... ho!', gold: hop.capGold, meter: clamp(since / P.heaveLate, 0, 1), band: [P.heaveGood / P.heaveLate, 1], meterCol: since >= P.heaveGood && since <= P.heaveLate ? C.gold : '#ffffff' };
  }
  return { title: 'zips next', keys: k('up') + ' climb · ' + k('act') + ' grab the handle at the X' };
}
// the prompt over a person's head, worked out from what their job needs right now
function grapplePrompt(st, id) {
  const P = GRAPPLE, hop = st.hop, nd = grappleNeeds(st, id), pl = st.pl[id], k = w => grappleKey(id, w);
  const from = st.ships[hop.from];
  switch (nd.job) {
    case 'climb': {
      if (pl.mode === 'climb') return { text: 'Climb! ' + k('up') };
      const d = nd.x - pl.x;
      return Math.abs(d) < P.ladTol ? { text: 'Climb the ladder ' + k('up'), pulse: true } : { text: (d < 0 ? k('left') + ' ' : '') + 'To the rope ladder' + (d > 0 ? ' ' + k('right') : '') };
    }
    case 'spot': { const d = nd.x - pl.x; return { text: (d < 0 ? k('left') + ' ' : '') + 'Stand on the gold X' + (d > 0 ? ' ' + k('right') : '') }; }
    case 'aim':
      if (hop.charging) return { text: 'Let go to throw!', col: C.gold, pulse: hop.pow > 0.3 };
      return { text: k('ud') + ' aim, hold ' + k('act') + ' to throw', col: C.gold };
    case 'waitHook': return null; // (the job card says what's next; a chip here would only crowd the crow's nest)
    case 'grab': {
      return { text: 'Grab the handle! ' + k('act'), col: C.gold, pulse: true };
    }
    case 'zip': {
      if (pl.mode !== 'zip' || !pl.zip || !hop.rope) return null;
      const z = pl.zip, r = hop.rope, q = grappleRopeAt(r, z.s);
      if (z.at === 'stop') return { text: 'Let go! ' + k('act'), col: C.gold, pulse: true };
      // what's coming up along the line
      const look = q.x + Math.max(60, z.v * 0.55);
      for (const o of hop.obs) { const ox = grappleRopeU(r, o.u).x; if (ox > q.x + 6 && ox < look) return o.kind === 'flag' ? { text: 'Flag! Legs up ' + k('up'), col: '#ffe7a8', pulse: true } : { text: 'Lantern! Dip ' + k('down'), col: '#ffe7a8', pulse: true }; }
      for (const c of hop.coins) { if (c.got || c.rider || c.band === 'm') continue; const cx = grappleRopeU(r, c.u).x; if (cx > q.x + 6 && cx < look) return c.band === 'h' ? { text: 'High coin! ' + k('up'), col: '#ffe08a' } : { text: 'Low coin! ' + k('down'), col: '#ffe08a' }; }
      const left = r.sEnd - z.s;
      if (left < 170 && z.v > P.bonkV * 0.8) return { text: 'Brake! ' + k('left'), col: '#ff9a9a', pulse: true };
      if (z.v < 40 && left > 60) return { text: 'Pull along ' + k('right'), col: '#ffe7a8' };
      return null;
    }
    case 'board': {
      return { text: 'Hop in the chair! ' + k('act'), col: C.gold, pulse: true };
    }
    case 'ride': {
      if (!hop.rope || !pl.zip) return null;
      const q = grappleRopeAt(hop.rope, hop.chairS);
      for (const o of hop.obs) { const ox = grappleRopeU(hop.rope, o.u).x; if (ox > q.x + 4 && ox < q.x + 90) return o.kind === 'flag' ? { text: 'Legs up! ' + k('up'), pulse: true } : { text: 'Dip! ' + k('down'), pulse: true }; }
      for (const c of hop.coins) { if (c.got) continue; const cq = grappleRopeU(hop.rope, c.u); if (cq.x > q.x + 4 && cq.x < q.x + 80 && Math.abs(cq.y + c.off - (q.y + pl.zip.off)) > 10) return { text: (cq.y + c.off < q.y + pl.zip.off ? k('up') : k('down')) + ' for the coin!', col: '#ffe08a' }; }
      if (st.t - hop.lastHeave < 0.8 && hop.pullsLeft > 0) return { text: 'Pull along! ' + k('right'), col: '#bfefff' };
      return null;
    }
    case 'capstan': {
      const d = nd.x - pl.x;
      if (pl.onNest || pl.mode === 'climb') return { text: 'Climb down ' + k('down') };
      return { text: (d < 0 ? k('left') + ' ' : '') + 'To the capstan' + (d > 0 ? ' ' + k('right') : ''), col: '#ffe7a8' };
    }
    case 'crank': {
      if (!hop.boarded) return { text: 'Wait for ' + NAMES[hop.T] + ' to hop in', col: '#d8f0ff' };
      const since = st.t - hop.lastHeave, ok = since >= P.heaveGood;
      return { text: ok ? 'Heave! ' + k('act') : '...ho!', col: ok ? C.gold : '#ffffff', pulse: ok };
    }
    case 'swim': return null;
    default: return null;
  }
  void from;
}

/* ---------- sounds ---------- */
Sfx.extra.grappleCharge = function (p) { this.tone(300 * p, 0.25, 'sine', 0.025, 520 * p); };
Sfx.extra.grappleThrow = function (p) { this.tone(700 * p, 0.18, 'triangle', 0.04, 260 * p); this.tone(1500, 0.08, 'sine', 0.015, 600, 0.03); };
Sfx.extra.grappleClink = function (p) { [1320, 1760, 2093].forEach((f, i) => this.tone(f * p, 0.09, 'triangle', 0.04, null, i * 0.05)); this.tone(523, 0.18, 'sine', 0.04, null, 0.15); };
Sfx.extra.grappleClunk = function () { this.tone(180, 0.12, 'square', 0.035, 110); this.tone(90, 0.18, 'triangle', 0.05, 60, 0.03); };
Sfx.extra.grappleSplash = function () { this.tone(900, 0.16, 'sine', 0.03, 260); this.tone(400, 0.2, 'triangle', 0.02, 180, 0.05); };
Sfx.extra.grappleBigSplash = function () { this.tone(700, 0.28, 'sine', 0.05, 160); this.tone(300, 0.3, 'triangle', 0.04, 120, 0.06); this.tone(1200, 0.12, 'sine', 0.02, 500, 0.1); };
Sfx.extra.grappleFlump = function () { this.tone(220, 0.16, 'sine', 0.05, 140); this.tone(500, 0.08, 'triangle', 0.02, 300, 0.04); };
Sfx.extra.grappleSquawk = function () { this.tone(1100, 0.08, 'sawtooth', 0.025, 1500); this.tone(1300, 0.1, 'sawtooth', 0.02, 900, 0.09); };
Sfx.extra.grappleGrab = function (p) { this.tone(420 * p, 0.08, 'triangle', 0.04, 640 * p); };
Sfx.extra.grappleLetGo = function (p) { this.tone(640 * p, 0.08, 'sine', 0.03, 420 * p); };
Sfx.extra.grappleLand = function (p) { this.tone(160 * p, 0.1, 'triangle', 0.06, 90 * p); };
Sfx.extra.grappleKnot = function (p) { this.tone(260 * p, 0.08, 'triangle', 0.04, 200 * p); };
Sfx.extra.grappleBonk = function () { this.tone(300, 0.1, 'square', 0.03, 150); this.tone(150, 0.12, 'triangle', 0.05, 100, 0.02); };
Sfx.extra.grappleCoin = function (p) { this.tone(1568 * p, 0.06, 'triangle', 0.035); this.tone(2093 * p, 0.09, 'triangle', 0.03, null, 0.05); };
Sfx.extra.grappleBoard = function (p) { this.tone(330 * p, 0.1, 'triangle', 0.04, 494 * p); };
Sfx.extra.grappleHeave = function (p) { this.tone(196 * p, 0.14, 'triangle', 0.05, 262 * p); this.tone(120, 0.08, 'square', 0.015, null, 0.02); };
Sfx.extra.grappleCrank = function (p) { this.tone(160 * p, 0.08, 'triangle', 0.035, 190 * p); };
Sfx.extra.grappleSlip = function (p) { this.tone(500 * p, 0.05, 'sine', 0.02, 380 * p); };
Sfx.extra.grapplePull = function (p) { this.tone(440 * p, 0.06, 'sine', 0.025, 560 * p); };
Sfx.extra.grappleHop = function (p) { this.tone(400 * p, 0.1, 'sine', 0.04, 700 * p); };
Sfx.extra.grappleArrive = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, i * 0.07)); };
Sfx.extra.grappleFleet = function () { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, i * 0.09)); };
Sfx.extra.grappleHelp = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.09, 'sine', 0.035, null, i * 0.06)); };
Sfx.extra.grappleStep = function (p) { this.tone(240 * p, 0.04, 'triangle', 0.025); };
Sfx.extra.grappleChest = function () { this.tone(200, 0.2, 'triangle', 0.05, 400); [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.035, null, 0.15 + i * 0.06)); };
Sfx.extra.grappleParty = function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.045, null, i * 0.11)); };
// a dot added to the current path, so many dots fill in one call
function grappleDot(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
