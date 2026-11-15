/* Pip & Bo - World 38 Operation Midnight: the world entry. */
'use strict';

/* World 38 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 to 37, so it
   never conflicts with other worlds being built at the same time (World 39 was built in parallel). World index 37, set
   by index. Its script tags sit together in one block after World 37's in index.html. Level codes come from the world
   number, so where its levels land in LEVELS doesn't matter. Each level's def lives at the bottom of its own level file
   as SPY.defs.<mode>; this file only sets the order.
   Operation Midnight (Secret Agent): one heist told in four acts, in Gavyn's order on purpose (2026-11-14): break in up
   the glass tower, cross the laser vault, slip out through the vents, get away by speedboat. All four are team levels.
   He skipped Ticking Bomb Train, Spy Car Chase, Parachute Drop, Collapsing Lair Escape, Gadget Duel and Spy vs Spy
   Briefcase. */
// a glittering city at midnight: deep teal night, warm window light, red lasers, brass
WORLDS[37] = { name: 'Operation Midnight', blurb: 'Secret agents at midnight! Climb Count Zero\'s glass tower, cross his laser vault, slip out through the dark air vents and race his fleet across the harbour.',
  outfit: 'spyclimb',
  theme: { skyTop: '#061820', skyBot: '#174a58', hillFar: '#0f3440', hillNear: '#0a2a34', sun: 'rgba(246,240,214,0.95)', sunGlow: 'rgba(246,240,214,0.25)',
    stone: '#4e5960', stoneLight: '#8c98a0', stoneEdge: '#2a3236', grass: '#d8a640', grassDark: '#8a6420', plank: '#3a3f46', plankDark: '#1c1e22', rope: '#e8d8a8', ropeDark: '#a89870' } };

// 38-1 Skyscraper Window Climb, 38-2 Laser Vault Heist, 38-3 Air Vent Crawl, 38-4 Speedboat Getaway (Gavyn's order)
LEVELS.push(...['spyclimb', 'spyvault', 'spyvents', 'spyboat'].map(k => SPY.defs[k]).filter(Boolean));
