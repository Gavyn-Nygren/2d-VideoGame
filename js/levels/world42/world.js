/* Pip & Bo - World 42 Midnight Theme Park: the world entry (3D, like World 41). */
'use strict';

/* World 42 is added from here (not in level-list.js), so it never conflicts with other worlds. World index 41.
   Gavyn (2026-11-18): the rest of the levels are 3D; this world's theme is a Midnight Theme Park. Starlight Park by the
   sea, after closing: every bulb still on, the rides still turning, nobody else there. This file sets the world and
   pushes 42-1; later World 42 levels push themselves from their own files, in their own script blocks after this one.
   Its 3D files share the park kit (js/levels/world42/park-kit.js, PARK), loaded on demand with the 3D kit. */
WORLDS[41] = { name: 'Midnight Theme Park', blurb: 'Starlight Park after closing time. Every light is on, the rides are still running, and nobody is minding them!',
  theme: { skyTop: '#0b0b26', skyBot: '#2a1f4e', hillFar: '#2c2552', hillNear: '#1c1838', sun: 'rgba(255,244,214,0.95)', sunGlow: 'rgba(255,230,170,0.25)',
    stone: '#6a6488', stoneLight: '#9a92b8', stoneEdge: '#3a3458', grass: '#3f7a5a', grassDark: '#24503a', plank: '#b8743a', plankDark: '#7a4a22', rope: '#ffd36b', ropeDark: '#b88a2a' } };
// 42-1 Runaway Coaster
LEVELS.push(PARKCOASTER.def);
