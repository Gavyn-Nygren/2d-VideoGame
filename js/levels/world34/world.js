/* Pip & Bo - World 34 Viking Voyage: the world entry. */
'use strict';

/* World 34 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 to 33, so it
   never conflicts with other worlds being built at the same time. World index 33. Its script tags sit after
   js/cpu/cpu-nav.js in index.html (a different spot from World 33's), so this file runs after every earlier world's
   world.js and its levels land in LEVELS after World 33 (level codes come from the world number). Each level's def
   lives at the bottom of its own level file as VIKING.defs.<mode>; this file only sets the order.
   Viking Voyage: Pip and Bo sail north in a longship: a sea serpent, an ice fortress, a roaring mead hall and a race
   home. Gavyn picked the theme and these four levels from ten ideas (Nov 2026); he skipped Longship Storm Row, Burning
   Village Dash, Frost Giant's Footsteps, Rainbow Bridge Run, Shield Wall and Axe Throw Duel. */
// a grey northern sea and sky, timber, a red-and-cream striped sail
WORLDS[33] = { name: 'Viking Voyage', blurb: 'Sail north! Outrun a sea serpent, raid an ice fortress, feed a starving mead hall and race your longships home!',
  theme: { skyTop: '#5a6e80', skyBot: '#c8d6de', hillFar: '#5a6a7a', hillNear: '#3e4a58', sun: 'rgba(255,244,220,0.9)', sunGlow: 'rgba(255,240,210,0.3)',
    stone: '#6e737a', stoneLight: '#a0a6ae', stoneEdge: '#464a52', grass: '#c8323a', grassDark: '#8a1a22', plank: '#8a5a32', plankDark: '#5a3418', rope: '#e8d8b0', ropeDark: '#a08a5a' } };

// 34-1 Sea Serpent Chase, 34-2 Ice Fortress Raid, 34-3 Mead Hall Feast Brawl, 34-4 Longship Race (Gavyn's order)
LEVELS.push(...['serpentchase', 'icefort', 'meadhall', 'longshiprace'].map(k => VIKING.defs[k]).filter(Boolean));
