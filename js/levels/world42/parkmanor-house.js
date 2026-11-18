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
    [-7.4, 13.2, -0.2, 'Paul Tergeist'], [-10.6, 15.6, 0.15, 'Phil T. Sheets'], [-9.6, 11.2, -0.1, 'Here lies a pun'],
    [3.6, 18.6, -0.2, 'Doug Graves'], [6.0, 19.6, 0.25, 'Ann Tique'], [8.8, 17.4, -0.1, 'Rusty Hinges'], [4.6, 14.2, 0.1, 'Will Haunt'],
    [7.6, 12.6, -0.25, 'Dee Ceased'], [10.6, 14.4, 0.2, 'Count Backwards'], [10.2, 10.6, 0.05, 'Gone Fishin\''],
  ];
  for (const [x, z, r] of H.art.stones) box(x - 0.55, z - 0.14, x + 0.55, z + 0.14, 0, 1.0, { kind: 'stone', rot: r });
  H.art.trees = [[-6.4, 25.5, 1.2], [7.2, 26.5, 1.35], [-11.6, 19.2, 1.0], [11.8, 19.4, 1.1], [-2.8, 11.6, 0.8], [12.2, 9.6, 0.9]];
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

  /* ---------- the zones (camera and place names) ---------- */
  H.zones.push({ id: 'path', name: 'the path', place: 0, x0: -15, x1: 15, z0: 6.6, z1: 36, cam: { heading: 0, pitch: 24, min: 12, max: 17, fov: 40, ahead: [0, 1.2, -4] }, cut: [] });
  H.zones.push({ id: 'hall', name: 'the hall', place: 0, x0: -8.2, x1: 8.2, z0: -10.2, z1: 6.6, cam: { heading: 0, pitch: 50, min: 16, max: 22, fov: 34, ahead: [0, 0, -1.2] }, cut: ['hallFront'] });
  H.zones.push({ id: 'corridor', name: 'the hall', place: 0, x0: 8.2, x1: 30.2, z0: -9, z1: -2.2, cam: { heading: -Math.PI / 2, pitch: 34, min: 12, max: 18, fov: 36, ahead: [3.2, 0, 0] }, cut: ['hallRight'] });
  H.places = ['the hall', 'the dining room', 'upstairs', 'the ballroom'];
  H.stretchEnd = 1; // (the look gate: stretch 1 is built; the far door of the corridor leads on)
  H.bounds = { x0: -15, x1: 34, z0: -12, z1: 36 };

  H.zoneAt = (x, z) => { for (const zn of H.zones) if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1) return zn; return null; };
  H.trigAt = (id) => H.triggers.find(t => t.id === id);
  return H;
})();
