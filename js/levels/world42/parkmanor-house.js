/* Pip & Bo - 42-3 Spook Manor: the house (PARKMANOR_HOUSE). Numbers only, no three.js: the rules, the computer
   partner and the 3D scenery all read it. Loaded with the game.

   Units are the 3D kit's (1 unit = 1 tile), Y up, -Z is "away" (the manor's back). The tour runs:
     the path (z 34 -> 8) up through the fake graveyard to the porch,
     the Front Hall (x -8..8, z -10..6): chequered floor, grand stair up to a landing, chandelier,
     the Armour Corridor (x 8..30, z -6.6..-2.4): suits of armour both sides, a wardrobe in an alcove,
     then on to the dining room (stretch 2) through the door at its far end.
   What is here:
     solids     MOVER3 boxes: walls (kind 'wall', id for the cut-away), doors (kind 'door', id; ghost when open),
                furniture (kind 'furn'), the stair ramp, the outdoor fence, headstones and trees
     zones      rooms for the camera and the "where" of a Fright: { id, name, x0, x1, z0, z1, cam, cut, place }
                cam = { heading, pitch, dist, min, max, fov, ahead } (heading as K3D.heading); cut = wall ids the
                camera looks through in this zone (the scenery lowers them to a cut-away section)
     doors      { id, x, z, w, d, lock: true (Bo's key opens it) | 'trig' (opens when its trigger fires) }
     winders    { id, x, z, kind: 'chandelier' | 'lamp', dur, light: { x, z, r } or { rect } }: Bo winds them
     hides      hiding places for the Butler: { id, x, z, r, kind, face (radians the pair face inside) }
     clocks     grandfather clocks, the restart points: { x, z, face, r (pass radius) }
     spooks     { id, kind, x, z, face, wake (a trigger id, or null: always awake), stepper (armour that walks) }
     wisps      { x, y, z, hide: null | 'vase' | 'curtain' | 'sheet' | 'jar' | 'painting' }
     triggers   { id, x0, x1, z0, z1 }: fires the first time a hero stands in it (doors, wake-ups, the guide)
     says       the tour guide: { trig, text }
     butler     scripted visits: { trig, path: [[x, z], ...], speed, kind: 'walkaway' | 'hunt', pause: [x, z, secs, what],
                y (a floor height: the landing) }
     start      the two heroes' first spots; hooks: where the lantern and the key hang on the porch */
'use strict';

const PARKMANOR_HOUSE = (function () {
  const H = { solids: [], zones: [], doors: [], winders: [], hides: [], clocks: [], spooks: [], wisps: [], triggers: [], says: [], butler: [], art: {} };
  const S = H.solids;
  // an axis-aligned box from corners (x0..x1, z0..z1), y0..y1
  const box = (x0, z0, x1, z1, y0, y1, o = {}) => { const s = Object.assign({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: Math.abs(x1 - x0), d: Math.abs(z1 - z0), y0, y1, rot: 0 }, o); S.push(s); return s; };
  // a wall along x or z with door gaps: gaps = [[from, to], ...] along its length
  function wall(id, axis, at, from, to, h, gaps = [], o = {}) {
    const t = o.t || 0.4, segs = []; let a = from;
    for (const [g0, g1] of gaps.concat([[to, to]]).sort((p, q) => p[0] - q[0])) {
      if (g0 > a + 0.01) segs.push([a, g0]);
      a = Math.max(a, g1);
    }
    for (const [s0, s1] of segs) {
      if (axis === 'x') box(s0, at - t / 2, s1, at + t / 2, 0, h, Object.assign({ kind: 'wall', id, axis, at }, o.extra));
      else box(at - t / 2, s0, at + t / 2, s1, 0, h, Object.assign({ kind: 'wall', id, axis, at }, o.extra));
    }
    // the lintel over each door (the scenery draws it; feet never reach it)
    for (const [g0, g1] of gaps) if (g1 - g0 < 4) H.art.lintels = (H.art.lintels || []).concat([{ id, axis, at, from: g0, to: g1, h }]);
  }
  H.wall = wall; H.box = box;

  // the ground and the floors (one slab under everything; the rooms draw their own floors on it)
  box(-16, -14, 36, 37, -1, 0, { kind: 'floor' });
  /* ======================= stretch 1: the path, the Front Hall, the Armour Corridor ======================= */
  // ---- the path through the fake graveyard (outside) ----
  // the edges of the grounds: a tall iron fence and the hedges (invisible past what is drawn)
  box(-15, 8, -14, 36, 0, 3, { kind: 'edge' }); box(14, 8, 15, 36, 0, 3, { kind: 'edge' }); box(-15, 35, 15, 36, 0, 3, { kind: 'edge' });
  // the cemetery fence across the path, with its crooked gate (open)
  box(-14, 21.8, -1.7, 22.2, 0, 1.7, { kind: 'fence' }); box(1.7, 21.8, 14, 22.2, 0, 1.7, { kind: 'fence' });
  // headstones (plywood, with joke names), crooked; and the dead trees
  H.art.stones = [
    [-3.4, 19, 0.2, 'R.I.P. Van Winkle'], [-5.6, 17.6, -0.15, 'Ima Goner'], [-8.2, 19.4, 0.1, 'Barry D. Alive'], [-4.4, 14.8, 0.3, 'Hugh Mungus Bones'],
    [-7.4, 13.2, -0.2, 'Paul Tergeist'], [-9.2, 16.3, 0.15, 'Phil T. Sheets'], [-9.6, 11.2, -0.1, 'Here lies a pun'],
    [3.6, 18.6, -0.2, 'Doug Graves'], [6.0, 19.6, 0.25, 'Ann Tique'], [8.8, 17.4, -0.1, 'Rusty Hinges'], [4.6, 14.2, 0.1, 'Will Haunt'],
    [7.6, 12.6, -0.25, 'Dee Ceased'], [10.6, 14.4, 0.2, 'Count Backwards'], [10.2, 10.6, 0.05, 'Gone Fishin\''],
  ];
  for (const [x, z, r] of H.art.stones) box(x - 0.55, z - 0.14, x + 0.55, z + 0.14, 0, 1.0, { kind: 'stone', rot: r });
  H.art.trees = [[-6.4, 25.5, 1.2], [7.2, 26.5, 1.35], [-11.6, 19.2, 1.0], [11.8, 19.4, 1.1], [-2.8, 11.6, 0.8], [12.2, 9.6, 0.9]];
  box(-13.4, 12.0, -11.4, 14.0, 0, 2.6, { kind: 'crypt', rot: 0.5 }); // the Grimsby family crypt
  for (const [x, z, s] of H.art.trees) box(x - 0.35 * s, z - 0.35 * s, x + 0.35 * s, z + 0.35 * s, 0, 5, { kind: 'tree' });
  // the porch: a low wooden deck with two posts and steps
  box(-3.6, 6.0, 3.6, 8.6, 0, 0.18, { kind: 'porch' });
  box(-3.5, 8.2, -3.1, 8.6, 0, 3.6, { kind: 'post' }); box(3.1, 8.2, 3.5, 8.6, 0, 3.6, { kind: 'post' });
  H.art.porch = { x0: -3.6, x1: 3.6, z0: 6.0, z1: 8.6, y: 0.18 };
  H.hooks = { lantern: { x: -2.3, z: 6.55, y: 1.65 }, key: { x: 2.3, z: 6.55, y: 1.55 } };
  H.start = [[-1.1, 31.5], [1.1, 31.5]];

  // ---- the manor's front (the hall's front wall, the corridor wing set back), with the front door ----
  wall('hallFront', 'x', 6, -8.2, 8.2, 6.4, [[-1.1, 1.1]]);
  H.doors.push({ id: 'front', x: 0, z: 6, w: 2.2, d: 0.3, lock: 'trig', trig: 'porch', closeTrig: 'hallIn' });
  // ---- the Front Hall ----
  wall('hallLeft', 'z', -8, -10.2, 6.2, 6.4);
  wall('hallBack', 'x', -10, -8.2, 8.2, 6.4);
  wall('hallRight', 'z', 8, -10.2, 6.2, 6.4, [[-5.5, -3.5]]);
  H.doors.push({ id: 'hallLock', x: 8, z: -4.5, w: 0.3, d: 2.0, lock: true });
  // the grand stair: a ramp up the middle of the back to the landing (3 high), banisters both sides
  box(-1.6, -9.0, 1.6, -4.0, 0, 3, { kind: 'stair', rot: Math.PI / 2, x: 0, z: -6.5, w: 5, d: 3.2, ramp: { h0: 0, h1: 3 } });
  box(-1.85, -9.0, -1.6, -4.0, 0, 4.0, { kind: 'banister' }); box(1.6, -9.0, 1.85, -4.0, 0, 4.0, { kind: 'banister' });
  // the landing across the back (seen, the Butler walks it; a velvet rope closes the top of the stair)
  box(-8, -10, -1.85, -8.6, 0, 3, { kind: 'landing' }); box(1.85, -10, 8, -8.6, 0, 3, { kind: 'landing' });
  box(-1.6, -9.0, 1.6, -8.6, 0, 3, { kind: 'landing' });
  box(-1.6, -9.0, 1.6, -8.8, 3, 4.1, { kind: 'rope' });
  H.art.stair = { x: 0, z0: -4, z1: -9, w: 3.2, h: 3 };
  H.art.landing = { z0: -10, z1: -8.6, y: 3 };
  // hall furniture: a coat stand, a hall table with a vase, a bench, the mirror (on the left wall), a suit by the door
  box(-6.9, 4.4, -6.3, 5.0, 0, 2.0, { kind: 'furn', id: 'coatstand' });
  box(5.6, 3.6, 7.6, 4.6, 0, 0.9, { kind: 'furn', id: 'halltable' });
  box(-7.6, -1.0, -6.8, 1.4, 0, 0.5, { kind: 'furn', id: 'hallbench' });
  box(5.8, -9.6, 7.6, -8.7, 3, 3.7, { kind: 'furn', id: 'landingtable' });
  H.art.hall = { x0: -8, x1: 8, z0: -10, z1: 6, h: 6.4 };
  // the hall clock (the first restart inside)
  box(-3.4, 2.9, -2.6, 3.5, 0, 2.5, { kind: 'furn', id: 'clock1' });
  H.clocks.push({ x: 0, z: 30.5, face: Math.PI, r: 3, art: false, name: 'the gate' });
  H.clocks.push({ x: -3, z: 3.2, face: 0, r: 3.0, name: 'the hall' });
  // the chandelier and its winder on the left wall
  H.winders.push({ id: 'chand', x: -7.55, z: -3.2, face: Math.PI / 2, kind: 'chandelier', dur: 10, light: { rect: [-8, 8, -10, 6] }, at: [0, 4.6, -1.5] });

  // ---- the Armour Corridor ----
  wall('corBack', 'x', -6.6, 8, 30.2, 3.6, [[22.2, 24.6]]);
  wall('corFront', 'x', -2.4, 8, 30.2, 3.6);
  wall('corEnd', 'z', 30, -6.8, -2.2, 3.6, [[-5.5, -3.5]]);
  // the wardrobe alcove in the back wall (the first hide)
  box(22.0, -8.6, 22.4, -6.6, 0, 3.6, { kind: 'wall', id: 'alcove' }); box(24.4, -8.6, 24.8, -6.6, 0, 3.6, { kind: 'wall', id: 'alcove' });
  box(22.0, -8.8, 24.8, -8.4, 0, 3.6, { kind: 'wall', id: 'alcove' });
  H.hides.push({ id: 'wardrobe', x: 23.4, z: -7.5, r: 0.95, kind: 'wardrobe', face: 0, door: [23.4, -6.75] });
  H.doors.push({ id: 'corEndDoor', x: 30, z: -4.5, w: 0.3, d: 2.0, lock: 'trig', trig: 'butlerGone1' });
  H.art.corridor = { x0: 8, x1: 30, z0: -6.6, z1: -2.4, h: 3.6 };
  // suits of armour on plinths along both walls (solid), one of them a stepper
  H.art.armour = [];
  let ai = 0;
  for (let x = 10.6; x < 29; x += 2.6) for (const side of [-1, 1]) {
    if (side < 0 && x > 21 && x < 25.5) continue; // (the alcove)
    const z = side < 0 ? -6.0 : -3.0;
    const id = 'arm' + ai++;
    const stepper = Math.abs(x - 18.4) < 0.1 && side < 0;
    if (stepper) H.spooks.push({ id, kind: 'armour', x, z, face: side < 0 ? 0 : Math.PI, wake: 'corIn', stepper: true });
    else { H.art.armour.push({ x, z, face: side < 0 ? 0 : Math.PI }); box(x - 0.36, z - 0.3, x + 0.36, z + 0.3, 0, 2.2, { kind: 'furn', id: 'suit' }); }
  }
  H.clocks.push({ x: 9.3, z: -2.95, face: Math.PI, r: 2.6, name: 'the corridor' });
  box(8.9, -3.25, 9.7, -2.65, 0, 2.5, { kind: 'furn', id: 'clock2' });

  /* ---------- the hall's spooks ---------- */
  H.spooks.push({ id: 'teach', kind: 'sheet', x: -4.6, z: -7.2, face: 0.5, wake: 'hallMid', teach: true });
  H.spooks.push({ id: 'stair1', kind: 'sheet', x: -0.6, z: -7.6, face: 0, wake: 'teachDone' });
  H.spooks.push({ id: 'stair2', kind: 'sheet', x: 0.7, z: -8.3, face: 0, wake: 'teachDone' });
  /* ---------- triggers ---------- */
  const trig = (id, x0, x1, z0, z1) => H.triggers.push({ id, x0, x1, z0, z1 });
  trig('gate', -14, 14, 18, 23);
  trig('porch', -3.6, 3.6, 5.5, 9.6);
  trig('hallIn', -8, 8, -10, 3.4);
  trig('hallMid', -8, 8, -10, 0.6);
  trig('corIn', 9.2, 30, -6.6, -2.4);
  trig('corMid', 17, 30, -6.6, -2.4);
  trig('butler1', 19.6, 30, -6.6, -2.4);
  /* ---------- the tour guide ---------- */
  H.says.push({ trig: 'gate', text: 'Welcome, foolish guests, to Spook Manor.' });
  H.says.push({ trig: 'hallIn', text: 'Do stay in the light. The staff are wound up tonight.' });
  H.says.push({ trig: 'teachLit', text: 'A clockwork servant, frozen in the light. Turn its key the other way...' });
  H.says.push({ trig: 'teachDone', text: 'Oh dear. More of the staff on the stairs.' });
  H.says.push({ trig: 'corIn', text: 'The armour gallery. Most of them are empty. Most.' });
  H.says.push({ trig: 'butler1', text: 'Is that... the butler? Quick! The wardrobe!' });
  /* ---------- the Butler's visits in stretch 1 ---------- */
  // 1: on the landing, walking away (not a threat: he never comes down)
  H.butler.push({ id: 'b0', trig: 'hallIn', kind: 'walkaway', y: 3, path: [[5.5, -9.3], [-7.4, -9.3]], speed: 1.1, delay: 1.2 });
  // 2: back down the corridor from its far door toward the pair: the first hide (the wardrobe pulses)
  H.butler.push({ id: 'b1', trig: 'butler1', kind: 'hunt', path: [[30.6, -4.5], [24.0, -4.6], [16.4, -4.4], [24.0, -4.6], [31.2, -4.5]], speed: 1.35, delay: 3.2,
    pause: { at: 2, secs: 2.6, what: 'picture' }, hide: 'wardrobe', done: 'butlerGone1' });

  /* ---------- wisps ---------- */
  const wisp = (x, y, z, hide) => H.wisps.push({ x, y, z, hide: hide || null });
  // along the path (plain, to learn they are friendly)
  wisp(-0.6, 0.9, 28.5); wisp(0.7, 1.1, 26.0); wisp(-0.4, 0.9, 20.0); wisp(-4.6, 1.3, 16.4); wisp(5.2, 1.2, 16.0); wisp(0.5, 1.0, 12.8);
  wisp(-9.2, 1.0, 12.4, 'stone'); wisp(9.6, 1.2, 12.0, 'stone');
  // the hall: in the vase, behind the curtains, under a dust sheet, in the coat stand, up by the mirror
  wisp(6.6, 1.35, 4.1, 'vase'); wisp(-7.4, 1.2, -6.6, 'curtain'); wisp(7.3, 1.2, -1.2, 'curtain'); wisp(-6.6, 1.5, 4.7, 'coat');
  wisp(4.6, 0.8, -6.8, 'sheet'); wisp(-0.2, 1.0, 0.6); wisp(-7.2, 1.0, 0.2, 'sheet');
  // the corridor: inside helmets, behind the tapestry, in the alcove
  wisp(11.8, 1.6, -5.9, 'helmet'); wisp(16.8, 1.6, -3.1, 'helmet'); wisp(19.6, 1.0, -4.5); wisp(26.8, 1.6, -5.9, 'helmet'); wisp(23.4, 1.1, -8.0, 'jar'); wisp(28.6, 1.0, -4.4);

  /* ======================= stretch 2: Dinner is Served (behind the manor, ground floor) =======================
     Out of the corridor's far door into a small vestibule, north up the servants' passage, into the dining room
     (x 14..40, z -30..-16): round the table's east end and west along its north side, where the chairs shuffle
     into the way whenever they are unlit and the portraits' arms reach out; the Butler comes through with his tray
     (under the table, both). Then the kitchen (x -6..14): the cleaver on its block in the north lane, the clockwork
     cook, the fridge's light, and the dumbwaiter up. */
  const R2 = { extra: { room: 'passage' } };
  box(-16, -112, 80, -14, -1, 0, { kind: 'floor' });
  wall('vesFront', 'x', -2.4, 30, 33.6, 3.6, [], R2);
  wall('vesEnd', 'z', 33.4, -16.2, -2.2, 3.6, [], R2);
  wall('pasW', 'z', 30.2, -16.2, -6.4, 3.6, [], R2);
  H.art.passage = { x0: 30.2, x1: 33.4, z0: -16, z1: -2.4, h: 3.6 };
  // the dining room
  const RD = { extra: { room: 'dining' } };
  wall('dinS', 'x', -16, 13.8, 40.2, 4.2, [[30.4, 33.2]], RD);
  wall('dinN', 'x', -30, 13.8, 40.2, 4.2, [[14.6, 16.6]], RD);
  wall('dinE', 'z', 40, -30.2, -15.8, 4.2, [[-28.4, -26.4]], RD);
  wall('dinKit', 'z', 14, -30.2, -15.8, 4.2, [[-28.5, -26.5]], { extra: { rooms: ['kitchen', 'dining'] } });
  // the servants' ways the Butler uses (curtained arches: he walks through, the pair cannot)
  box(14.6, -30.3, 16.6, -29.7, 0, 4.2, { kind: 'edge', id: 'arch' }); box(39.7, -28.4, 40.3, -26.4, 0, 4.2, { kind: 'edge', id: 'arch' });
  H.art.dining = { x0: 14, x1: 40, z0: -30, z1: -16, h: 4.2 };
  // the long table laid for twenty (light passes over it; nobody climbs it)
  box(17.5, -24.8, 36.5, -21.2, 0, 2.2, { kind: 'furn', id: 'table', seeOver: true });
  H.art.table = { x0: 17.5, x1: 36.5, z0: -24.8, z1: -21.2, y: 1.0 };
  // a sideboard by the east wall, the fireplace on the west, a serving trolley
  box(38.6, -22.6, 39.8, -18.4, 0, 1.0, { kind: 'furn', id: 'sideboard', seeOver: true });
  box(14.2, -23.2, 15.0, -20.8, 0, 1.4, { kind: 'furn', id: 'fireplace', seeOver: true });
  // the chairs: 15 of them in three barricades of five that slide across the north lane when unlit (st.chairs);
  // home is tucked in at the table's north side
  H.chairs = [];
  for (const [bx, xs] of [[33.4, [35.6, 34.4, 33.2, 32.0, 30.8]], [26.4, [29.6, 28.4, 27.2, 26.0, 24.8]], [19.4, [23.6, 22.4, 21.2, 20.0, 18.8]]]) {
    xs.forEach((hx, i) => H.chairs.push({ id: 'ch' + H.chairs.length, home: [hx, -25.35], block: [bx + (i % 2 ? 0.18 : -0.18), -25.6 - i * 0.98], face: Math.PI }));
  }
  H.hides.push({ id: 'table1', x: 22.4, z: -23.2, r: 1.1, kind: 'table', face: Math.PI, door: [22.4, -25.4], y: 0.32 });
  H.hides.push({ id: 'table2', x: 30.6, z: -23.2, r: 1.1, kind: 'table', face: Math.PI, door: [30.6, -25.4], y: 0.32 });
  H.clocks.push({ x: 35.9, z: -16.5, face: Math.PI, r: 3.4, name: 'the dining room' });
  box(35.5, -16.8, 36.3, -16.2, 0, 2.5, { kind: 'furn', id: 'clock3' });
  // the portraits along the north wall: three of them have arms (spooks that grab at a passer-by in the dark)
  for (const [x, i] of [[36.6, 0], [29.8, 1], [22.6, 2]]) H.spooks.push({ id: 'port' + i, kind: 'portrait', x, z: -28.55, face: 0, wall: [x, -29.8], wake: 'dinIn' });
  // the jack-o-springs (startles only, never a Fright): a covered dish lifts its lid
  H.springs = [{ id: 'dish', x: 27.6, z: -25.8, r: 2.0, kind: 'dish', at: [27.6, 1.05, -24.1] }];
  // the kitchen (x -6..14): an island, the range along the north wall, counters along the south
  const RK = { extra: { room: 'kitchen' } };
  wall('kitS', 'x', -16, -6.2, 14, 4.2, [], RK);
  wall('kitN', 'x', -30, -6.2, 14, 4.2, [], RK);
  wall('kitW', 'z', -6, -30.2, -15.8, 4.2, [], RK);
  H.art.kitchen = { x0: -6, x1: 14, z0: -30, z1: -16, h: 4.2 };
  H.doors.push({ id: 'kitDoor', x: 14, z: -27.5, w: 0.3, d: 2.0, lock: 'trig', trig: 'butlerGone2' });
  box(1, -25, 9, -21, 0, 1.15, { kind: 'furn', id: 'island', seeOver: true });
  box(-0.5, -30, 9.5, -28.4, 0, 1.3, { kind: 'furn', id: 'range', seeOver: true });
  box(-6, -17.4, 9.5, -16, 0, 1.1, { kind: 'furn', id: 'counter', seeOver: true });
  // the cleaver's block against the island's north side: it chops across the north lane (st.cleaver)
  box(4.4, -25.8, 5.6, -25, 0, 1.0, { kind: 'furn', id: 'block', seeOver: true });
  H.cleaver = { x: 5, z0: -28.4, z1: -25.8, w: 1.2, up: 1.7, warn: 0.45, down: 0.55 };
  // the cook (a big clockwork Sheet with a ladle), the fridge (Bo opens it: light over the west half), the dumbwaiter
  H.spooks.push({ id: 'cook', kind: 'cook', x: -2.6, z: -19.4, face: Math.PI / 2, wake: 'kitIn' });
  H.winders.push({ id: 'fridge', x: -4.4, z: -27.6, face: Math.PI / 2, kind: 'fridge', dur: 16, light: { rect: [-6, 5, -30, -16] }, at: [-4.8, 1.4, -27.6] });
  H.winders.push({ id: 'dumbCrank', x: -4.9, z: -24.6, face: Math.PI / 2, kind: 'lift', dur: 9999, light: null, ride: 'dumb' });
  H.springs.push({ id: 'pans', x: 5, z: -23, r: 3.0, kind: 'pans', at: [5, 2.6, -23] }, { id: 'oven', x: 2.4, z: -27.4, r: 2.2, kind: 'oven', at: [2.4, 0.6, -28.4] });
  H.clocks.push({ x: 12.6, z: -29.5, face: 0, r: 2.8, name: 'the kitchen' });
  box(12.2, -29.8, 13.0, -29.2, 0, 2.5, { kind: 'furn', id: 'clock4' });

  /* ======================= stretch 3: Upstairs (its own floor: the gallery, library, nursery, bedroom) =======================
     The dumbwaiter opens at the west end of the portrait gallery (x -6..16, z -48..-42). East into the library
     (x 16..34, z -60..-36), round its shelves to the nursery (x 34..48, z -60..-48), north... south into the bedroom
     (z -48..-36) and through the wardrobe to the attic stairs. */
  const RG = { extra: { room: 'gallery' } };
  wall('galN', 'x', -48, -6.2, 16, 4.0, [[3.2, 4.8], [9.2, 10.8]], RG);
  // the curtained alcoves behind the north wall (the hiding places from the Butler)
  for (const ax of [4, 10]) { box(ax - 1.0, -49.0, ax - 0.8, -47.8, 0, 4, { kind: 'wall', id: 'galN', room: 'gallery' }); box(ax + 0.8, -49.0, ax + 1.0, -47.8, 0, 4, { kind: 'wall', id: 'galN', room: 'gallery' }); box(ax - 1.0, -49.2, ax + 1.0, -48.8, 0, 4, { kind: 'wall', id: 'galN', room: 'gallery' }); }
  H.hides.push({ id: 'alc1', x: 4, z: -48.3, r: 1.0, kind: 'curtain', face: 0, door: [4, -47.4] });
  H.hides.push({ id: 'alc2', x: 10, z: -48.3, r: 1.0, kind: 'curtain', face: 0, door: [10, -47.4] });
  wall('galS', 'x', -42, -6.2, 16, 4.0, [[-2.6, 0.2]], RG);
  wall('galW', 'z', -6, -48.2, -41.8, 4.0, [], RG);
  // the stairwell up from the ground floor (where the Butler comes from): a short well the pair cannot go down
  box(-2.6, -40.0, 0.2, -39.6, 0, 4, { kind: 'edge', id: 'well' }); box(-3.0, -42, -2.6, -39.6, 0, 4, { kind: 'wall', id: 'galS', room: 'gallery' }); box(0.2, -42, 0.6, -39.6, 0, 4, { kind: 'wall', id: 'galS', room: 'gallery' });
  H.art.gallery = { x0: -6, x1: 16, z0: -48, z1: -42, h: 4.0 };
  for (const [x, i] of [[1, 0], [7, 1], [13.4, 2]]) H.spooks.push({ id: 'gport' + i, kind: 'portrait', x, z: -46.75, face: 0, wall: [x, -48], wake: 'galIn' });
  H.winders.push({ id: 'plamp1', x: 5.9, z: -47.2, face: 0, kind: 'lamp', dur: 16, light: { x: 4.4, z: -46.2, r: 3.6 }, at: [4.4, 3.2, -47.4] });
  H.winders.push({ id: 'plamp2', x: 11.9, z: -47.2, face: 0, kind: 'lamp', dur: 16, light: { x: 10.4, z: -46.2, r: 3.6 }, at: [10.4, 3.2, -47.4] });
  H.clocks.push({ x: -5.4, z: -42.7, face: Math.PI / 2, r: 2.4, name: 'the gallery' });
  box(-5.7, -43.1, -5.1, -42.3, 0, 2.5, { kind: 'furn', id: 'clock5' });
  // the library
  const RL = { extra: { room: 'library' } };
  wall('libW', 'z', 16, -60.2, -35.8, 5.0, [[-46, -44], [-56, -54]], { extra: { rooms: ['library', 'gallery'] } });
  wall('libN', 'x', -60, 15.8, 34.2, 5.0, [], RL);
  wall('libS', 'x', -36, 15.8, 48.2, 5.0, [], { extra: { rooms: ['library', 'bedroom'] } });
  wall('libE', 'z', 34, -60.2, -35.8, 5.0, [[-56, -54]], { extra: { rooms: ['library', 'nursery'] } });
  H.art.library = { x0: 16, x1: 34, z0: -60, z1: -36, h: 5.0 };
  H.doors.push({ id: 'libDoor', x: 16, z: -45, w: 0.3, d: 2.0, lock: 'trig', trig: 'butlerGone3' });
  // a free-standing double shelf across the middle (the way goes round its east end), tall shelves on the walls
  box(16.2, -50.6, 27.4, -49.4, 0, 3.4, { kind: 'furn', id: 'shelfRow' });
  box(16.2, -59.8, 33.8, -59.0, 0, 4.6, { kind: 'furn', id: 'shelfN' });
  H.spooks.push({ id: 'libArm1', kind: 'armour', x: 23.6, z: -42.2, face: Math.PI, wake: 'libIn', stepper: true });
  H.spooks.push({ id: 'libArm2', kind: 'armour', x: 30.6, z: -54.6, face: 0, wake: 'libIn', stepper: true });
  H.winders.push({ id: 'rlamp', x: 20.4, z: -40.6, face: 0, kind: 'lamp', dur: 18, light: { x: 22.6, z: -42.6, r: 3.6 }, at: [21.2, 2.0, -41.2] });
  // the organ nook behind a bookcase door in the west wall (Bo's key)
  H.doors.push({ id: 'organDoor', x: 16, z: -55, w: 0.3, d: 2.0, lock: true, book: true });
  const RO = { extra: { room: 'organ' } };
  wall('orgN', 'x', -58, 11.8, 16.2, 5.0, [], RO); wall('orgS', 'x', -52, 11.8, 16.2, 5.0, [], RO); wall('orgW', 'z', 12, -58.2, -51.8, 5.0, [], RO);
  H.art.organ = { x0: 12, x1: 16, z0: -58, z1: -52, h: 5.0 };
  box(12.2, -57.4, 13.6, -52.6, 0, 1.4, { kind: 'furn', id: 'organ', seeOver: true });
  H.springs.push({ id: 'books', x: 25, z: -47, r: 3.2, kind: 'books', at: [25, 3.6, -59] });
  H.clocks.push({ x: 16.8, z: -36.6, face: Math.PI / 2, r: 2.4, name: 'the library' });
  box(16.4, -37.0, 17.2, -36.2, 0, 2.5, { kind: 'furn', id: 'clock6' });
  // the nursery
  const RN = { extra: { room: 'nursery' } };
  wall('nurN', 'x', -60, 33.8, 48.2, 4.0, [], RN);
  wall('nurE', 'z', 48, -60.2, -47.8, 4.0, [], RN);
  wall('nurBed', 'x', -48, 33.8, 48.2, 4.0, [[43, 45]], { extra: { rooms: ['nursery', 'bedroom'] } });
  H.art.nursery = { x0: 34, x1: 48, z0: -60, z1: -48, h: 4.0 };
  H.doors.push({ id: 'nurDoor', x: 34, z: -55, w: 0.3, d: 2.0, lock: true });
  H.doors.push({ id: 'bedDoor', x: 44, z: -48, w: 2.0, d: 0.3, lock: 'trig', trig: 'butlerGone4' });
  box(36.2, -58.8, 37.8, -57.4, 0, 1.3, { kind: 'furn', id: 'horse', seeOver: true });
  box(39.6, -59.8, 44.4, -59.0, 0, 1.2, { kind: 'furn', id: 'toyshelf', seeOver: true });
  H.winders.push({ id: 'musicbox', x: 41.6, z: -58.2, face: 0, kind: 'musicbox', dur: 9, light: null, at: [41.6, 1.25, -59.3] });
  H.hides.push({ id: 'chest', x: 46.9, z: -52.4, r: 1.0, kind: 'chest', face: -Math.PI / 2, door: [46, -52.4] });
  for (const [x, z, i] of [[36.4, -50.0, 0], [46.6, -58.6, 1], [38.6, -58.4, 2], [46.4, -49.4, 3]]) H.spooks.push({ id: 'doll' + i, kind: 'doll', x, z, face: 0, wake: 'nurIn' });
  // the bedroom: the four-poster (the lump sits up), the wardrobe that is a door to the attic stairs
  const RB = { extra: { room: 'bedroom' } };
  wall('bedE', 'z', 48, -48.2, -35.8, 4.0, [[-42, -40]], RB);
  H.art.bedroom = { x0: 34, x1: 48, z0: -48, z1: -36, h: 4.0 };
  box(35.2, -44.6, 39.4, -38.6, 0, 1.0, { kind: 'furn', id: 'bed', seeOver: true });
  H.doors.push({ id: 'wardDoor', x: 48, z: -41, w: 0.3, d: 2.0, lock: true, wardrobe: true });
  H.springs.push({ id: 'lump', x: 37.3, z: -41.6, r: 3.0, kind: 'lump', at: [37.3, 1.0, -41.6] });

  /* ======================= stretch 4: the Attic and the Ballroom =======================
     Through the wardrobe, up the attic stairs (a ramp to y 3) into the attic (x 54..74, z -62..-36), where the whole
     attraction's machinery runs. Bo winds the great clock; a trapdoor opens on a spiral slide that drops the pair into
     the ballroom (x -6..30, z -104..-72, its own place): clockwork dancers waltz in the dark, and Grimsby stands in front
     of the exit. */
  const RA = { extra: { room: 'attic' } };
  wall('stN', 'x', -43, 48, 54.2, 7.0, [], { extra: { room: 'stairs' } }); wall('stS', 'x', -39, 48, 54.2, 7.0, [], { extra: { room: 'stairs' } });
  box(48.2, -43, 54, -39, 0, 3, { kind: 'stair', ramp: { h0: 0, h1: 3 } });
  H.art.stairs = { x0: 48, x1: 54, z0: -43, z1: -39, h: 7.0 };
  box(54, -62, 74, -36, 0, 3, { kind: 'landing', id: 'atticFloor' });
  wall('attN', 'x', -62, 53.8, 74.2, 7.6, [], RA); wall('attS', 'x', -36, 53.8, 74.2, 7.6, [], RA);
  wall('attE', 'z', 74, -62.2, -35.8, 7.6, [], RA); wall('attW', 'z', 54, -62.2, -35.8, 7.6, [[-43, -39]], RA);
  H.art.attic = { x0: 54, x1: 74, z0: -62, z1: -36, h: 7.6, y: 3 };
  // the dust-sheeted furniture (some of the sheets are Sheets), the machinery along the north wall
  for (const [x0, z0, x1, z1, h] of [[56, -50, 58.4, -47.6, 1.4], [60.8, -42.4, 63.4, -40.2, 1.2], [66.2, -45.8, 68.4, -43.4, 1.6], [57.4, -58.6, 59.6, -56.4, 1.3], [69.6, -40.6, 72.4, -38.2, 1.1]])
    box(x0, z0, x1, z1, 3, 3 + h, { kind: 'furn', id: 'dust', seeOver: h < 1.36 });
  box(55, -61.8, 73, -60.4, 3, 6.6, { kind: 'furn', id: 'machinery' });
  for (const [x, z, i] of [[59.2, -45.2, 0], [64.6, -55.6, 1], [70.4, -48.8, 2]]) H.spooks.push({ id: 'asheet' + i, kind: 'sheet', x, z, face: 0, wake: 'atticIn' });
  H.winders.push({ id: 'greatClock', x: 70.6, z: -58.8, face: 0, kind: 'trap', dur: 9999, light: null, ride: 'slide', at: [70.6, 5.4, -60.6] });
  H.clocks.push({ x: 55.2, z: -37.2, face: Math.PI / 2, r: 2.6, name: 'the attic' });
  box(54.8, -37.6, 55.6, -36.8, 3, 5.5, { kind: 'furn', id: 'clock7' });
  // the ballroom
  const RBa = { extra: { room: 'ballroom' } };
  wall('balS', 'x', -72, -6.2, 30.2, 7.0, [], RBa); wall('balN', 'x', -104, -6.2, 30.2, 7.0, [[10.6, 13.4]], RBa);
  wall('balW', 'z', -6, -104.2, -71.8, 7.0, [], RBa); wall('balE', 'z', 30, -104.2, -71.8, 7.0, [], RBa);
  H.art.ballroom = { x0: -6, x1: 30, z0: -104, z1: -72, h: 7.0 };
  H.doors.push({ id: 'exitDoor', x: 12, z: -104, w: 2.8, d: 0.3, lock: 'trig', trig: 'bossDone', double: true });
  // the dancers: four couples waltzing round their own spot, which drifts after the nearest hero in the dark
  for (const [cx, cz, i] of [[3.6, -83.6, 0], [13.6, -80.8, 1], [21.6, -86.4, 2], [9.6, -91.6, 3]]) for (const k of [0, 1])
    H.spooks.push({ id: 'dance' + i + k, kind: 'dancer', x: cx + (k ? 1 : -1) * 0.75, z: cz, face: 0, wake: 'ballIn', centre: [cx, cz], ph: k * Math.PI });
  H.clocks.push({ x: -4.6, z: -73.4, face: Math.PI / 2, r: 2.6, name: 'the ballroom' });
  box(-5.0, -73.8, -4.2, -73.0, 0, 2.5, { kind: 'furn', id: 'clock8' });
  H.clocks.push({ x: 28.6, z: -96.4, face: -Math.PI / 2, r: 2.6, name: 'the last waltz' });
  box(28.2, -96.8, 29.0, -96.0, 0, 2.5, { kind: 'furn', id: 'clock9' });
  // Grimsby at the end, in front of the exit (st.boss); then out into the park
  H.boss = { x: 12, z: -101.2, face: 0, wakeZ: -90.5, holds: 3, hold: 1.5 };
  box(-6, -118, 30, -117.6, 0, 3, { kind: 'edge' }); box(-6.4, -118, -6, -104, 0, 3, { kind: 'edge' }); box(30, -118, 30.4, -104, 0, 3, { kind: 'edge' });
  // the two rides between floors: the pair step in together (st.ride), a short ride plays, and they step out
  H.rides = {
    dumb: { board: { x: -5.0, z: -22.6, r: 0.95 }, to: [[-4.4, -45.6], [-4.4, -44.4]], face: Math.PI / 2, dur: 3.4, kind: 'dumbwaiter' },
    slide: { board: { x: 64, z: -52, r: 1.05 }, to: [[-2.2, -75.2], [-1.0, -74.6]], face: Math.PI * 0.8, dur: 3.2, kind: 'slide' },
  };
  H.art.trap = { x: 64, z: -52, r: 1.05, y: 3 };
  H.art.dumb = { x: -5.6, z: -22.6, y: 0.0 };

  /* ---------- stretch 2 to 4 triggers, the guide, the Butler ---------- */
  trig('pasIn', 30.2, 33.4, -16, -6.6);
  trig('dinIn', 14, 40, -30, -16);
  trig('dinMid', 18, 29, -30, -24.8);
  trig('kitIn', 8, 14, -30, -16);
  trig('kitMid', -6, 4, -30, -16);
  trig('galIn', -6, 16, -48, -42);
  trig('galMid', 3.4, 9, -48, -42);
  trig('libIn', 16.4, 34, -60, -36);
  trig('libMid', 26, 34, -52, -46);
  trig('nurIn', 34.4, 48, -60, -48);
  trig('bedIn', 34, 48, -48, -36);
  trig('stIn', 48.4, 54, -43, -39);
  trig('atticIn', 54, 74, -62, -36);
  trig('ballIn', -6, 30, -104, -77);
  trig('out', -6, 30, -118, -106);
  H.says.push({ trig: 'pasIn', text: 'Dinner is served. Do mind the staff.' });
  H.says.push({ trig: 'dinIn', text: 'The master so loved his dinner parties.' });
  H.says.push({ trig: 'dinMid', text: 'The guests never wished to leave. They never did leave.' });
  H.says.push({ trig: 'kitIn', text: 'Cook is preparing something special. Do not touch the cleaver.' });
  H.says.push({ trig: 'rideDumb', text: 'Going up! Mind the rope.' });
  H.says.push({ trig: 'galIn', text: 'The family portraits. They do so like company.' });
  H.says.push({ trig: 'libIn', text: 'The library. Please do not wake the armour.' });
  H.says.push({ trig: 'nurIn', text: 'Do not mind the children. They only want to play.' });
  H.says.push({ trig: 'musicDone', text: 'For ever.' });
  H.says.push({ trig: 'bedIn', text: 'The master bedroom. Sweet dreams.' });
  H.says.push({ trig: 'atticIn', text: 'The attic. Where we keep all our secrets.' });
  H.says.push({ trig: 'rideSlide', text: 'Wheeeee... I mean, aaargh!' });
  H.says.push({ trig: 'ballIn', text: 'And now, dear guests, the last waltz.' });
  H.says.push({ trig: 'bossTalk', text: 'I am afraid no one leaves the party.' });
  H.says.push({ trig: 'bossDone', text: 'Thank you for visiting Spook Manor. Do come again. We are always here.' });
  // 3: through the dining room with his tray while the pair are mid-room (under the table, both)
  H.butler.push({ id: 'b2', trig: 'dinMid', kind: 'hunt', path: [[40.9, -27.4], [38.4, -27.5], [15.6, -27.5], [15.6, -30.9]], speed: 1.25, delay: 3.6, hide: ['table1', 'table2'], done: 'butlerGone2', tray: true });
  // 4: up the stairs behind them into the gallery (behind the curtains)
  H.butler.push({ id: 'b3', trig: 'galMid', kind: 'hunt', path: [[-1.2, -38.4], [-1.2, -45.0], [14.6, -45.0], [-1.2, -45.0], [-1.2, -38.4]], speed: 1.35, delay: 3.6, hide: ['alc1', 'alc2'], done: 'butlerGone3',
    pause: { at: 2, secs: 2.0, what: 'picture' } });
  // 5: already standing in the nursery doorway when the music box runs down (the toy chest)
  H.butler.push({ id: 'b4', trig: 'musicDone', kind: 'hunt', path: [[32.6, -55], [35.4, -55], [44.6, -55.4], [44.6, -50.6], [36, -50.6], [33.0, -55], [30.4, -55]], speed: 1.2, delay: 3.6, hide: ['chest'], done: 'butlerGone4' });

  /* ---------- stretch 2 to 4 wisps ---------- */
  wisp(31.8, 1.0, -11.4); wisp(31.0, 1.2, -14.8, 'jar');
  // the dining room: under the dish covers, in the candelabras, behind the curtains, in the sideboard
  wisp(37.8, 1.0, -18.6); wisp(38.8, 1.2, -20.6, 'jar'); wisp(37.6, 1.0, -26.8); wisp(34.6, 1.3, -24.2, 'dish'); wisp(30.0, 1.0, -27.0);
  wisp(25.6, 1.3, -24.2, 'dish'); wisp(23.6, 1.0, -28.6, 'curtain'); wisp(19.2, 1.3, -24.2, 'dish'); wisp(16.4, 1.0, -27.2); wisp(15.0, 1.5, -22.0, 'vase'); wisp(20.6, 0.5, -23.0, 'sheet');
  // the kitchen: in the pots, the jars on the shelves, the oven, the sink, the bread bin
  wisp(12.4, 1.0, -27.2); wisp(9.8, 1.4, -29.0, 'pot'); wisp(5.8, 1.2, -27.0); wisp(1.6, 1.4, -29.0, 'pot'); wisp(-1.6, 1.0, -27.2);
  wisp(-5.2, 1.4, -19.4, 'jar'); wisp(2.6, 1.3, -16.9, 'jar'); wisp(7.8, 1.3, -16.9, 'jar'); wisp(11.2, 1.0, -19.0); wisp(-2.6, 1.0, -24.0);
  // the gallery: in the busts, behind the curtains, by the window
  wisp(-3.2, 1.0, -45.4); wisp(2.2, 1.0, -44.0); wisp(4.0, 1.2, -48.5, 'curtain'); wisp(7.0, 1.0, -45.6); wisp(10.0, 1.2, -48.5, 'curtain');
  wisp(12.8, 1.0, -43.4, 'vase'); wisp(-0.8, 1.4, -47.4, 'vase'); wisp(15.0, 1.0, -45.0);
  // the library: in the books (lots), the globe, the organ nook, up the ladder
  wisp(18.6, 1.0, -44.2); wisp(21.4, 1.4, -49.2, 'book'); wisp(25.2, 1.4, -50.8, 'book'); wisp(28.6, 1.0, -46.6); wisp(32.8, 1.6, -40.4, 'book');
  wisp(30.0, 1.0, -57.4); wisp(23.0, 1.6, -58.8, 'book'); wisp(18.4, 1.0, -57.0); wisp(13.2, 1.6, -54.8); wisp(14.4, 1.0, -56.6, 'pipe'); wisp(14.4, 1.0, -53.2);
  wisp(31.8, 1.2, -38.0, 'globe');
  // the nursery: in the toy box, the cot, the dolls' house, on the rocking horse
  wisp(36.8, 1.0, -55.0); wisp(37.0, 1.4, -58.2, 'toy'); wisp(42.0, 1.4, -59.4, 'toy'); wisp(46.6, 1.0, -56.0); wisp(40.6, 1.0, -51.4); wisp(45.4, 1.2, -59.2, 'toy');
  // the bedroom: under the bed, in the dresser, the wardrobe
  wisp(41.6, 1.0, -44.0); wisp(37.2, 0.4, -45.4, 'sheet'); wisp(44.4, 1.3, -37.0, 'jar'); wisp(46.6, 1.0, -41.0); wisp(41.2, 1.0, -38.4);
  // the attic stairs and the attic: under the sheets, in the trunks, the machinery
  wisp(51.0, 2.6, -41.0); wisp(57.0, 4.0, -40.0); wisp(57.2, 4.2, -49.2, 'sheet'); wisp(62.0, 4.0, -46.0); wisp(67.2, 4.4, -44.6, 'sheet');
  wisp(60.6, 4.6, -59.6, 'jar'); wisp(66.6, 4.0, -54.0); wisp(71.0, 4.0, -39.4, 'sheet'); wisp(72.4, 4.0, -50.6);
  // the ballroom: in the mirrors, the chandelier's fallen crystals, round the dancers
  wisp(-1.0, 1.0, -78.0); wisp(5.0, 1.2, -76.0); wisp(-4.0, 1.4, -88.0, 'mirror'); wisp(28.0, 1.4, -84.0, 'mirror'); wisp(8.6, 1.0, -86.0);
  wisp(17.4, 1.0, -84.0); wisp(14.0, 1.0, -94.0); wisp(24.6, 1.0, -92.4); wisp(2.0, 1.0, -96.6, 'mirror'); wisp(21.0, 1.4, -102.4, 'mirror');

  /* ---------- the zones (camera and place names) ---------- */
  // cam: the follow camera; cut: walls lowered to a stub while here; show: the far scenery groups drawn while here
  // (S2 behind the manor, S3 upstairs, S4a the attic, S4b the ballroom); region: the computer partner's map
  const CAM0 = { heading: 0, pitch: 50, min: 16, max: 22, fov: 34, ahead: [0, 0, -1.2] };
  const zone = (id, name, place, x0, x1, z0, z1, cam, cut, show, region) => H.zones.push({ id, name, place, x0, x1, z0, z1, cam, cut, show, region });
  zone('path', 'the path', 0, -15, 15, 6.6, 36, { heading: 0, pitch: 24, min: 12, max: 17, fov: 40, ahead: [0, 1.2, -4] }, [], [], 'ground');
  zone('hall', 'the hall', 0, -8.2, 8.2, -10.2, 6.6, CAM0, ['hallFront'], [], 'ground');
  zone('corridor', 'the hall', 0, 8.2, 30.2, -9, -2.2, { heading: -Math.PI / 2, pitch: 34, min: 12, max: 18, fov: 36, ahead: [3.2, 0, 0] }, ['hallRight'], ['S2'], 'ground');
  zone('vest', 'the hall', 0, 30.2, 33.6, -6.6, -2.2, { heading: -Math.PI / 2, pitch: 40, min: 12, max: 18, fov: 36, ahead: [1.6, 0, -1] }, ['hallRight', 'vesFront'], ['S2'], 'ground');
  zone('passage', 'the dining room', 1, 30.2, 33.6, -16, -6.6, { heading: 0, pitch: 56, min: 13, max: 18, fov: 36, ahead: [0, 0, -2.4] }, ['vesFront', 'corBack'], ['S2'], 'ground');
  zone('dining', 'the dining room', 1, 14, 40.2, -30.2, -16, CAM0, ['dinS'], ['S2'], 'ground');
  zone('kitchen', 'the dining room', 1, -6.2, 14, -30.2, -16, CAM0, ['kitS'], ['S2'], 'ground');
  zone('gallery', 'upstairs', 2, -6.2, 16, -48.2, -41.8, { heading: 0, pitch: 46, min: 13, max: 18, fov: 36, ahead: [1.6, 0, -0.8] }, ['galS'], ['S3'], 'up');
  zone('library', 'upstairs', 2, 16, 34, -60.2, -35.8, CAM0, ['libS'], ['S3'], 'up');
  zone('organ', 'upstairs', 2, 11.8, 16, -58.2, -51.8, CAM0, ['libS', 'orgS'], ['S3'], 'up');
  zone('nursery', 'upstairs', 2, 34, 48.2, -60.2, -48, CAM0, ['nurBed'], ['S3'], 'up');
  zone('bedroom', 'upstairs', 2, 34, 48.2, -48, -35.8, CAM0, ['libS'], ['S3', 'S4a'], 'up');
  zone('stairs', 'upstairs', 2, 48, 54, -43.2, -38.8, { heading: -Math.PI / 2, pitch: 40, min: 12, max: 17, fov: 36, ahead: [1.6, 1.0, 0] }, ['stS', 'libS'], ['S3', 'S4a'], 'up');
  zone('attic', 'upstairs', 2, 54, 74.2, -62.2, -35.8, { heading: 0, pitch: 50, min: 16, max: 22, fov: 34, ahead: [0, 0, -1.2] }, ['attS'], ['S4a'], 'up');
  zone('ballroom', 'the ballroom', 3, -6.2, 30.2, -104.2, -71.8, { heading: 0, pitch: 46, min: 18, max: 24, fov: 36, ahead: [0, 0, -1.6] }, ['balS'], ['S4b'], 'ball');
  zone('exit', 'the ballroom', 3, -6.2, 30.2, -118, -104.2, { heading: 0, pitch: 34, min: 14, max: 20, fov: 38, ahead: [0, 0.6, -2] }, ['balS', 'balN'], ['S4b'], 'ball');
  H.places = ['the hall', 'the dining room', 'upstairs', 'the ballroom'];
  H.stretchEnd = 4;
  H.bounds = { x0: -16, x1: 80, z0: -120, z1: 37 };
  // the computer partner's maps (one per floor: the rides join them)
  H.regions = { ground: { x0: -16, x1: 42, z0: -32, z1: 37 }, up: { x0: -8, x1: 76, z0: -64, z1: -34 }, ball: { x0: -8, x1: 32, z0: -120, z1: -70 } };
  H.zoneAt = (x, z) => { for (const zn of H.zones) if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1) return zn; return null; };
  H.trigAt = (id) => H.triggers.find(t => t.id === id);
  return H;
})();
