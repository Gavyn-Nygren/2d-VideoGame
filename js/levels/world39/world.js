/* Pip & Bo - World 39 Crystal Caverns: the world entry. */
'use strict';

/* World 39 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 to 38, so it
   never conflicts with other worlds being built at the same time. World index 38, set by index (World 38 Operation
   Midnight, index 37, was being built in parallel; liveWorlds skips an empty slot until it lands). Its script tags sit
   together in one block after js/cpu/levels/world34/longship-race.js in index.html (a spot no other world uses).
   Level codes come from the world number, so where its levels land in LEVELS doesn't matter. Each level's def lives at
   the bottom of its own level file as CAVE.defs.<mode>; this file only sets the order.
   Crystal Caverns: the lamps of Glimmer Gulch have gone out and the deep mine is rumbling. Old Mabel, the last miner,
   sends Pip and Bo down. Gavyn picked the theme and these four levels on 2026-11-14. */
WORLDS[38] = { name: 'Crystal Caverns', blurb: 'Ride a creaky mine lift into the deep, climb a sleeping golem, run from a cave worm and dig for gems!',
  theme: { skyTop: '#10222c', skyBot: '#2c5a62', hillFar: '#2a4652', hillNear: '#1c3440', sun: 'rgba(120,240,220,0.85)', sunGlow: 'rgba(80,230,210,0.3)',
    stone: '#5a6472', stoneLight: '#7d8896', stoneEdge: '#363d48', grass: '#4fe8d6', grassDark: '#1f8a7e', plank: '#8a5e36', plankDark: '#553818', rope: '#e8d8b0', ropeDark: '#9a8460' } };

// 39-1 Mine Lift Plunge, 39-2 Sleeping Golem, 39-3 Cave Worm Chase, 39-4 Gem Rush (versus)
LEVELS.push(...['cavelift', 'cavegolem', 'caveworm', 'gemrush'].map(k => CAVE.defs[k]).filter(Boolean));
