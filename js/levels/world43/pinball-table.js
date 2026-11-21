/* Pip & Bo - Level 43-2 Pinball Panic: the table (numbers only, no three.js). Read by the rules, the brain and the scenery.

   Comet Carnival, a made-up space-fair pinball table, seen at hero size. The table is laid out flat in (x, d):
     x  across the table, -9 (left rail) to +9 (right rail); x < 0 is the LEFT lane, x > 0 the RIGHT lane
     d  distance up the table from the bottom (the great flippers) to the comet's mouth at the backboard
   World space (the scenery and the camera): X = x, Z = -d (up the table is away from the viewer, so K3D.heading is 0),
   Y = PINBALL_TABLE.yAt(d) + the ball's hop. The slope (and the raised upper playfield of part 3) is display only: the
   rules pull a ball gently back down the table and nothing else knows about height (lesson of 42-4: keep rules flat).

   Everything a ball can meet is listed here:
     walls      capsules { a: [x, d], b: [x, d], r, kind } kinds: rail (always solid), kerb (solid unless hopping),
                gate (solid while its gate is shut), step (one step of a staircase), oneway (solid only for a ball coming
                down, and only once both balls are past it in different lanes), ledge (always solid: a launch flies over)
     posts      round solids { x, d, r, kind: 'post' | 'bumper' } (bumpers kick, after a 0.4 s glow)
     slings     slingshot faces { a, b, n: [nx, nd] } that kick along n after a glow (their body is a rail)
     holes      { x, d, r } round outlanes, or { x0, x1, d0, d1 } strips; kind 'drain' (main table: drains) or
                'gap' (the chrome rails: a fall to the catch pocket, never a drain); bridge: id of a spinner bridge
     controls   the switches: star, cup, targets, button, spinner, lever, cradle, scoop, save
     gates      { id, lane, d, x0, x1, kind: 'lift' | 'drop', by: control id, hold: true for cups }
     stairs     { id, lane, steps: [d...], x0, x1, by: target bank id }
     flippers   flipper for a friend: { id, cradle: control id, button: control id, to: [x, d], apex, dur }
     twins      the twin flippers at the end of each part: { id, cradles: [id, id], to: [[x, d], [x, d]] }
     kickers    { id, x, d, r, ride: id, needs?: gate id, cross?: true } a zone that fires its ride (after a glow)
     rides      { id, pts: [[x, d, h], ...], dur } a scripted path (wire ramps, the crossing bridges, loops)
     magnets    { id, d, x0, x1, v, ph } a saucer cart on a track across a lane
     loose      { id, sec, x, d0, d1, per, ph } a kickout that serves a silver ball down a track every `per` s
     tilts      { at, dir } TILT when the leading ball first passes d = at
     winds      { d0, d1, per, on, push } the rocket's wash across part 3
     stars      [x, d, h] the stars (shared); h > 0 needs a hop
     sections   { d0, d1, part, spawn: [[x, d] left, [x, d] right], save: [[x, d], [x, d]] } checkpoints (catch pockets)
     parts      { name, d0, d1 } the four parts (and the final ramp in part 4)
   The scenery hangs everything on these numbers, so moving a control moves its art. */
'use strict';

const PINBALL_TABLE = (function () {
  const T = { R: 0.9, RAIL: 9, RAIL3: 7.5, SLOPE: 0.11, LIFT3: 7.5, LOOSE_R: 0.62 };
  const walls = [], posts = [], slings = [], holes = [], controls = [], gates = [], stairs = [], flippers = [], twins = [],
    kickers = [], rides = [], magnets = [], loose = [], tilts = [], winds = [], stars = [], sections = [], parts = [], bridges = [],
    decor = []; // places the scenery needs to know about (stalls, signs) but the rules ignore
  const W = (a, b, r, kind, o) => { const w = Object.assign({ a, b, r, kind }, o || {}); walls.push(w); return w; };
  const rail = (a, b, r = 0.22, o) => W(a, b, r, 'rail', o);
  const post = (x, d, r = 0.32, kind = 'post', o) => { const p = Object.assign({ x, d, r, kind }, o || {}); posts.push(p); return p; };
  const ctl = (id, kind, x, d, o) => { const c = Object.assign({ id, kind, x, d, lane: Math.sign(x) || 1 }, o || {}); controls.push(c); return c; };
  const gate = (id, lane, d, kind, by, o) => {
    const rw = o && o.rail || T.RAIL;
    const x0 = lane < 0 ? -rw : 0.15, x1 = lane < 0 ? -0.15 : rw;
    const g = Object.assign({ id, lane, d, x0, x1, kind, by }, o || {});
    gates.push(g);
    W([x0, d], [x1, d], 0.2, 'gate', { gate: id });
    return g;
  };
  const star = (x, d, h = 0) => stars.push([x, d, h]);
  const starLine = (x0, d0, x1, d1, n, h = 0) => { for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0.5; star(x0 + (x1 - x0) * u, d0 + (d1 - d0) * u, h); } };
  const starArc = (cx, cd, r, a0, a1, n) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (n > 1 ? i / (n - 1) : 0.5); star(cx + Math.cos(a) * r, cd + Math.sin(a) * r); } };
  const sec = (d0, d1, part, o) => { const s = Object.assign({ i: sections.length, d0, d1, part }, o); sections.push(s); return s; };
  const hole = (x, d, r, kind = 'drain', o) => { const h = Object.assign({ x, d, r, kind }, o || {}); holes.push(h); return h; };
  const strip = (x0, x1, d0, d1, kind, o) => { const h = Object.assign({ x0, x1, d0, d1, kind }, o || {}); holes.push(h); return h; };
  // a lane's outer rails and the divider down the middle, from d0 to d1 (rw: rail half-width)
  const lanes = (d0, d1, div0, div1, rw = T.RAIL) => {
    rail([-rw, d0], [-rw, d1]); rail([rw, d0], [rw, d1]);
    if (div1 > div0) { rail([0, div0], [0, div1], 0.3, { divider: true }); post(0, div0, 0.42); post(0, div1, 0.42); }
  };
  const across = (d, kind = 'rail', rw = T.RAIL, o) => W([-rw, d], [rw, d], 0.25, kind, o);
  const halfAcross = (lane, d, kind = 'rail', rw = T.RAIL, o) => W([lane < 0 ? -rw : 0, d], [lane < 0 ? 0 : rw, d], 0.25, kind, o);

  /* =================== PART 1: THE FLIPPER FIELD (d 0 to 80) =================== */
  parts.push({ name: 'The Flipper Field', d0: 0, d1: 80 });
  lanes(-1, 79, 10.5, 78);
  across(0.2, 'rail', T.RAIL, { bottom: true });
  // the two great flippers at the bottom (they flick a ball that rolls down onto them back up the table)
  kickers.push({ id: 'greatL', x: -4.2, d: 1.6, r: 1.6, kick: [0.6, 6.8], great: true });
  kickers.push({ id: 'greatR', x: 4.2, d: 1.6, r: 1.6, kick: [-0.6, 6.8], great: true });
  // section 1: the start, a kerb to hop, a first bumper, a first outlane and save post (it costs nothing here)
  sec(0, 24, 0, { spawn: [[-4.5, 3.6], [4.5, 3.6]], save: [[-2.5, 13.2], [2.5, 13.2]], name: 'the start' });
  W([-8.75, 7.6], [8.75, 7.6], 0.28, 'kerb', { teach: true });
  post(-5.6, 15.2, 1.05, 'bumper', { teach: true }); post(5.6, 15.2, 1.05, 'bumper', { teach: true });
  hole(-7.55, 20.2, 1.0, 'drain', { teach: true }); hole(7.55, 20.2, 1.0, 'drain', { teach: true });
  // the outlane guide posts that make the alleys
  post(-6.2, 22.4, 0.32); post(6.2, 22.4, 0.32); post(-8.2, 17.6, 0.3); post(8.2, 17.6, 0.3);
  starLine(-4.5, 5, -4.5, 6.4, 2); starLine(4.5, 5, 4.5, 6.4, 2); star(-1.8, 9.5, 1.0); star(1.8, 9.5, 1.0);
  starArc(-5.6, 15.2, 2.4, 1.9, 3.6, 3); starArc(5.6, 15.2, 2.4, -0.45, 1.25, 3); starLine(-3, 18, -3, 22.5, 3); starLine(3, 18, 3, 22.5, 3);
  // section 2: the star roll-over, once each way
  sec(24, 48, 0, { spawn: [[-4.5, 25.6], [4.5, 25.6]], save: [[-2.4, 26.8], [2.4, 26.8]], name: 'the star roll-overs' });
  W([-T.RAIL, 24], [-0.3, 24], 0.18, 'oneway', { sec: 1 }); W([0.3, 24], [T.RAIL, 24], 0.18, 'oneway', { sec: 1 });
  ctl('starA', 'star', -6.3, 29.5, { teach: 1 });
  gate('g1R', 1, 32.5, 'lift', 'starA');
  ctl('starB', 'star', 6.3, 37.5, { teach: 2 });
  gate('g1L', -1, 41.5, 'lift', 'starB');
  hole(7.55, 28.6, 0.95); hole(-7.55, 45.8, 0.95);
  post(-3.2, 34.5, 0.35); post(-5.6, 36.6, 0.35); post(3.2, 44.6, 0.35); post(5.4, 42.4, 0.35);
  post(-4.4, 31.2, 0.9, 'bumper'); post(4.6, 40.6, 0.9, 'bumper');
  starLine(-2.4, 28, -2.4, 31, 3); starArc(-4.4, 31.2, 2.1, -1.2, 1.2, 3); starLine(-6.5, 33, -6.5, 39.5, 4); starLine(-2.8, 37, -2.8, 40.5, 3);
  starLine(2.4, 27, 2.4, 31.2, 3); starLine(6.6, 33.5, 6.6, 36, 2); starArc(4.6, 40.6, 2.1, 1.9, 4.4, 3); starLine(2.6, 34, 2.6, 46, 5); starLine(-4.5, 43.5, -4.5, 46.5, 2);
  // section 3: the first hold cups
  sec(48, 80, 0, { spawn: [[-4.5, 49.6], [4.5, 49.6]], save: [[-2.4, 51.2], [2.4, 51.2]], name: 'the hold cups' });
  W([-T.RAIL, 48], [-0.3, 48], 0.18, 'oneway', { sec: 2 }); W([0.3, 48], [T.RAIL, 48], 0.18, 'oneway', { sec: 2 });
  ctl('cupA', 'cup', 6.0, 53.8, { teach: 3 });
  gate('g2L', -1, 56.5, 'drop', 'cupA', { hold: true });
  ctl('cupB', 'cup', -6.0, 62.2);
  gate('g2R', 1, 59.5, 'drop', 'cupB', { hold: true });
  // the slingshot tents and their outlanes, then the twin flippers
  slings.push({ a: [-8.6, 64.4], b: [-6.6, 68.6], n: [0.9, -0.43], stall: 'tickets' });
  slings.push({ a: [8.6, 64.4], b: [6.6, 68.6], n: [-0.9, -0.43], stall: 'popcorn' });
  rail([-8.6, 64.4], [-6.6, 68.6], 0.3, { sling: true }); rail([8.6, 64.4], [6.6, 68.6], 0.3, { sling: true });
  hole(-7.6, 71.6, 0.95); hole(7.6, 71.6, 0.95);
  post(-6.3, 70.0, 0.32); post(6.3, 70.0, 0.32);
  ctl('twin1L', 'cradle', -4.4, 75.2, { twin: 'twin1' }); ctl('twin1R', 'cradle', 4.4, 75.2, { twin: 'twin1' });
  across(78.2, 'rail', T.RAIL, { top: true });
  twins.push({ id: 'twin1', cradles: ['twin1L', 'twin1R'], to: [[-4.4, 93.4], [4.4, 93.4]], apex: 10, dur: 1.8 });
  starLine(2.5, 51, 2.5, 57.5, 4); starArc(6.0, 53.8, 1.9, 1.9, 4.2, 3); starLine(-2.6, 50.5, -2.6, 55.5, 3);
  starLine(-2.5, 58.5, -2.5, 64.5, 4); starArc(-6.0, 62.2, 1.9, -1.3, 1.3, 3); starLine(4.4, 61.5, 4.4, 66.5, 3); starLine(-4.4, 67, -4.4, 71.5, 3); starLine(2.2, 68.5, 2.2, 72.5, 3);
  decor.push({ kind: 'stall', x: -11.6, d: 66, face: 1, name: 'tickets' }, { kind: 'stall', x: 11.6, d: 66, face: -1, name: 'popcorn' },
    { kind: 'apron', d: -4 }, { kind: 'booth', x: -12.4, d: 20 }, { kind: 'queue', x: 12.2, d: 31 }, { kind: 'alley', x: -9.6, d: 20 }, { kind: 'alley', x: 9.6, d: 20 });

  /* =================== PART 2: BUMPER TOWN (d 90 to 184) =================== */
  parts.push({ name: 'Bumper Town', d0: 90, d1: 184 });
  lanes(89, 183, 96, 182);
  across(89.2, 'rail', T.RAIL, { bottom: true });
  // section 4: the bumper cluster and the target banks with their staircases
  sec(89, 126, 1, { spawn: [[-4.5, 92.4], [4.5, 92.4]], save: [[-2.2, 95.4], [2.2, 95.4]], name: 'the target banks' });
  for (const s of [-1, 1]) {
    post(s * 5.25, 100.6, 0.95, 'bumper', { town: 'diner' }); post(s * 2.6, 103.4, 0.95, 'bumper', { town: 'cinema' }); post(s * 4.9, 107.0, 0.95, 'bumper', { town: 'barber' });
  }
  ctl('tbA', 'targets', -8.55, 99.0, { d1: 106.2, n: 5, face: 1 });
  stairs.push({ id: 'stR', lane: 1, steps: [109.0, 110.3, 111.6, 112.9, 114.2], x0: 0.15, x1: T.RAIL, by: 'tbA' });
  ctl('tbB', 'targets', 8.55, 116.4, { d1: 123.6, n: 5, face: -1 });
  stairs.push({ id: 'stL', lane: -1, steps: [117.4, 118.7, 120.0, 121.3, 122.6], x0: -T.RAIL, x1: -0.15, by: 'tbB' });
  hole(-7.55, 112.0, 0.92); hole(7.55, 96.8, 0.92);
  starLine(-7.2, 97, -7.2, 98.4, 2); starArc(-2.6, 103.4, 2.2, -1.2, 1.4, 3); starLine(-4.0, 109, -4.0, 115.5, 4); star(-6.6, 103.8, 1.0);
  starLine(7.2, 97.8, 7.2, 99.2, 2); starArc(2.6, 103.4, 2.2, 1.7, 4.4, 3); starLine(4.4, 115.4, 4.4, 123, 4); star(6.4, 103.8, 1.0); starLine(-4.4, 123.6, -4.4, 125, 2);
  // section 5: the flippers for a friend and the roaming magnets
  sec(126, 160, 1, { spawn: [[-4.5, 128.2], [4.5, 128.2]], save: [[-2.4, 129.4], [2.4, 129.4]], name: 'the flippers for a friend' });
  W([-T.RAIL, 126], [-0.3, 126], 0.18, 'oneway', { sec: 4 }); W([0.3, 126], [T.RAIL, 126], 0.18, 'oneway', { sec: 4 });
  magnets.push({ id: 'magL', d: 133.6, x0: -7.6, x1: -1.4, v: 1.5, ph: 0.3 });
  ctl('cradleR', 'cradle', 4.5, 136.4);
  halfAcross(1, 139.4, 'ledge');
  ctl('btnA', 'button', -6.0, 141.6);
  flippers.push({ id: 'fR', cradle: 'cradleR', button: 'btnA', to: [4.5, 145.8], apex: 6.5, dur: 1.15 });
  ctl('cradleL', 'cradle', -4.5, 147.2);
  halfAcross(-1, 150.2, 'ledge');
  ctl('btnB', 'button', 6.0, 152.0);
  flippers.push({ id: 'fL', cradle: 'cradleL', button: 'btnB', to: [-4.5, 155.8], apex: 6.5, dur: 1.15 });
  magnets.push({ id: 'magR', d: 148.6, x0: 1.4, x1: 7.6, v: 1.5, ph: 0.7 });
  hole(7.55, 131.8, 0.92); hole(-7.55, 144.6, 0.9);
  post(-2.4, 137.4, 0.85, 'bumper', { town: 'bank' }); post(2.4, 155.6, 0.85, 'bumper', { town: 'bakery' });
  starLine(-4.4, 130, -4.4, 132, 2); starLine(-5.6, 136.2, -5.6, 139.6, 3); starLine(-2.6, 141, -2.6, 145.5, 3); starArc(-6.0, 141.6, 1.8, -0.6, 1.4, 3);
  starLine(4.5, 130, 4.5, 133.6, 3); starLine(4.4, 143.4, 6.6, 146.8, 3); starLine(3.0, 149.6, 3.0, 151.6, 2); starLine(-4.5, 157, -4.5, 158.8, 2); starLine(6.6, 154, 6.6, 158.6, 3);
  // section 6: the first loose silver balls; a star and a cup mixed
  sec(160, 184, 1, { spawn: [[-4.5, 162.2], [4.5, 162.2]], save: [[-2.4, 163.0], [2.4, 163.0]], name: 'the loose balls' });
  W([-T.RAIL, 160], [-0.3, 160], 0.18, 'oneway', { sec: 5 }); W([0.3, 160], [T.RAIL, 160], 0.18, 'oneway', { sec: 5 });
  ctl('starC', 'star', 6.6, 166.0);
  gate('g3L', -1, 168.8, 'lift', 'starC');
  ctl('cupC', 'cup', -6.2, 173.0);
  gate('g3R', 1, 171.0, 'drop', 'cupC', { hold: true });
  loose.push({ id: 'lsL6', sec: 5, x: -2.7, d0: 168.0, d1: 160.6, per: 6.5, ph: 1.0 });
  loose.push({ id: 'lsR6', sec: 5, x: 2.7, d0: 170.4, d1: 160.6, per: 6.5, ph: 4.2 });
  hole(-7.6, 177.6, 0.9); hole(7.6, 177.6, 0.9);
  ctl('twin2L', 'cradle', -4.4, 179.6, { twin: 'twin2' }); ctl('twin2R', 'cradle', 4.4, 179.6, { twin: 'twin2' });
  across(182.6, 'rail', T.RAIL, { top: true });
  twins.push({ id: 'twin2', cradles: ['twin2L', 'twin2R'], to: [[-4.0, 195.6], [4.0, 195.6]], apex: 12, dur: 1.9 });
  starLine(-5.4, 163.4, -5.4, 167, 3); starLine(5.2, 162.6, 5.2, 164.6, 2); starLine(-4.0, 170, -4.0, 172.6, 2); starLine(4.4, 172, 4.4, 176.4, 3); starLine(-2.4, 174.6, -2.4, 177.4, 2);
  tilts.push({ at: 113.0, dir: 1 }, { at: 149.5, dir: -1 });
  decor.push({ kind: 'crown', x: -2.6, d: 103.4 }, { kind: 'lostprop', x: 12, d: 118 }, { kind: 'band', x: -12, d: 150 });

  /* =================== PART 3: THE CHROME RAILS (d 192 to 284; the upper playfield, display only) =================== */
  parts.push({ name: 'The Chrome Rails', d0: 192, d1: 284, upper: true });
  const R3 = T.RAIL3;
  lanes(191, 283, 197, 282, R3);
  across(191.4, 'rail', R3, { bottom: true });
  // section 7: the spinner bridges
  sec(191, 222, 2, { spawn: [[-4.0, 194.0], [4.0, 194.0]], name: 'the spinner bridges', rail: R3 });
  ctl('spinA', 'spinner', -3.75, 200.0, { x0: -6.3, x1: -1.2, bridge: 'bR' });
  strip(0.3, R3, 205.0, 209.0, 'gap', { bridge: 'bR' });
  bridges.push({ id: 'bR', lane: 1, d0: 205.0, d1: 209.0, by: 'spinA' });
  ctl('spinB', 'spinner', 3.75, 213.0, { x0: 1.2, x1: 6.3, bridge: 'bL' });
  strip(-R3, -0.3, 215.0, 219.0, 'gap', { bridge: 'bL' });
  bridges.push({ id: 'bL', lane: -1, d0: 215.0, d1: 219.0, by: 'spinB' });
  post(-5.2, 207.0, 0.8, 'bumper', { town: 'ring' }); post(4.4, 200.4, 0.32); post(2.0, 202.6, 0.32);
  starLine(-2.4, 196, -2.4, 198.4, 2); starLine(-4.6, 202.4, -4.6, 204.6, 2); starArc(-5.2, 207.0, 1.9, -1.2, 1.6, 3); starLine(-2.4, 209.4, -2.4, 213.6, 3);
  starLine(5.6, 196, 5.6, 199, 2); starLine(4.0, 210.4, 4.0, 212, 2); starLine(5.6, 214.6, 5.6, 220.4, 3); starLine(-4.0, 219.8, -4.0, 221, 2);
  // section 8: the detour (the left lane is kicked up to the high lever while the right lane holds the button)
  sec(222, 256, 2, { spawn: [[-4.0, 224.0], [4.0, 224.0]], name: 'the detour', rail: R3 });
  W([-R3, 222], [-0.3, 222], 0.18, 'oneway', { sec: 7 }); W([0.3, 222], [R3, 222], 0.18, 'oneway', { sec: 7 });
  kickers.push({ id: 'detour', x: -4.0, d: 232.4, r: 1.25, ride: 'rDetUp', pair: true });
  halfAcross(-1, 235.6, 'rail', R3);
  rides.push({ id: 'rDetUp', dur: 2.2, pts: [[-4.0, 232.4, 0], [-5.8, 228.0, 2.4], [-7.0, 233.0, 4.8], [-5.2, 238.6, 6.4], [-4.4, 240.6, 6.0], [-4.2, 241.4, 0]] });
  halfAcross(-1, 236.4, 'rail', R3); halfAcross(-1, 247.0, 'rail', R3);
  rail([-0.3, 236.4], [-0.3, 247.0], 0.25);
  ctl('lever', 'lever', -5.8, 244.6, { needs: 'btnD', gate: 'gDet' });
  strip(-6.9, -5.6, 237.4, 239.4, 'gap', { escape: true });
  kickers.push({ id: 'detourOut', x: -2.0, d: 245.6, r: 1.0, ride: 'rDetDown', needs: 'gDet' });
  rides.push({ id: 'rDetDown', dur: 1.5, pts: [[-2.0, 245.6, 0], [-1.6, 248.6, 3.6], [-3.0, 251.0, 2.0], [-4.0, 252.2, 0]] });
  ctl('btnD', 'button', 4.0, 229.4, { hold: true });
  gate('gDet', 1, 236.0, 'drop', 'lever', { rail: R3 });
  magnets.push({ id: 'magD', d: 230.7, x0: 1.4, x1: 6.4, v: 1.25, ph: 0.0 });
  loose.push({ id: 'lsR8', sec: 7, x: 6.0, d0: 235.2, d1: 222.6, per: 7.5, ph: 3.0 });
  starLine(-2.4, 225, -2.4, 230, 3); starLine(-6.0, 226, -6.0, 230, 3); starArc(-4.0, 242.0, 2.2, 0.2, 2.9, 4); star(-3.2, 240.0, 1.0);
  starLine(2.2, 224.6, 2.2, 228.2, 3); starLine(6.0, 226.0, 6.0, 228.0, 2); star(4.0, 231.6, 1.1); starLine(4.0, 238, 4.0, 254, 6); starLine(-4.0, 249.0, -4.0, 255.0, 3);
  // section 9: hold cups on the clear upper playfield, the rocket's wash and a rail edge
  sec(256, 284, 2, { spawn: [[-4.0, 258.0], [4.0, 258.0]], name: 'the upper playfield', rail: R3 });
  W([-R3, 256], [-0.3, 256], 0.18, 'oneway', { sec: 8 }); W([0.3, 256], [R3, 256], 0.18, 'oneway', { sec: 8 });
  ctl('cupD', 'cup', -5.3, 260.4);
  gate('g4R', 1, 263.2, 'drop', 'cupD', { hold: true, rail: R3 });
  ctl('cupE', 'cup', 5.3, 267.4);
  gate('g4L', -1, 265.2, 'drop', 'cupE', { hold: true, rail: R3 });
  winds.push({ d0: 256, d1: 278, per: 9.0, on: 1.8, push: 2.4, ph: 2.0 });
  strip(-R3, -6.2, 268.4, 275.0, 'gap'); strip(6.2, R3, 268.4, 275.0, 'gap');
  ctl('twin3L', 'cradle', -4.0, 280.0, { twin: 'twin3' }); ctl('twin3R', 'cradle', 4.0, 280.0, { twin: 'twin3' });
  across(282.6, 'rail', R3, { top: true });
  twins.push({ id: 'twin3', cradles: ['twin3L', 'twin3R'], to: [[-4.5, 297.4], [4.5, 297.4]], apex: 4, dur: 2.4, loop: true });
  starLine(-2.4, 258, -2.4, 263, 3); starLine(3.0, 257.6, 3.0, 262.4, 3); starLine(-4.0, 266.6, -4.0, 272.6, 3); starLine(2.4, 264.0, 2.4, 266.4, 2); starLine(4.0, 270.0, 4.0, 276.6, 3);
  tilts.push({ at: 259.0, dir: 1 });
  decor.push({ kind: 'rocket', x: 0, d: 262 }, { kind: 'planet', x: -14, d: 215 }, { kind: 'moon', x: 14, d: 245 });

  /* =================== PART 4: THE BACKBOARD (d 293 to 372) and the final ramp (d 380 to 411) =================== */
  parts.push({ name: 'The Backboard', d0: 293, d1: 412 });
  lanes(293, 371, 299.4, 370);
  across(293.2, 'rail', T.RAIL, { bottom: true });
  // section 10: the plaza and the first crossing (the lanes swap sides over and under a bridge)
  sec(293, 306, 3, { spawn: [[-4.5, 296.2], [4.5, 296.2]], name: 'the crossing' });
  kickers.push({ id: 'crossA', x: -4.5, d: 302.2, r: 1.25, ride: 'rCrossA', cross: true });
  kickers.push({ id: 'crossB', x: 4.5, d: 302.2, r: 1.25, ride: 'rCrossB', cross: true });
  rides.push({ id: 'rCrossA', dur: 1.6, pts: [[-4.5, 302.2, 0], [-3.0, 304.4, 2.6], [0, 306.0, 3.6], [3.0, 307.8, 2.6], [4.5, 309.8, 0]] });
  rides.push({ id: 'rCrossB', dur: 1.6, pts: [[4.5, 302.2, 0], [3.0, 304.4, -0.6], [0, 306.0, -1.0], [-3.0, 307.8, -0.6], [-4.5, 309.8, 0]] });
  across(305.0, 'rail'); across(306.4, 'rail');
  starLine(-4.5, 297.8, -4.5, 299.6, 2); starLine(4.5, 297.8, 4.5, 299.6, 2);
  // section 11: a star and a target bank on the swapped sides
  sec(306, 326, 3, { spawn: [[-4.5, 308.8], [4.5, 308.8]], save: [[-2.4, 308.8], [2.4, 308.8]], name: 'the backboard targets' });
  ctl('starD', 'star', -6.8, 313.4);
  gate('g5R', 1, 315.6, 'lift', 'starD');
  ctl('tbC', 'targets', 8.55, 317.4, { d1: 324.6, n: 5, face: -1 });
  stairs.push({ id: 'stL2', lane: -1, steps: [318.2, 319.5, 320.8, 322.1, 323.4], x0: -T.RAIL, x1: -0.15, by: 'tbC' });
  hole(7.55, 312.2, 0.9); hole(-7.55, 316.8, 0.85);
  post(5.0, 320.6, 0.85, 'bumper', { town: 'reel' });
  starLine(-4.4, 310.4, -4.4, 312.4, 2); starLine(-2.6, 313.6, -2.6, 317.0, 3); starLine(4.4, 310.6, 4.4, 314.2, 3); starArc(5.0, 320.6, 1.9, 1.7, 4.6, 3); starLine(-4.4, 324.2, -4.4, 325.6, 2);
  // section 12: a flipper for a friend into a spinner bridge over an outlane, then the crossing back
  sec(326, 350, 3, { spawn: [[-4.5, 328.2], [4.5, 328.2]], save: [[-2.4, 329.0], [2.4, 329.0]], name: 'the spinner over the outlane' });
  W([-T.RAIL, 326], [-0.3, 326], 0.18, 'oneway', { sec: 11 }); W([0.3, 326], [T.RAIL, 326], 0.18, 'oneway', { sec: 11 });
  ctl('cradleL2', 'cradle', -4.5, 331.0);
  halfAcross(-1, 333.6, 'ledge');
  ctl('btnE', 'button', 6.2, 332.8);
  flippers.push({ id: 'fL2', cradle: 'cradleL2', button: 'btnE', to: [-4.5, 336.6], apex: 5.6, dur: 1.05 });
  ctl('spinC', 'spinner', -4.2, 340.4, { x0: -7.85, x1: -1.2, bridge: 'bR2' });
  strip(0.3, T.RAIL, 335.6, 339.4, 'drain', { bridge: 'bR2' });
  bridges.push({ id: 'bR2', lane: 1, d0: 335.6, d1: 339.4, by: 'spinC' });
  kickers.push({ id: 'crossC', x: -4.5, d: 345.8, r: 1.2, ride: 'rCrossC', cross: true });
  kickers.push({ id: 'crossD', x: 4.5, d: 345.8, r: 1.2, ride: 'rCrossD', cross: true });
  rides.push({ id: 'rCrossC', dur: 1.6, pts: [[-4.5, 345.8, 0], [-3.0, 347.8, 2.6], [0, 349.6, 3.6], [3.0, 351.2, 2.6], [4.5, 353.2, 0]] });
  rides.push({ id: 'rCrossD', dur: 1.6, pts: [[4.5, 345.8, 0], [3.0, 347.8, -0.6], [0, 349.6, -1.0], [-3.0, 351.2, -0.6], [-4.5, 353.2, 0]] });
  across(348.6, 'rail'); across(350.0, 'rail');
  loose.push({ id: 'lsL12', sec: 12, x: -2.6, d0: 345.4, d1: 334.4, per: 7.0, ph: 2.0 });
  starLine(-2.6, 328.4, -2.6, 331.6, 3); starLine(4.2, 330.4, 4.2, 333.6, 2); starLine(-6.4, 335.2, -6.4, 338.6, 3); starLine(-2.2, 342.0, -2.2, 344.2, 2); starLine(4.4, 340.4, 4.4, 343.6, 3);
  // section 13: the hardest mix, then the Comet Jackpot scoops
  sec(350, 372, 3, { spawn: [[-4.5, 352.8], [4.5, 352.8]], save: [[-2.4, 352.0], [2.4, 352.0]], name: 'the Comet Jackpot' });
  ctl('cupF', 'cup', 6.6, 356.2);
  gate('g6L', -1, 358.6, 'drop', 'cupF', { hold: true });
  ctl('starE', 'star', -6.6, 362.2);
  gate('g6R', 1, 360.2, 'lift', 'starE');
  loose.push({ id: 'lsL13', sec: 13, x: -2.6, d0: 358.0, d1: 351.0, per: 6.0, ph: 0.5 });
  loose.push({ id: 'lsR13', sec: 13, x: 2.8, d0: 359.6, d1: 351.0, per: 6.0, ph: 3.5 });
  hole(-7.6, 365.8, 0.85); hole(7.6, 365.8, 0.85);
  ctl('scoopL', 'scoop', -4.5, 368.6); ctl('scoopR', 'scoop', 4.5, 368.6);
  across(371.4, 'rail', T.RAIL, { top: true });
  rides.push({ id: 'rJackL', dur: 2.0, pts: [[-4.5, 368.6, 0], [-5.6, 372, 4], [-4.8, 377, 6], [-3.6, 382.6, 0]] });
  rides.push({ id: 'rJackR', dur: 2.0, pts: [[4.5, 368.6, 0], [5.6, 372, 4], [4.8, 377, 6], [3.6, 382.6, 0]] });
  starLine(-4.4, 354, -4.4, 357.6, 3); starLine(4.4, 352.6, 4.4, 354.4, 2); starLine(-2.4, 359.6, -2.4, 364, 3); starLine(4.0, 361.6, 4.0, 366, 3);
  tilts.push({ at: 312.0, dir: -1 }, { at: 355.0, dir: 1 });
  // the final ramp: multiball pours down it; one last pair of gates; the comet's mouth
  const RW = 6.6;
  sec(380, 412, 3, { spawn: [[-3.6, 382.8], [3.6, 382.8]], name: 'the final ramp', rail: RW, ramp: true });
  rail([-RW, 380], [-RW, 404.6]); rail([RW, 380], [RW, 404.6]); rail([-RW, 404.6], [-4.4, 411.6]); rail([RW, 404.6], [4.4, 411.6]);
  rail([0, 381.6], [0, 403.6], 0.3, { divider: true }); post(0, 381.6, 0.42); post(0, 403.6, 0.42);
  across(380.4, 'rail', RW, { bottom: true });
  ctl('starF', 'star', -5.0, 390.8);
  gate('g7R', 1, 394.4, 'lift', 'starF', { rail: RW });
  ctl('starG', 'star', 5.0, 398.2);
  gate('g7L', -1, 396.2, 'lift', 'starG', { rail: RW });
  ctl('mouth', 'mouth', 0, 408.6, { r: 3.6 });
  W([-4.4, 411.6], [4.4, 411.6], 0.3, 'rail');
  starLine(-3.6, 384.8, -3.6, 389.4, 3); starLine(3.6, 384.8, 3.6, 393.2, 5); starLine(-3.6, 398, -3.6, 402.6, 3); starLine(3.6, 400, 3.6, 402.6, 2);

  /* ---------- the flood (multiball on the final ramp) ----------
     Each half of the ramp gets one silver ball at a time, a row every `per` seconds, pouring down either its inner
     track or its outer one. A ball on one track leaves the other side of the half clear (two ball-widths), so the
     way up is a weave: see the next ball coming, roll to the clear side, climb (or hop it, if you time it). The
     pattern is fixed and differs per half, sometimes the same side twice so it never feels like a metronome. */
  const flood = [];
  [-1, 1].forEach((s, si) => flood.push({ half: s, xs: [s * 1.9, s * 4.7], d0: 409.6, d1: 381.2, per: 1.75, ph: si * 0.85,
    pattern: si ? [1, 0, 0, 1, 0, 1, 1, 0, 1, 0] : [0, 1, 1, 0, 1, 0, 0, 1, 0, 1] }));

  /* ---------- lookups ---------- */
  const byId = {};
  for (const list of [controls, gates, stairs, flippers, twins, kickers, rides, magnets, loose, bridges]) for (const o of list) byId[o.id] = o;
  const secAt = d => { let s = sections[0]; for (const q of sections) if (d >= q.d0 - 0.01) s = q; return s; };
  const partAt = d => { let p = 0; parts.forEach((q, k) => { if (d >= q.d0 - 3) p = k; }); return p; };
  // display height of the playfield at d (a steady slope; part 3's upper playfield sits LIFT3 above the main table)
  const yAt = d => {
    let y = d * T.SLOPE;
    if (d > 186 && d < 289) y += T.LIFT3 * Math.min(1, (d - 186) / 6, (289 - d) / 5);
    return y;
  };
  const rideAt = (r, u) => {
    // a smooth path through the ride's points (Catmull-Rom), u 0..1
    const P = r.pts, n = P.length - 1, f = Math.max(0, Math.min(0.99999, u)) * n, i = Math.floor(f), t = f - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)];
    const cr = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
    return [cr(0), cr(1), cr(2)];
  };
  // walls bucketed by d (every 8 units) so a ball only checks what is near it
  const BK = 8, buckets = new Map();
  const addB = (o, d0, d1) => { for (let b = Math.floor(d0 / BK); b <= Math.floor(d1 / BK); b++) { if (!buckets.has(b)) buckets.set(b, { walls: [], posts: [] }); (o.a ? buckets.get(b).walls : buckets.get(b).posts).push(o); } };
  for (const w of walls) addB(w, Math.min(w.a[1], w.b[1]) - w.r - 1, Math.max(w.a[1], w.b[1]) + w.r + 1);
  for (const p of posts) addB(p, p.d - p.r - 1, p.d + p.r + 1);
  // staircase steps are walls too (solid unless that step is up)
  for (const s of stairs) s.steps.forEach((d, i) => { const w = W([s.x0, d], [s.x1, d], 0.2, 'step', { stairs: s.id, step: i + 1 }); addB(w, d - 1.5, d + 1.5); });
  // target faces: one small wall per target (solid while up)
  for (const c of controls) if (c.kind === 'targets') {
    c.targets = [];
    for (let i = 0; i < c.n; i++) {
      const d = c.d + (c.d1 - c.d) * (i + 0.5) / c.n, x = c.x + c.face * 0.18;
      const w = W([x, d - 0.6], [x, d + 0.6], 0.2, 'target', { bank: c.id, ti: i });
      addB(w, d - 2, d + 2); c.targets.push({ x, d, w });
    }
  }
  const near = d => buckets.get(Math.floor(d / BK)) || { walls: [], posts: [] };
  // every element of a lane, in order up the table, that can stop a ball: what the brain plans around
  const blockers = { '-1': [], '1': [] };
  for (const g of gates) blockers[g.lane].push({ kind: 'gate', id: g.id, d: g.d, by: g.by });
  for (const s of stairs) blockers[s.lane].push({ kind: 'stairs', id: s.id, d: s.steps[0], top: s.steps[s.steps.length - 1], by: s.by });
  for (const f of flippers) { const c = byId[f.cradle]; blockers[c.lane].push({ kind: 'ledge', id: f.id, d: c.d + 1.2, cradle: c.id, by: f.button }); }
  for (const b of bridges) blockers[b.lane].push({ kind: 'gap', id: b.id, d: b.d0, top: b.d1, by: b.by });
  for (const t of twins) for (const cid of t.cradles) { const c = byId[cid]; blockers[c.lane].push({ kind: 'twin', id: t.id, d: c.d, cradle: cid }); }
  for (const k of kickers) if (k.cross || k.pair) blockers[Math.sign(k.x)].push({ kind: k.cross ? 'cross' : 'detour', id: k.id, d: k.d });
  for (const c of controls) if (c.kind === 'scoop') blockers[c.lane].push({ kind: 'scoop', id: c.id, d: c.d });
  blockers['-1'].push({ kind: 'mouth', id: 'mouth', d: 404 }); blockers['1'].push({ kind: 'mouth', id: 'mouth', d: 404 });
  for (const k in blockers) blockers[k].sort((a, b) => a.d - b.d);
  // which lane each piece of the detour belongs to after it: the detour lane's ball lands at 252 (left)
  const total = { stars: stars.length, gates: gates.length + stairs.length + flippers.length + bridges.length };
  return { T, walls, posts, slings, holes, controls, gates, stairs, flippers, twins, kickers, rides, magnets, loose, tilts, winds, stars,
    sections, parts, bridges, flood, decor, byId, secAt, partAt, yAt, rideAt, near, blockers, total, END: 412 };
})();
