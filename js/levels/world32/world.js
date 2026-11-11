/* Pip & Bo - World 32 Superhero City: the world entry. */
'use strict';

/* World 32 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 to 31, so it
   never conflicts with other worlds being built at the same time. World index 31. This file loads after the World 31
   files and the four World 32 level files, so its levels land in LEVELS after World 31 (level codes come from the world
   number). Each level's def lives at the bottom of its own level file as HEROCITY.defs.<mode>; this file only sets the
   order.
   Superhero City: Pip and Bo are superheroes for a day. In every level each hero has a different power and the two
   powers only work together; the powers swap between stretches so both players try both.
   Gavyn picked the theme and these four levels from ten ideas (Nov 2026); he skipped Skyscraper Rescue, Giant Robot
   Attack, Meteor Shower, Villain's Freeze Ray, Hero Training Course and Race Across the City. */
// a city at night: deep blue sky, a big moon, dark towers with lit windows
WORLDS[31] = { name: 'Superhero City', blurb: 'Powers on! Stop a runaway train, hold a falling bridge together, chase a jewel thief over the rooftops and brawl for the city!',
  theme: { skyTop: '#0e1438', skyBot: '#3a3a7a', hillFar: '#232a5a', hillNear: '#151a40', sun: 'rgba(251, 246, 220, 0.98)', sunGlow: 'rgba(255, 250, 220, 0.35)',
    stone: '#4e5266', stoneLight: '#7a7f92', stoneEdge: '#2c2f40', grass: '#d8283a', grassDark: '#8e1422', plank: '#6d7686', plankDark: '#3c4250', rope: '#e8e8f0', ropeDark: '#8a8aa0' } };

// 32-1 Runaway Subway, 32-2 Bridge Collapse, 32-3 Rooftop Chase, 32-4 Power Punch Showdown (Gavyn's order)
LEVELS.push(...['subway', 'bridge', 'roofchase', 'punchout'].map(k => HEROCITY.defs[k]).filter(Boolean));
