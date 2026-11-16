/* Pip & Bo - World 26 Circus Big Top: the world entry and its four level defs. */
'use strict';

/* World 26 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 and 25, so it
   never conflicts with other worlds being built at the same time. World index 25. This file loads after the four
   World 26 level files (and after World 25), so its levels land in LEVELS after 25-1.
   Circus Big Top: a red-and-white striped big top with spotlights, a sawdust ring, a safety net and a cheering crowd,
   and outside it the midway and fairground. Nothing scary, nobody gets hurt (misses are "Boing!"s into the net,
   "Honk!"s and "Whoa!"s). Gavyn picked the theme and these four levels from ten ideas (Nov 2026); he skipped Tightrope
   Shoulder Ride, Trampoline Tower, Unicycle Juggle Parade, Lion Tamer Hoops, Juggling Pass and Balloon Animal Battle.
   Each level's def sits between its own BEGIN/END lines. */
// under the big top: deep plum night inside the tent, striped red canvas, warm spotlight gold
WORLDS[25] = { name: 'Circus Big Top', blurb: 'Fly on the trapeze, drive the clown car, ride the cannon and race on wobbly stilts!',
  theme: { skyTop: '#3a1c48', skyBot: '#ffd9a8', hillFar: '#e8443a', hillNear: '#c9302c', sun: 'rgba(255, 240, 190, 0.95)', sunGlow: 'rgba(255, 220, 150, 0.4)',
    stone: '#b5462e', stoneLight: '#d0603e', stoneEdge: '#7a2a1c', grass: '#ffd36b', grassDark: '#c99a2e', plank: '#e8443a', plankDark: '#9a2a22', rope: '#f6e2b0', ropeDark: '#a8864a' } };

const W26_STUB_MAP = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)];
LEVELS.push(
  // ----- BEGIN 26-1 Trapeze Catch (mode 'trapeze', js/levels/world26/trapeze-catch.js) -----
  // 26-1 Trapeze Catch (mode 'trapeze', team, Gavyn's pick): one screen under the big top. The catcher hangs by the
  // knees, pumps the swing (◀ ▶) and calls "Hep!" (the action) on the gold ring; the flyer jumps off the board, lets go
  // of the bar at the top of the swing (the action), flips with ▲ held, opens up and steers ◀ ▶ into the catcher's
  // reaching hands (hold the action). A miss is a "Boing!" into the net. 4 catches an act, swap jobs every act.
  { name: 'Trapeze Catch', world: 25, kind: 'team', mode: 'trapeze', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Act',
    jobs: {
      flyer: { title: 'Flyer', act: 'let go', legend: '<kbd>W</kbd> hold to flip <kbd>A</kbd><kbd>D</kbd> steer a little',
        howTo: ['Let go on the gold. Let go of flip to open up for the catch.'] },
      catcher: { title: 'Catcher', act: 'hep', legend: '<kbd>A</kbd><kbd>D</kbd> pump the swing',
        howTo: ['Call Hep! on the gold ring. Hold it to catch.'] },
    },
    jobOf: 'fly', jobSwap: 'You swap jobs every act.',
    tip: 'The catcher swings and calls Hep!, the flyer lets go and flips. Open up for the catch!',
    act: { label: 'hep', labels: ['let go', 'hep'] },
    map: W26_STUB_MAP,
    rooms: [
      { title: 'Warm-Up', fly: 0, look: 'warm', act: { label: 'hep', labels: ['let go', 'hep'] },
        tip: 'Bo swings and calls Hep! on the gold ring. Pip lets go when the bar glows gold. Bo: hold the action to reach!' },
      { title: 'Spotlight Hoop', fly: 1, look: 'spot', hoops: [[460, 100]], act: { label: 'hep', labels: ['hep', 'let go'] },
        tip: 'Swap! Pip catches, Bo flies. Fly through the gold hoop and flip for big cheers!' },
      { title: 'Double Hoop', fly: 0, look: 'hoop', hoops: [[444, 101], [520, 143]], act: { label: 'hep', labels: ['let go', 'hep'] },
        tip: 'Pip flies again! Two hoops in a row. Hold ▲ to flip, let go of it before the catch!' },
      { title: 'Grand Finale', fly: 1, look: 'finale', hoops: [[452, 98], [530, 152]], act: { label: 'hep', labels: ['hep', 'let go'] },
        tip: 'The grand finale! Bo flies, Pip catches. Go for a double flip!' },
    ],
  },
  // ----- END 26-1 Trapeze Catch -----
  //
  //
  //
  // ----- BEGIN 26-2 Clown Car Getaway (mode 'clowncar', js/levels/world26/clown-car-getaway.js) -----
  // 26-2 Clown Car Getaway (mode 'clowncar', team, scrolls right, Gavyn's pick): one tiny clown car through the
  // fairground. The driver: ▶ gas, ◀ brake, ▲ (or the action) hops over pies and banana peels. The popper (out of the
  // roof): ◀ ▶ lean, ▼ ducks under banners, the action honks animals off the road. Catch the clowns who leap for the car.
  // Each stretch ends at a pit-stop tent, then they swap seats. The map is only the two spawns (tokens: see the level file).
  { name: 'Clown Car Getaway', world: 25, kind: 'team', mode: 'clowncar', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    jobs: {
      driver: { title: 'Driver', act: 'hop', legend: '<kbd>D</kbd> gas <kbd>A</kbd> brake <kbd>W</kbd> hop the pies' },
      popper: { title: 'Popper', act: 'honk', legend: '<kbd>A</kbd><kbd>D</kbd> lean <kbd>S</kbd> hold to duck',
        howTo: ['Honk the animals away. Lean under a leaping clown to catch it.'] },
    },
    jobOf: 'drive', jobSwap: 'You swap jobs every stretch.',
    tip: 'The driver hops the pies, the popper honks the animals away, ducks the banners and catches the clowns!',
    act: { label: 'honk', labels: ['hop', 'honk'] },
    map: W26_STUB_MAP,
    rooms: [
      { title: 'The Midway', drive: 0, look: 'midway', pace: 170, act: { label: 'honk', labels: ['hop', 'honk'] },
        tip: 'Pip drives (▶ gas, ▲ hop the pies). Bo pops out of the roof: honk at the ducks, catch the clowns!',
        course: ['f220', 'S:{D}: ▶ to drive!', 'f360', 'C:2', 'f500', 'S:{R}: honk at the ducks!', 'f250', 'A:duck', 'f470', 'C:3', 'f430',
          'S:Hop over the pies!', 'f220', 'P', 'f500', 'C:2', 'f470', 'A:poodle', 'f400', 'P', 'f360', 'C:3', 'f470', 'N', 'f430', 'C:2', 'f360', 'E'] },
      { title: 'Carousel Corner', drive: 1, look: 'carousel', pace: 180, act: { label: 'honk', labels: ['honk', 'hop'] },
        tip: 'Swap! Bo drives, Pip pops out. Duck under the circus banners!',
        course: ['f360', 'S:Swap! {D} drives, {R} pops out', 'f290', 'C:2', 'f430', 'B', 'f360', 'C:3', 'f430', 'A:poodle', 'f360', 'P', 'f430',
          'C:2', 'f360', 'B', 'f320', 'A:duck', 'f400', 'C:3', 'f360', 'N', 'f430', 'C:2', 'f360', 'B', 'f430', 'E'] },
      { title: 'Funhouse Lane', drive: 0, look: 'funhouse', pace: 185, act: { label: 'honk', labels: ['hop', 'honk'] },
        tip: 'Pip drives again! A seal with a ball, banana peels and lots of clowns.',
        course: ['f360', 'C:3', 'f430', 'A:seal', 'f360', 'N', 'f360', 'C:2', 'f400', 'B', 'f360', 'C:3', 'f360', 'P', 'f250', 'N', 'f430',
          'A:duck', 'f360', 'C:2', 'f400', 'B', 'f320', 'C:3', 'f430', 'A:poodle', 'f360', 'P', 'f430', 'E'] },
      { title: 'The Big Top', drive: 1, look: 'bigtop', pace: 190, act: { label: 'honk', labels: ['honk', 'hop'] },
        tip: 'Bo drives to the big top! The elephant needs two honks.',
        course: ['f360', 'C:2', 'f430', 'A:elephant', 'f430', 'S:Two honks for the elephant!', 'f50', 'P', 'f360', 'C:3', 'f400', 'B', 'f360',
          'A:seal', 'f360', 'C:3', 'f400', 'N', 'f290', 'P', 'f430', 'C:2', 'f360', 'B', 'f360', 'A:poodle', 'f360', 'C:3', 'f430', 'E'] },
    ],
  },
  // ----- END 26-2 Clown Car Getaway -----
  //
  //
  //
  // ----- BEGIN 26-3 Human Cannonball Tour (mode 'cannonball', js/levels/world26/human-cannonball-tour.js) -----
  // 26-3 Human Cannonball Tour (mode 'cannonball', team, scrolls right, Gavyn's pick): the cannonball aims (▲ ▼) and
  // fires (the action), then flaps the cape (▲, 2 a shot) and drifts (◀ ▶) through gold rings and balloons. The driver
  // parks the safety-net truck (◀ ▶) under the landing ring, catches them, and drives them to the next cannon. 4 cannons
  // a tour, then swap jobs. Cannon defs: [angle in degrees, items] (items: see the level file).
  { name: 'Human Cannonball Tour', world: 25, kind: 'team', mode: 'cannonball', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Tour',
    jobs: {
      cannonball: { title: 'Cannonball', act: 'fire', legend: '<kbd>W</kbd><kbd>S</kbd> aim, then flap, dive <kbd>A</kbd><kbd>D</kbd> drift in the air',
        howTo: ['Fire when the net is ready. Fly through the rings!'] },
      driver: { title: 'Net driver', act: 'beep', legend: '<kbd>A</kbd><kbd>D</kbd> drive the net truck',
        howTo: ['Park the net under the landing ring.'] },
    },
    jobOf: 'fly', jobSwap: 'You swap jobs every show.',
    tip: 'The driver parks the net under the landing ring. The cannonball aims, fires and flaps through the rings!',
    act: { label: 'fire', labels: ['fire', 'beep'] },
    map: W26_STUB_MAP,
    rooms: [
      { title: 'Sawdust Alley', fly: 0, look: 'alley', act: { label: 'fire', labels: ['fire', 'beep'] },
        tip: 'Pip is the cannonball, Bo drives the net truck. Park under the gold ring, then BOOM!',
        cannons: [[45, ['r0.5']], [50, ['r0.35', 'r0.62']], [42, ['r0.3', 'r0.55', 'r0.75']], [52, ['r0.4', 'r0.7']]] },
      { title: 'Balloon Garden', fly: 1, look: 'balloon', act: { label: 'fire', labels: ['beep', 'fire'] },
        tip: 'Swap! Bo flies, Pip drives. Flap the cape ▲ to pop the balloons up high!',
        cannons: [[48, ['r0.4', 'b0.6-50']], [55, ['b0.3-40', 'r0.5', 'b0.75-45']], [40, ['r0.35', 'b0.55-55', 'r0.8']], [50, ['b0.45-50', 'r0.7']]] },
      { title: 'The High Rings', fly: 0, look: 'high', act: { label: 'fire', labels: ['fire', 'beep'] },
        tip: 'Pip flies again! Aim high for the high rings.',
        cannons: [[62, ['r0.3', 'r0.5', 'r0.7']], [36, ['r0.4', 'b0.6-50']], [58, ['r0.45', 'b0.25-40', 'r0.8']], [66, ['r0.35', 'r0.65']]] },
      { title: 'The Grand Tour', fly: 1, look: 'grand', act: { label: 'fire', labels: ['beep', 'fire'] },
        tip: 'The grand tour to the big top! Bo flies, Pip drives.',
        cannons: [[50, ['r0.3', 'b0.5-50', 'r0.72']], [44, ['r0.4', 'r0.62', 'b0.82-40']], [56, ['b0.35-45', 'r0.55', 'r0.75']], [48, ['r0.3', 'r0.5', 'r0.7', 'b0.85-35']]] },
    ],
  },
  // ----- END 26-3 Human Cannonball Tour -----
  //
  //
  //
  // ----- BEGIN 26-4 Stilt Race (mode 'stiltrace', js/levels/world26/stilt-race.js) -----
  // 26-4 Stilt Race (mode 'stiltrace', versus, best of 5, scrolls right, Gavyn's pick): race on wobbly stilts down the
  // midway. ◀ ▶ steer your lean (lean forward to go faster, too far and you topple), ▲ hops boxes and ducks, ▼ ducks the
  // bunting, the action windmills your arms to steady. First under the finish banner wins the round.
  { name: 'Stilt Race', world: 25, kind: 'versus', mode: 'stiltrace', ownStep: true,
    match: { bestOf: 5, roundTime: 60 },
    act: { label: 'steady' },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> lean <kbd>W</kbd> hop <kbd>S</kbd> duck',
      bo: '<kbd>←</kbd><kbd>→</kbd> lean <kbd>↑</kbd> hop <kbd>↓</kbd> duck',
      pad: 'stick leans, <span data-glyph="a"></span> hops, down ducks,',
    },
    tip: 'Lean ▶ to stride faster, but not too far or you topple! ▲ hop the popcorn, ▼ duck the bunting, the action steadies.',
    switches: {}, signs: [],
    map: W26_STUB_MAP,
  },
  // ----- END 26-4 Stilt Race -----
);
