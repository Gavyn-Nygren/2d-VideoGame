/* Pip & Bo - World 29 Ninja Dojo: the world entry. */
'use strict';

/* World 29 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 to 28, so it
   never conflicts with other worlds being built at the same time. World index 28. This file loads after the four
   World 29 level files, so its levels land in LEVELS after the earlier worlds' (level codes come from the world number).
   Unlike Worlds 24 to 28, each level's def lives at the bottom of its own level file as NINJA.defs.<mode>; this file
   only sets the order.
   Ninja Dojo: a moonlit old town of tiled rooftops, paper lanterns, a guarded fortress, a downhill market street and a
   training dojo. Cartoon ninjas: foam-soft throwing stars that go "bonk", guards who get dizzy, nobody gets hurt.
   Gavyn picked the theme and these four levels from ten ideas (Nov 2026); he skipped Bamboo Forest Dash, Castle Wall
   Climb, Kite Glider Escape, Dojo Trap Hall, Smoke Bomb Heist and Rooftop Race. */
// a moonlit night: deep indigo sky, a pale moon, dark tiled roofs with warm lantern light
WORLDS[28] = { name: 'Ninja Dojo', blurb: 'Swing over moonlit rooftops, sneak past the guards, ride a runaway rickshaw and duel with throwing stars!',
  theme: { skyTop: '#141a3c', skyBot: '#5a4a86', hillFar: '#2c2a58', hillNear: '#221f46', sun: 'rgba(250, 244, 214, 0.98)', sunGlow: 'rgba(200, 210, 255, 0.35)',
    stone: '#4a4668', stoneLight: '#6a6590', stoneEdge: '#2a2742', grass: '#c8474a', grassDark: '#8a2c34', plank: '#8a5a3a', plankDark: '#5a3824', rope: '#e8d8b0', ropeDark: '#9a8458' } };

// 29-1 Rooftop Moonlight Run, 29-2 Shadow Sneak, 29-3 Runaway Rickshaw, 29-4 Throwing Star Duel (Gavyn's order)
LEVELS.push(...['roofrun', 'shadowsneak', 'rickshaw', 'starduel'].map(k => NINJA.defs[k]).filter(Boolean));
