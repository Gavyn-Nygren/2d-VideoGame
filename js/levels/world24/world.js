/* Pip & Bo - World 24 Toy Box Town: the world entry and its four level defs. */
'use strict';

/* World 24 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like World 25, so it never
   conflicts with World 23 Barnyard Fair, which is built at the same time. World index 23. This file loads after the
   four World 24 level files and before World 25's, so the levels land in LEVELS before 25-1.
   Toy Box Town: Pip and Bo are toy-sized in a kid's bedroom (a cosy carpeted floor, a bed, a tall bookshelf, a toy box,
   a night light). Nothing scary, nobody gets hurt. Gavyn picked the theme and these four levels from ten ideas
   (Nov 2026); he skipped RC Car Chase, Teddy Zipline, Lights Out Tidy-Up, Marble Run Maker, Toy Soldier March and
   Slot Car Grand Prix.
   Each level's def sits between its own BEGIN/END lines. */
// a kid's bedroom by day: soft blue wallpaper fading to a warm lamp glow; a cosy carpet floor, wooden shelves, toy-block colours
WORLDS[23] = { name: 'Toy Box Town', blurb: 'Ride a wind-up train, pop out of a jack-in-the-box, flop down the slinky stairs and win the pillow fort battle!',
  theme: { skyTop: '#9fc4f0', skyBot: '#fff0d8', hillFar: '#e8c6e0', hillNear: '#d6a9cf', sun: 'rgba(255, 240, 200, 0.95)', sunGlow: 'rgba(255, 220, 160, 0.4)',
    stone: '#c98a52', stoneLight: '#dca06a', stoneEdge: '#8e5a2e', grass: '#7cc4e8', grassDark: '#4f93c0', plank: '#e8574a', plankDark: '#a33328', rope: '#f6d65a', ropeDark: '#a8862a' } };

const W24_STUB_MAP = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '#'.repeat(32), '#'.repeat(32)];
LEVELS.push(
  // ----- BEGIN 24-1 Wind-Up Train Ride (mode 'windtrain', js/levels/world24/wind-up-train-ride.js) -----
  { name: 'Wind-Up Train Ride', world: 23, kind: 'team', mode: 'windtrain',
    tip: 'Coming soon!',
    map: W24_STUB_MAP,
  },
  // ----- END 24-1 Wind-Up Train Ride -----
  //
  //
  //
  // ----- BEGIN 24-2 Jack-in-the-Box Launch (mode 'jackbox', js/levels/world24/jack-in-the-box-launch.js) -----
  { name: 'Jack-in-the-Box Launch', world: 23, kind: 'team', mode: 'jackbox',
    tip: 'Coming soon!',
    map: W24_STUB_MAP,
  },
  // ----- END 24-2 Jack-in-the-Box Launch -----
  //
  //
  //
  // ----- BEGIN 24-3 Slinky Stairs (mode 'slinky', js/levels/world24/slinky-stairs.js) -----
  { name: 'Slinky Stairs', world: 23, kind: 'team', mode: 'slinky',
    tip: 'Coming soon!',
    map: W24_STUB_MAP,
  },
  // ----- END 24-3 Slinky Stairs -----
  //
  //
  //
  // ----- BEGIN 24-4 Pillow Fort Battle (mode 'pillowfort', js/levels/world24/pillow-fort-battle.js) -----
  { name: 'Pillow Fort Battle', world: 23, kind: 'versus', mode: 'pillowfort', match: { bestOf: 5, roundTime: 75 },
    tip: 'Coming soon!',
    map: W24_STUB_MAP,
  },
  // ----- END 24-4 Pillow Fort Battle -----
);
