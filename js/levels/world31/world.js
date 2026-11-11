/* Pip & Bo - World 31 Shrunk in the Backyard: the world entry. */
'use strict';

/* World 31 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 to 29, so it
   never conflicts with other worlds being built at the same time. World index 30. This file loads after the World 30
   boss and the four World 31 level files, so its levels land in LEVELS after the boss (level codes come from the world
   number). Each level's def lives at the bottom of its own level file as SHRUNK.defs.<mode>; this file only sets the order.
   Shrunk in the Backyard: Pip and Bo are the size of beetles. Grass blades are trees, pebbles are boulders, ants are
   as big as ponies and a robin is a monster. World 6 Backyard Bash is the same kind of place at normal size; here
   everything is seen from down among the grass roots, and the big things are scary.
   Gavyn picked the theme and these four levels from ten ideas (Nov 2026); he skipped Sprinkler Surf, Spider Web Rescue,
   Bumblebee Ride, Garden Hose Rapids, Bottle Cap Boat and Beetle Wrestling. */
// a bright summer day seen from the grass roots: blue sky, tall green blades, warm soil
WORLDS[30] = { name: 'Shrunk in the Backyard', blurb: 'Bug-sized! Outrun the lawnmower, sneak a crumb past the ants, hide from a hungry robin and race snails!',
  theme: { skyTop: '#6ec0f0', skyBot: '#e8f6dc', hillFar: '#7cbf62', hillNear: '#4f9e40', sun: 'rgba(255, 246, 200, 0.98)', sunGlow: 'rgba(255, 240, 170, 0.4)',
    stone: '#6b4a32', stoneLight: '#8a6446', stoneEdge: '#4a3122', grass: '#5fb84a', grassDark: '#3c8a36', plank: '#8a6040', plankDark: '#5a3c26', rope: '#e8d8b0', ropeDark: '#9a8458' } };

// 31-1 Lawnmower Escape, 31-2 Ant Hill Heist, 31-3 Bird Attack Dash, 31-4 Snail Race (Gavyn's order)
LEVELS.push(...['mowrun', 'antheist', 'birddash', 'snailrace'].map(k => SHRUNK.defs[k]).filter(Boolean));
